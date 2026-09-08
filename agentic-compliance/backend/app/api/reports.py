from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, crud, schemas

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/gap-analyses", response_model=List[schemas.GapAnalysisResponse])
def read_gap_analyses(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Fetches the lists of all active Gap Analyses conducted on regulations.
    """
    return crud.get_gap_analyses(db, skip=skip, limit=limit)

@router.get("/gap-analyses/{gap_id}", response_model=schemas.GapAnalysisResponse)
def read_gap_analysis(gap_id: int, db: Session = Depends(get_db)):
    """
    Retrieves detailed findings for a single Gap Analysis.
    """
    db_gap = crud.get_gap_analysis(db, gap_id=gap_id)
    if not db_gap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Gap Analysis not found"
        )
    return db_gap
