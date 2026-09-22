from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db, crud, schemas
from .auth import get_current_user

router = APIRouter(prefix="/compliance", tags=["compliance"])

@router.get("/tasks", response_model=List[schemas.ComplianceTaskResponse])
def read_tasks(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Fetches list of active compliance tasks.
    """
    return crud.get_tasks(db, skip=skip, limit=limit)

@router.post("/tasks", response_model=schemas.ComplianceTaskResponse)
def create_task(
    task: schemas.ComplianceTaskCreate, 
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Manually schedules a new compliance task, mapping it optionally to an obligation.
    """
    # Ensure assigned user exists if specified
    if task.assigned_to:
        assigned_user = crud.get_user(db, task.assigned_to)
        if not assigned_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Assigned user does not exist."
            )
            
    db_task = crud.create_task(db, task, created_by=current_user.id)
    crud.create_audit_log(
        db, 
        current_user.id, 
        "CREATE_TASK", 
        f"Manually created compliance task: {db_task.title}"
    )
    if db_task.obligation and db_task.obligation.regulation_id:
        from ..main_deps import get_orchestrator
        try:
            get_orchestrator().regenerate_gap_analysis_and_report(db, db_task.obligation.regulation_id, current_user.id)
        except Exception as e:
            import logging
            logging.getLogger("compliance").error(f"Failed to regenerate report after task creation: {e}")
    return db_task

@router.put("/tasks/{task_id}", response_model=schemas.ComplianceTaskResponse)
def update_task(
    task_id: int, 
    task_update: schemas.ComplianceTaskUpdate, 
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Modifies task status, assignee, priority, description, or due date.
    """
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task_update.status == "Completed":
        if not db_task.evidence_items or len(db_task.evidence_items) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot mark task as Completed without uploading at least one audit proof file."
            )

    updated = crud.update_task(db, task_id, task_update)
    crud.create_audit_log(
        db, 
        current_user.id, 
        "UPDATE_TASK", 
        f"Updated compliance task: {db_task.title}. Status: {updated.status}"
    )
    if updated.obligation and updated.obligation.regulation_id:
        from ..main_deps import get_orchestrator
        try:
            get_orchestrator().regenerate_gap_analysis_and_report(db, updated.obligation.regulation_id, current_user.id)
        except Exception as e:
            import logging
            logging.getLogger("compliance").error(f"Failed to regenerate report after task update: {e}")
    return updated

@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int, 
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Deletes a compliance task.
    """
    db_task = crud.get_task(db, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    crud.delete_task(db, task_id)
    crud.create_audit_log(
        db, 
        current_user.id, 
        "DELETE_TASK", 
        f"Deleted compliance task: {db_task.title}"
    )
    return {"detail": "Task deleted successfully."}
