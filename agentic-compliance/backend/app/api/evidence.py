from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil
from typing import List
from ..database import get_db, crud, schemas
from .auth import get_current_user
from ..main_deps import get_ai_service
from ..agents.evidence_matcher import EvidenceMatcherAgent
from ..agents.document_reader import DocumentReaderAgent
from ..services.ai_service import AIService

router = APIRouter(prefix="/evidence", tags=["evidence"])

EVIDENCE_DIR = os.getenv("EVIDENCE_DIR", "./app/storage/evidence")

@router.post("", response_model=schemas.EvidenceResponse)
def upload_evidence(
    task_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Submits a PDF/image proof file to satisfy a compliance task.
    Automatically moves task status to Under_Review.
    """
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Linked compliance task not found."
        )

    # Ensure evidence folder exists
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    
    # Store evidence locally
    safe_filename = f"task_{task_id}_{os.path.basename(file.filename)}"
    file_path = os.path.join(EVIDENCE_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save evidence file: {str(e)}"
        )

    # Create evidence row in DB
    db_evidence = crud.create_evidence(
        db, 
        title=title, 
        file_path=file_path, 
        task_id=task_id, 
        uploaded_by=current_user.id
    )

    crud.create_audit_log(
        db, 
        current_user.id, 
        "UPLOAD_EVIDENCE", 
        f"Uploaded evidence: {title} for task: {db_task.title}"
    )

    if db_task.obligation and db_task.obligation.regulation_id:
        from ..main_deps import get_orchestrator
        try:
            get_orchestrator().regenerate_gap_analysis_and_report(db, db_task.obligation.regulation_id, current_user.id)
        except Exception as e:
            import logging
            logging.getLogger("evidence").error(f"Failed to regenerate report after evidence upload: {e}")

    return db_evidence

from pydantic import BaseModel
from typing import Optional

class EvidenceReviewUpdate(BaseModel):
    status_update: str
    comments: Optional[str] = None

@router.put("/{evidence_id}/status", response_model=schemas.EvidenceResponse)
def review_evidence(
    evidence_id: int,
    review: EvidenceReviewUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Compliance review endpoint. Approving evidence automatically updates the linked task status to Completed.
    """
    status_update = review.status_update
    comments = review.comments
    if current_user.role not in ["Admin", "Compliance_Officer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only compliance officers can review evidence."
        )
        
    db_evidence = crud.get_evidence(db, evidence_id=evidence_id)
    if not db_evidence:
        raise HTTPException(status_code=404, detail="Evidence item not found.")
        
    if status_update not in ["Approved", "Rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Status must be either Approved or Rejected."
        )

    updated = crud.update_evidence_status(db, evidence_id, status_update, comments)
    crud.create_audit_log(
        db, 
        current_user.id, 
        "REVIEW_EVIDENCE", 
        f"Reviewed evidence ID {evidence_id}: {status_update}. Comments: {comments}"
    )

    if updated.task and updated.task.obligation and updated.task.obligation.regulation_id:
        from ..main_deps import get_orchestrator
        try:
            get_orchestrator().regenerate_gap_analysis_and_report(db, updated.task.obligation.regulation_id, current_user.id)
        except Exception as e:
            import logging
            logging.getLogger("evidence").error(f"Failed to regenerate report after evidence review: {e}")

    return updated

@router.get("", response_model=List[schemas.EvidenceResponse])
def get_all_evidence(db: Session = Depends(get_db)):
    """
    Lists all submitted evidence files.
    """
    return crud.get_all_evidence(db)


@router.post("/{evidence_id}/auto-match")
def auto_match_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service),
):
    """
    Automatically matches an uploaded evidence file semantically against all active obligations.
    Extracts text from the evidence PDF, runs EvidenceMatcherAgent, and returns matches with
    confidence scores and reasoning.
    """
    db_evidence = crud.get_evidence(db, evidence_id)
    if not db_evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence item not found.",
        )

    # Verify the file exists on disk
    if not os.path.exists(db_evidence.file_path):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Evidence file not found on disk: {db_evidence.file_path}",
        )

    # Extract text from the evidence file using DocumentReaderAgent
    reader = DocumentReaderAgent()
    try:
        evidence_text = reader.run(db_evidence.file_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract text from evidence file: {str(e)}",
        )

    if not evidence_text or not evidence_text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No readable text could be extracted from the evidence file.",
        )

    # Fetch all active obligations from DB
    all_obligations = crud.get_obligations(db, limit=200)
    active_obligations = [ob for ob in all_obligations if ob.status == "Active"]

    if not active_obligations:
        return {
            "evidence_id": evidence_id,
            "evidence_title": db_evidence.title,
            "matches": [],
            "summary": "No active obligations found in the system to match against.",
        }

    obligations_list = [
        {
            "id": ob.id,
            "title": ob.title,
            "description": ob.description,
            "category": ob.category or "General",
            "risk_level": ob.risk_level or "Medium",
        }
        for ob in active_obligations
    ]

    matcher = EvidenceMatcherAgent(ai_service)
    result = matcher.run(evidence_text, obligations_list)

    crud.create_audit_log(
        db,
        current_user.id,
        "EVIDENCE_AUTO_MATCH",
        f"Auto-matched evidence '{db_evidence.title}' (ID {evidence_id}) against "
        f"{len(active_obligations)} obligations. Found {len(result['matches'])} matches.",
    )

    return {
        "evidence_id": evidence_id,
        "evidence_title": db_evidence.title,
        "matches": result["matches"],
        "summary": result["summary"],
    }

@router.get("/{evidence_id}/download")
def download_evidence_file(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Downloads or serves the submitted evidence file.
    """
    db_evidence = crud.get_evidence(db, evidence_id=evidence_id)
    if not db_evidence:
        raise HTTPException(status_code=404, detail="Evidence item not found.")
        
    if not os.path.exists(db_evidence.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk.")
        
    return FileResponse(
        path=db_evidence.file_path,
        filename=os.path.basename(db_evidence.file_path),
        media_type="application/octet-stream"
    )
