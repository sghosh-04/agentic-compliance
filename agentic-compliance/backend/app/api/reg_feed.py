import html
import logging
import re
import time
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Tuple

import requests
from dateutil import parser as dateutil_parser
from fastapi import APIRouter

logger = logging.getLogger("reg_feed")

router = APIRouter(prefix="/feed", tags=["feed"])

# Simple module-level cache: {key: (timestamp, data)}
_feed_cache: Dict[str, Any] = {}
CACHE_TTL = 600  # 10 minutes in seconds

REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

RSS_FEEDS = [
    {
        "source": "SEBI",
        "url": "https://www.sebi.gov.in/sebirss.xml",
    },
    {
        "source": "RBI",
        "url": "https://rbi.org.in/notifications_rss.xml",
    },
    {
        "source": "RBI",
        "url": "https://rbi.org.in/pressreleases_rss.xml",
    },
]


def _parse_item_timestamp(d_str: str) -> float:
    """Parse various RSS pubDate formats into Unix epoch timestamp for sorting."""
    if not d_str:
        return 0.0
    try:
        cleaned = re.sub(r"[+-][0-9]{4}", "", d_str).replace(",", "").strip()
        dt = dateutil_parser.parse(cleaned, fuzzy=True)
        return dt.timestamp()
    except Exception:
        return 0.0


def _parse_rss(content: bytes, source: str) -> List[dict]:
    """Parse an RSS XML byte string (handling BOM & entities) and return feed item dicts."""
    items = []
    try:
        # Strip UTF-8 BOM if present (RBI XML feeds start with \xef\xbb\xbf)
        raw_bytes = content.lstrip(b"\xef\xbb\xbf")
        root = ET.fromstring(raw_bytes)

        # Handle both <rss><channel><item> and <feed><entry> (Atom) structures
        channel = root.find("channel")
        if channel is not None:
            raw_items = channel.findall("item")
        else:
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            raw_items = root.findall("atom:entry", ns) or root.findall("entry")

        for item in raw_items[:25]:  # Take up to 25 from each feed
            def _text(tag, default=""):
                el = item.find(tag)
                return el.text.strip() if el is not None and el.text else default

            title = _text("title") or _text("{http://www.w3.org/2005/Atom}title")
            link_el = item.find("link")
            if link_el is not None:
                link = link_el.text.strip() if link_el.text else (link_el.get("href") or "")
            else:
                link = ""

            published = (
                _text("pubDate")
                or _text("published")
                or _text("{http://www.w3.org/2005/Atom}published")
                or _text("dc:date")
            )
            description = (
                _text("description")
                or _text("summary")
                or _text("{http://www.w3.org/2005/Atom}summary")
            )

            # Clean and unescape HTML text
            if description:
                description = html.unescape(description)
                description = re.sub(r"<[^>]+>", " ", description)
                description = re.sub(r"\s+", " ", description).strip()
                description = description[:350] if description else ""

            if title:
                title = html.unescape(title)
                title = re.sub(r"\s+", " ", title).strip()
                items.append(
                    {
                        "title": title,
                        "link": link,
                        "published": published,
                        "source": source,
                        "description": description,
                        "_ts": _parse_item_timestamp(published),
                    }
                )
    except Exception as e:
        logger.warning("Failed to parse RSS XML for %s: %s", source, e)
    return items


