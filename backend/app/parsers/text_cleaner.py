import re

def clean_text(text: str) -> str:
    """
    Cleans raw extracted text by removing redundant white spaces, multiple empty newlines,
    and normalizing spaces/newlines.
    """
    if not text:
        return ""
    # Replace multiple spaces/tabs with single space
    text = re.sub(r'[ \t]+', ' ', text)
    # Replace multiple newlines with at most two newlines (to separate paragraphs)
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()
