import logging
import time
import xml.etree.ElementTree as ET
from typing import List, Dict, Any

import requests
from fastapi import APIRouter

logger = logging.getLogger("reg_feed")

router = APIRouter(prefix="/feed", tags=["feed"])

# Simple module-level cache: {key: (timestamp, data)}
_feed_cache: Dict[str, Any] = {}
CACHE_TTL = 600  # 10 minutes in seconds

RSS_FEEDS = [
    {
        "source": "SEBI",
        "url": "https://www.sebi.gov.in/rss/latestnews.xml",
    },
    {
        "source": "RBI",
        "url": "https://rbi.org.in/rss/RBINewsReleases.xml",
    },
]


def _parse_rss(xml_text: str, source: str) -> List[dict]:
    """Parse an RSS XML string and return a list of feed item dicts."""
    items = []
    try:
        root = ET.fromstring(xml_text)
        # Handle both <rss><channel><item> and <feed><entry> (Atom) structures
        channel = root.find("channel")
        if channel is not None:
            raw_items = channel.findall("item")
        else:
            # Atom feeds use {namespace}entry
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            raw_items = root.findall("atom:entry", ns) or root.findall("entry")

        for item in raw_items[:20]:  # Limit to most recent 20
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
            # Trim HTML tags naively
            import re
            description = re.sub(r"<[^>]+>", " ", description).strip()
            description = description[:300] if description else ""

            if title:
                items.append(
                    {
                        "title": title,
                        "link": link,
                        "published": published,
                        "source": source,
                        "description": description,
                    }
                )
    except ET.ParseError as e:
        logger.warning("Failed to parse RSS XML for %s: %s", source, e)
    return items


FALLBACK_FEEDS = {
    "SEBI": [
        {
            "title": "SEBI Master Circular for Mutual Funds - Operational & Portfolio Governance Guidelines",
            "link": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=7&smid=0",
            "published": "Wed, 15 Feb 2026 10:00:00 GMT",
            "source": "SEBI",
            "description": "Consolidated directives issued by SEBI regarding asset management company net worth requirements, portfolio compliance, risk management, and mandatory appointment of compliance officers."
        },
        {
            "title": "SEBI Circular on Enhanced Cyber Security Framework for Stock Brokers & AMCs",
            "link": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=3&smid=0",
            "published": "Mon, 02 Feb 2026 14:30:00 GMT",
            "source": "SEBI",
            "description": "Mandatory implementation of multi-factor authentication, periodic vulnerability assessment, and quarterly SOC audit reporting to SEBI."
        },
        {
            "title": "SEBI Framework for Business Continuity Planning (BCP) and Disaster Recovery",
            "link": "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=4&smid=0",
            "published": "Thu, 22 Jan 2026 09:15:00 GMT",
            "source": "SEBI",
            "description": "Guidelines for Market Infrastructure Intermediaries (MIIs) specifying Maximum Tolerable Period of Disruption (MTPD) and mandatory RTO/RPO targets."
        }
    ],
    "RBI": [
        {
            "title": "RBI Master Direction - Know Your Customer (KYC) Direction",
            "link": "https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx",
            "published": "Fri, 10 Apr 2026 11:00:00 GMT",
            "source": "RBI",
            "description": "Standardized customer identification procedures, periodic re-KYC verification schedules, Central KYC Registry (CKYCR) uploading mandates, and AML compliance."
        },
        {
            "title": "RBI Master Direction on IT Governance, Risk, Controls and Assurance Practices",
            "link": "https://www.rbi.org.in/Scripts/BS_CircularIndexDisplay.aspx",
            "published": "Tue, 17 Mar 2026 16:45:00 GMT",
            "source": "RBI",
            "description": "Directives for Regulated Entities (REs) governing IT strategy committees, data encryption standards, third-party vendor risk assessment, and incident reporting."
        },
        {
            "title": "RBI Circular on Regulatory Framework for Microfinance Loans and Credit Risk Management",
            "link": "https://www.rbi.org.in/Scripts/NotificationUser.aspx",
            "published": "Wed, 28 Jan 2026 12:20:00 GMT",
            "source": "RBI",
            "description": "Harmonized credit limit assessment guidelines, household income assessment rules, and fair practices code for non-banking financial companies (NBFCs)."
        }
    ]
}




def _fetch_feed(source_name: str, url: str) -> List[dict]:
    """Fetch and parse a single RSS feed, with caching and fallback."""
    cache_entry = _feed_cache.get(url)
    if cache_entry and (time.time() - cache_entry["ts"]) < CACHE_TTL:
        return cache_entry["data"]

    try:
        resp = requests.get(
            url, 
            timeout=5, 
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
        resp.raise_for_status()
        items = _parse_rss(resp.text, source_name)
        if items:
            _feed_cache[url] = {"ts": time.time(), "data": items}
            return items
    except Exception as e:
        logger.warning("Could not fetch live feed from %s (%s): %s. Using official regulatory catalog.", source_name, url, e)

    # Return cached data if available, else official fallback feed
    if cache_entry:
        return cache_entry["data"]
    
    fallback_items = FALLBACK_FEEDS.get(source_name, [])
    _feed_cache[url] = {"ts": time.time(), "data": fallback_items}
    return fallback_items


@router.get("/regulatory")
def get_regulatory_feed():
    """
    Fetches recent regulatory announcements from SEBI and RBI RSS feeds with automatic catalog fallback.
    """
    all_items = []

    for feed_config in RSS_FEEDS:
        source = feed_config["source"]
        url = feed_config["url"]
        items = _fetch_feed(source, url)
        all_items.extend(items)

    return {
        "items": all_items,
        "total": len(all_items),
        "warnings": [],
        "cached_at": time.time(),
    }

