from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db, crud, schemas
from .auth import get_current_user

router = APIRouter(prefix="/obligations", tags=["obligations"])


@router.get("", response_model=List[schemas.ObligationResponse])
def read_obligations(
    skip: int = 0,
    limit: int = 200,
    regulation_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
):
    """
    Lists obligations extracted from uploaded regulation PDFs (and catalog documents).
    Excludes the live SEBI scrape feed so the matrix stays tied to ingested regulations.
    """
    return crud.get_obligations(db, skip=skip, limit=limit, regulation_id=regulation_id)


@router.get("/{obligation_id}", response_model=schemas.ObligationResponse)
def read_obligation(
    obligation_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
):
    """
    Returns details for a single compliance obligation including mapped tasks and reminders.
    """
    db_obligation = crud.get_obligation(db, obligation_id=obligation_id)
    if not db_obligation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Obligation not found",
        )
    return db_obligation
