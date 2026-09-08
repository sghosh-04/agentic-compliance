import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", STORAGE_DIR / "uploads"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", STORAGE_DIR / "generated_reports"))

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