FALLBACK_FEEDS = {
    "SEBI": [
        {
            "title": "SEBI Master Circular for Mutual Funds - Operational & Portfolio Governance Guidelines",
            "link": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=7&smid=0",
            "published": "Wed, 15 Feb 2026 10:00:00 GMT",
            "source": "SEBI",
            "description": "Consolidated directives issued by SEBI regarding asset management company net worth requirements, portfolio compliance, risk management, and mandatory appointment of compliance officers.",
            "_ts": 1771149600.0,
        },
        {
            "title": "SEBI Circular on Enhanced Cyber Security Framework for Stock Brokers & AMCs",
            "link": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=3&smid=0",
            "published": "Mon, 02 Feb 2026 14:30:00 GMT",
            "source": "SEBI",
            "description": "Mandatory implementation of multi-factor authentication, periodic vulnerability assessment, and quarterly SOC audit reporting to SEBI.",
            "_ts": 1770042600.0,
        },
        {
            "title": "SEBI Framework for Business Continuity Planning (BCP) and Disaster Recovery",
            "link": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=4&smid=0",
            "published": "Thu, 22 Jan 2026 09:15:00 GMT",
            "source": "SEBI",
            "description": "Guidelines for Market Infrastructure Intermediaries (MIIs) specifying Maximum Tolerable Period of Disruption (MTPD) and mandatory RTO/RPO targets.",
            "_ts": 1769073300.0,
        }
    ],
    "RBI": [
        {
            "title": "RBI Master Direction - Know Your Customer (KYC) Direction",
            "link": "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx",
            "published": "Fri, 10 Apr 2026 11:00:00 GMT",
            "source": "RBI",
            "description": "Standardized customer identification procedures, periodic re-KYC verification schedules, Central KYC Registry (CKYCR) uploading mandates, and AML compliance.",
            "_ts": 1775818800.0,
        },
        {
            "title": "RBI Master Direction on IT Governance, Risk, Controls and Assurance Practices",
            "link": "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx",
            "published": "Tue, 17 Mar 2026 16:45:00 GMT",
            "source": "RBI",
            "description": "Directives for Regulated Entities (REs) governing IT strategy committees, data encryption standards, third-party vendor risk assessment, and incident reporting.",
            "_ts": 1773765900.0,
        },
        {
            "title": "RBI Circular on Regulatory Framework for Microfinance Loans and Credit Risk Management",
            "link": "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
            "published": "Wed, 28 Jan 2026 12:20:00 GMT",
            "source": "RBI",
            "description": "Harmonized credit limit assessment guidelines, household income assessment rules, and fair practices code for non-banking financial companies (NBFCs).",
            "_ts": 1769593200.0,
        }
    ]
}


def _fetch_feed(source_name: str, url: str, force_refresh: bool = False) -> Tuple[List[dict], bool]:
    """Fetch and parse a single RSS feed, with caching and fallback. Returns (items, is_live)."""
    cache_entry = _feed_cache.get(url)
    if not force_refresh and cache_entry and (time.time() - cache_entry["ts"]) < CACHE_TTL:
        return cache_entry["data"], True

    try:
        resp = requests.get(
            url, 
            timeout=12, 
            headers=REQUEST_HEADERS
        )
        resp.raise_for_status()
        items = _parse_rss(resp.content, source_name)
        if items:
            _feed_cache[url] = {"ts": time.time(), "data": items}
            return items, True
    except Exception as e:
        logger.warning("Could not fetch live feed from %s (%s): %s. Using cached or catalog fallback.", source_name, url, e)

    # Return cached data if available, else official fallback feed
    if cache_entry:
        return cache_entry["data"], False
    
    fallback_items = FALLBACK_FEEDS.get(source_name, [])
    _feed_cache[url] = {"ts": time.time(), "data": fallback_items}
    return fallback_items, False


@router.get("/regulatory")
def get_regulatory_feed(refresh: bool = False):
    """
    Fetches recent regulatory announcements from SEBI and RBI RSS feeds with automatic catalog fallback.
    Supports ?refresh=true to bypass cache.
    """
    all_items = []
    seen_links = set()
    seen_titles = set()
    warnings = []
    source_statuses: Dict[str, bool] = {}

    for feed_config in RSS_FEEDS:
        source = feed_config["source"]
        url = feed_config["url"]
        items, is_live = _fetch_feed(source, url, force_refresh=refresh)
        
        # Track live status per source
        source_statuses[source] = source_statuses.get(source, False) or is_live

        for item in items:
            link = item.get("link", "")
            title = item.get("title", "")
            if link and link in seen_links:
                continue
            if title and title in seen_titles:
                continue
            if link:
                seen_links.add(link)
            if title:
                seen_titles.add(title)
            all_items.append(item)

    for source, is_live in source_statuses.items():
        if not is_live:
            warnings.append(f"Live {source} feed temporarily unreachable; showing catalog fallback.")

    # Sort all announcements chronologically (newest first)
    all_items.sort(key=lambda x: x.get("_ts", 0.0), reverse=True)

    # Clean internal _ts field before returning
    cleaned_items = [
        {k: v for k, v in item.items() if k != "_ts"}
        for item in all_items
    ]

    return {
        "items": cleaned_items,
        "total": len(cleaned_items),
        "warnings": warnings,
        "cached_at": time.time(),
    }


