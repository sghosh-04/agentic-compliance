import logging
from ..parsers.pdf_parser import extract_text_from_pdf
from ..parsers.ocr import run_ocr_on_pdf
from ..parsers.text_cleaner import clean_text

logger = logging.getLogger("document_reader")

class DocumentReaderAgent:
    def __init__(self):
        pass

    def run(self, file_path: str) -> str:
        """
        Reads, parses, and cleans document content.
        Uses OCR fallback if text extraction is empty.
        """
        logger.info(f"Reader Agent: Ingesting file {file_path}")
        raw_text = extract_text_from_pdf(file_path)
        
        # Check if text is extracted, otherwise run OCR
        if not raw_text.strip():
            logger.warning("Empty text extracted. Running OCR fallback...")
            raw_text = run_ocr_on_pdf(file_path)
            
        cleaned = clean_text(raw_text)
        logger.info(f"Reader Agent: Successfully parsed {len(cleaned)} characters.")
        return cleaned
