from fastapi import APIRouter, Depends, File, UploadFile, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
import os
import shutil
from datetime import date
from ..database import get_db, crud, schemas
from .auth import get_current_user
from ..main_deps import get_orchestrator
from ..agents.orchestrator import ComplianceOrchestrator
from ..config import UPLOAD_DIR

router = APIRouter(prefix="/upload", tags=["upload"])

# Dynamic DB session import
# To run background tasks with a clean DB session during thread lifetime:
def run_orchestrated_task(file_path: str, regulation_id: int, user_id: int):
    # Setup independent db session inside thread scope
    from ..database.connection import SessionLocal
    db = SessionLocal()
    try:
        orchestrator = get_orchestrator()
        orchestrator.process_document(db=db, file_path=file_path, regulation_id=regulation_id, user_id=user_id)
    except Exception as e:
        print(f"Background task failed for reg {regulation_id}: {e}")
    finally:
        db.close()

@router.post("", response_model=schemas.RegulationResponse)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Accepts regulatory circular PDFs, saves them locally, creates database entry,
    and runs the agent compliance processing pipeline in the background.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only PDF documents are supported for ingestion."
        )

    # Ensure upload directory exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    # Sanitize file name to avoid directory traversal
    safe_filename = os.path.basename(file.filename)
    file_path = str(UPLOAD_DIR / safe_filename)

    # Save to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to local disk: {str(e)}"
        )

    # Initiate standard temporary regulation entry
    # (The title, category, and date will be refined during agent execution)
    title_display = safe_filename.replace(".pdf", "").replace("_", " ").title()
    reg_schema = schemas.RegulationCreate(
        title=title_display,
        source="Regulator", # Deducible by Agent
        category="General",
        reference_url=None,
        published_date=date.today()
    )
    
    db_regulation = crud.create_regulation(db, reg_schema, file_path=file_path)

    # Dispatches the multi-agent task asynchronously
    background_tasks.add_task(
        run_orchestrated_task,
        file_path=file_path,
        regulation_id=db_regulation.id,
        user_id=current_user.id
    )

    return db_regulation
