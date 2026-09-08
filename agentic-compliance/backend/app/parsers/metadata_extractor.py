import re
from datetime import datetime, date
from typing import Dict, Any

def extract_metadata_from_text(text: str) -> Dict[str, Any]:
    """
    Scans document text using pattern matching to determine:
    - Publisher authority (SEBI, RBI, etc.)
    - Document title
    - Circular reference code
    - Publication date
    - Document category
    """
    metadata = {
        "title": "Regulatory Compliance Update",
        "authority": "Government Regulator",
        "circular_ref": None,
        "published_date": None,
        "category": "Regulatory Audit"
    }

    if not text:
        return metadata

    # 1. Deduce Authority
    if re.search(r'Securities\s+and\s+Exchange\s+Board\s+of\s+India|SEBI', text, re.IGNORECASE):
        metadata["authority"] = "SEBI"
        metadata["category"] = "Securities Compliance"
    elif re.search(r'Reserve\s+Bank\s+of\s+India|RBI', text, re.IGNORECASE):
        metadata["authority"] = "RBI"
        metadata["category"] = "Banking Supervision"
    elif re.search(r'Insurance\s+Regulatory\s+and\s+Development|IRDAI', text, re.IGNORECASE):
        metadata["authority"] = "IRDAI"
        metadata["category"] = "Insurance Audit"

    # 2. Extract Circular Reference
    # Matches patterns like SEBI/HO/IMD/DF2/CIR/P/2021/630
    ref_match = re.search(r'(?:Circular\s+No\.?|Ref\s+No\.?|Ref[\s\.\:]+)?\s*([A-Z]{3,5}/[A-Z0-9_/]+CIR/[A-Z0-9_/]+)', text)
    if not ref_match:
        ref_match = re.search(r'(?:Circular\s+No\.?|Ref\s+No\.?)\s*([A-Za-z0-9\/\-\.\_]+(?:202\d|199\d|20[0-2]\d)[A-Za-z0-9\/\-\.\_]*)', text)
    if ref_match:
        metadata["circular_ref"] = ref_match.group(1).strip()

    # 3. Extract Published Date
    # Try Month Day, Year (e.g., October 22, 2021)
    date_match = re.search(r'([A-Z][a-z]+ \d{1,2},\s*\d{4})', text)
    if not date_match:
        # Try DD Month YYYY (e.g., 22 October 2021 or 22-Oct-2021)
        date_match = re.search(r'(\d{1,2}[\s\-\/\.](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/\.]\d{4})', text, re.IGNORECASE)
    if not date_match:
        # Try DD/MM/YYYY
        date_match = re.search(r'(\d{1,2}[\-\/\.]\d{2,4}[\-\/\.]\d{2,4})', text)

    if date_match:
        date_str = date_match.group(1).strip()
        for fmt in ("%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d-%b-%Y", "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%Y-%m-%d"):
            try:
                parsed_date = datetime.strptime(date_str, fmt).date()
                metadata["published_date"] = parsed_date
                break
            except ValueError:
                continue

    # Fallback to current date if none parsed
    if not metadata["published_date"]:
        metadata["published_date"] = date.today()

    # 4. Deduce Title
    # Parse the first few lines of the text and extract an informative line
    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 15]
    for line in lines[:8]:
        if not any(k in line.lower() for k in ["circular", "ref", "date:", "to all", "registered", "memorandum", "notification"]):
            metadata["title"] = line[:100]
            break

    return metadata
