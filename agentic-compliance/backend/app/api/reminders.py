from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db, crud, schemas
from .auth import get_current_user

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=List[schemas.ReminderResponse])
def read_reminders(
    skip: int = 0,
    limit: int = 100,
    due_only: bool = False,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
):
    return crud.get_reminders(
        db,
        skip=skip,
        limit=limit,
        due_only=due_only,
        status=status_filter,
    )


@router.post("", response_model=schemas.ReminderResponse)
def create_reminder(
    reminder: schemas.ReminderCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
):
    obligation = crud.get_obligation(db, reminder.obligation_id)
    if not obligation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Obligation not found.")
    if reminder.task_id:
        task = crud.get_task(db, reminder.task_id)
        if not task:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task not found.")

    db_reminder = crud.create_reminder(db, reminder, created_by=current_user.id)
    crud.create_audit_log(
        db,
        current_user.id,
        "CREATE_REMINDER",
        f"Created reminder '{db_reminder.title}' for obligation {reminder.obligation_id}",
    )
    return db_reminder


@router.put("/{reminder_id}", response_model=schemas.ReminderResponse)
def update_reminder(
    reminder_id: int,
    reminder_update: schemas.ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
):
    db_reminder = crud.get_reminder(db, reminder_id)
    if not db_reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    updated = crud.update_reminder(db, reminder_id, reminder_update)
    crud.create_audit_log(
        db,
        current_user.id,
        "UPDATE_REMINDER",
        f"Updated reminder '{db_reminder.title}'. Status: {updated.status}",
    )
    return updated
