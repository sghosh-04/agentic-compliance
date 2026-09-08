import os
from pathlib import Path
import pdfplumber
import logging
from ..config import UPLOAD_DIR

logger = logging.getLogger("pdf_parser")

def _resolve_file_path(file_path: str) -> str:
    norm_path = file_path.replace('\\', '/')
    if os.path.exists(norm_path):
        return norm_path
    
    base = os.path.basename(norm_path)
    upload_candidate = str(UPLOAD_DIR / base)
    if os.path.exists(upload_candidate):
        return upload_candidate
        
    return norm_path

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    resolved_path = _resolve_file_path(file_path)

    try:
        logger.info(f"Opening PDF document: {resolved_path}")

        with pdfplumber.open(resolved_path) as pdf:
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- PAGE {i+1} ---\n{page_text}"

        logger.info(f"Successfully extracted {len(text)} characters from {resolved_path}")

    except Exception as e:
        logger.error(f"Error parsing PDF with pdfplumber from {resolved_path}: {e}")

    return text