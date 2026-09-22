from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from . import models, schemas
from datetime import datetime

LIVE_SEBI_REGULATION_TITLE = "SEBI Live Circulars & Regulations"


def _annotate_obligation(ob: models.Obligation) -> models.Obligation:
    if ob.regulation:
        ob.regulation_title = ob.regulation.title
        ob.regulation_source = ob.regulation.source
        ob.regulation_file_path = ob.regulation.file_path
    for reminder in getattr(ob, "reminders", []) or []:
        _annotate_reminder(reminder)
    return ob


def _annotate_reminder(reminder: models.Reminder) -> models.Reminder:
    if reminder.obligation:
        reminder.obligation_title = reminder.obligation.title
        if reminder.obligation.regulation:
            reminder.regulation_title = reminder.obligation.regulation.title
    return reminder

def _annotate_evidence(evidence: models.Evidence) -> models.Evidence:
    if evidence.task:
        evidence.task_title = evidence.task.title
        evidence.task_description = evidence.task.description
        if evidence.task.obligation:
            evidence.obligation_title = evidence.task.obligation.title
            evidence.obligation_risk_level = evidence.task.obligation.risk_level
            if evidence.task.obligation.regulation:
                evidence.regulation_title = evidence.task.obligation.regulation.title
    return evidence

# User Operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate, hashed_password: str):
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Regulation Operations
def get_regulation(db: Session, regulation_id: int):
    return db.query(models.Regulation).filter(models.Regulation.id == regulation_id).first()

def get_regulations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Regulation).order_by(models.Regulation.created_at.desc()).offset(skip).limit(limit).all()

def create_regulation(db: Session, regulation: schemas.RegulationCreate, file_path: str = None):
    db_regulation = models.Regulation(
        title=regulation.title,
        description=regulation.description,
        source=regulation.source,
        category=regulation.category,
        reference_url=regulation.reference_url,
        published_date=regulation.published_date,
        file_path=file_path,
        status="Pending"
    )
    db.add(db_regulation)
    db.commit()
    db.refresh(db_regulation)
    return db_regulation

def update_regulation_status(db: Session, regulation_id: int, status: str, processed_at: datetime = None):
    db_regulation = get_regulation(db, regulation_id)
    if db_regulation:
        db_regulation.status = status
        if processed_at:
            db_regulation.processed_at = processed_at
        db.commit()
        db.refresh(db_regulation)
    return db_regulation

# Obligation Operations
def get_obligation(db: Session, obligation_id: int):
    ob = (
        db.query(models.Obligation)
        .options(
            joinedload(models.Obligation.regulation),
            joinedload(models.Obligation.tasks),
            joinedload(models.Obligation.reminders),
        )
        .filter(models.Obligation.id == obligation_id)
        .first()
    )
    return _annotate_obligation(ob) if ob else None

def get_obligations(db: Session, skip: int = 0, limit: int = 100, regulation_id: int = None):
    excluded_ids = db.query(models.Regulation.id).filter(
        models.Regulation.title == LIVE_SEBI_REGULATION_TITLE
    )
    query = (
        db.query(models.Obligation)
        .options(
            joinedload(models.Obligation.regulation),
            joinedload(models.Obligation.tasks),
            joinedload(models.Obligation.reminders),
        )
        .filter(~models.Obligation.regulation_id.in_(excluded_ids))
    )
    if regulation_id:
        query = query.filter(models.Obligation.regulation_id == regulation_id)
    rows = query.order_by(models.Obligation.created_at.desc()).offset(skip).limit(limit).all()
    return [_annotate_obligation(ob) for ob in rows]

def get_obligations_by_regulation(db: Session, regulation_id: int):
    return db.query(models.Obligation).filter(models.Obligation.regulation_id == regulation_id).all()

def create_obligation(db: Session, obligation: schemas.ObligationBase, regulation_id: int):
    db_obligation = models.Obligation(
        regulation_id=regulation_id,
        title=obligation.title,
        description=obligation.description,
        section_reference=obligation.section_reference,
        category=obligation.category,
        compliance_deadline=obligation.compliance_deadline,
        penalty_description=obligation.penalty_description,
        risk_level=obligation.risk_level,
        status=obligation.status
    )
    db.add(db_obligation)
    db.commit()
    db.refresh(db_obligation)
    return db_obligation

# Task Operations
def _annotate_task(task: models.ComplianceTask) -> models.ComplianceTask:
    if task.obligation:
        task.obligation_risk_level = task.obligation.risk_level
    else:
        task.obligation_risk_level = "Medium"
    return task

def get_task(db: Session, task_id: int):
    task = (
        db.query(models.ComplianceTask)
        .options(joinedload(models.ComplianceTask.obligation))
        .filter(models.ComplianceTask.id == task_id)
        .first()
    )
    return _annotate_task(task) if task else None

def get_tasks(db: Session, skip: int = 0, limit: int = 100):
    tasks = (
        db.query(models.ComplianceTask)
        .options(joinedload(models.ComplianceTask.obligation))
        .order_by(models.ComplianceTask.due_date.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_annotate_task(t) for t in tasks]

def create_task(db: Session, task: schemas.ComplianceTaskCreate, created_by: int = None):
    db_task = models.ComplianceTask(
        obligation_id=task.obligation_id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        due_date=task.due_date,
        status=task.status,
        priority=task.priority
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    if task.reminder_at and task.obligation_id:
        create_reminder(
            db,
            schemas.ReminderCreate(
                obligation_id=task.obligation_id,
                task_id=db_task.id,
                title=f"Reminder: {task.title}",
                message=task.reminder_message or task.description,
                remind_at=task.reminder_at,
            ),
            created_by=created_by,
        )
        db.refresh(db_task)
    return get_task(db, db_task.id)


def create_reminder(db: Session, reminder: schemas.ReminderCreate, created_by: int = None):
    db_reminder = models.Reminder(
        obligation_id=reminder.obligation_id,
        task_id=reminder.task_id,
        created_by=created_by,
        title=reminder.title,
        message=reminder.message,
        remind_at=reminder.remind_at,
        status="Pending",
    )
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return _annotate_reminder(db_reminder)


def get_reminder(db: Session, reminder_id: int):
    reminder = (
        db.query(models.Reminder)
        .options(
            joinedload(models.Reminder.obligation).joinedload(models.Obligation.regulation)
        )
        .filter(models.Reminder.id == reminder_id)
        .first()
    )
    return _annotate_reminder(reminder) if reminder else None


def get_reminders(db: Session, skip: int = 0, limit: int = 100, due_only: bool = False, status: str = None):
    query = (
        db.query(models.Reminder)
        .options(
            joinedload(models.Reminder.obligation).joinedload(models.Obligation.regulation)
        )
        .order_by(models.Reminder.remind_at.asc())
    )
    if status:
        query = query.filter(models.Reminder.status == status)
    if due_only:
        query = query.filter(
            models.Reminder.status == "Pending",
            models.Reminder.remind_at <= datetime.utcnow(),
        )
    rows = query.offset(skip).limit(limit).all()
    return [_annotate_reminder(row) for row in rows]


def update_reminder(db: Session, reminder_id: int, reminder_update: schemas.ReminderUpdate):
    db_reminder = get_reminder(db, reminder_id)
    if not db_reminder:
        return None
    update_data = reminder_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_reminder, key, value)
    db.commit()
    db.refresh(db_reminder)
    return _annotate_reminder(db_reminder)

def update_task(db: Session, task_id: int, task_update: schemas.ComplianceTaskUpdate):
    db_task = db.query(models.ComplianceTask).filter(models.ComplianceTask.id == task_id).first()
    if not db_task:
        return None
    
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    
    db.commit()
    return get_task(db, task_id)

def delete_task(db: Session, task_id: int):
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False

# Evidence Operations
def get_evidence(db: Session, evidence_id: int):
    evidence = (
        db.query(models.Evidence)
        .options(
            joinedload(models.Evidence.task)
            .joinedload(models.ComplianceTask.obligation)
            .joinedload(models.Obligation.regulation)
        )
        .filter(models.Evidence.id == evidence_id)
        .first()
    )
    return _annotate_evidence(evidence) if evidence else None

def get_all_evidence(db: Session, skip: int = 0, limit: int = 100):
    rows = (
        db.query(models.Evidence)
        .options(
            joinedload(models.Evidence.task)
            .joinedload(models.ComplianceTask.obligation)
            .joinedload(models.Obligation.regulation)
        )
        .order_by(models.Evidence.uploaded_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_annotate_evidence(row) for row in rows]

def create_evidence(db: Session, title: str, file_path: str, task_id: int, uploaded_by: int):
    db_evidence = models.Evidence(
        task_id=task_id,
        title=title,
        file_path=file_path,
        uploaded_by=uploaded_by,
        status="Pending_Review"
    )
    db.add(db_evidence)
    # Automatically update task status to Under_Review if it is currently Pending or In_Progress
    db_task = db.query(models.ComplianceTask).filter(models.ComplianceTask.id == task_id).first()
    if db_task and db_task.status in ["Pending", "In_Progress"]:
        db_task.status = "Under_Review"
    db.commit()
    return get_evidence(db, db_evidence.id)

def update_evidence_status(db: Session, evidence_id: int, status: str, comments: str = None):
    db_evidence = db.query(models.Evidence).filter(models.Evidence.id == evidence_id).first()
    if db_evidence:
        db_evidence.status = status
        if comments:
            db_evidence.comments = comments
        
        # If evidence is approved, check if we should mark the task as Completed
        if status == "Approved":
            db_task = db.query(models.ComplianceTask).filter(models.ComplianceTask.id == db_evidence.task_id).first()
            if db_task:
                db_task.status = "Completed"
        db.commit()
    return get_evidence(db, evidence_id)

# Gap Analysis Operations
def get_gap_analysis(db: Session, gap_id: int):
    return db.query(models.GapAnalysis).filter(models.GapAnalysis.id == gap_id).first()

def get_gap_analyses(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.GapAnalysis).offset(skip).limit(limit).all()

def get_gap_analyses_by_regulation(db: Session, regulation_id: int):
    return db.query(models.GapAnalysis).filter(models.GapAnalysis.regulation_id == regulation_id).all()

def create_gap_analysis(db: Session, findings: str, risk_assessment: str, recommendations: str, regulation_id: int, status: str = "Identified"):
    db_gap = models.GapAnalysis(
        regulation_id=regulation_id,
        findings=findings,
        risk_assessment=risk_assessment,
        recommendations=recommendations,
        status=status
    )
    db.add(db_gap)
    db.commit()
    db.refresh(db_gap)
    return db_gap

def get_tasks_by_regulation(db: Session, regulation_id: int):
    return (
        db.query(models.ComplianceTask)
        .join(models.Obligation)
        .filter(models.Obligation.regulation_id == regulation_id)
        .all()
    )

def update_gap_analysis_status(db: Session, gap_id: int, status: str):
    db_gap = get_gap_analysis(db, gap_id)
    if db_gap:
        db_gap.status = status
        db.commit()
        db.refresh(db_gap)
    return db_gap

# Audit Log Operations
def create_audit_log(db: Session, user_id: int, action: str, details: str = None):
    log = models.AuditLog(
        user_id=user_id,
        action=action,
        details=details
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

# RiskSnapshot Operations
def create_risk_snapshot(db: Session, score: float, total_obligations: int, completed_tasks: int, total_tasks: int, open_gaps: int):
    snapshot = models.RiskSnapshot(
        score=score,
        total_obligations=total_obligations,
        completed_tasks=completed_tasks,
        total_tasks=total_tasks,
        open_gaps=open_gaps
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def get_risk_snapshots(db: Session, limit: int = 90):
    return (
        db.query(models.RiskSnapshot)
        .order_by(models.RiskSnapshot.recorded_at.asc())
        .limit(limit)
        .all()
    )


# Audit Package helper — fetch all data for a regulation
def get_audit_package_data(db: Session, regulation_id: int) -> dict:
    regulation = get_regulation(db, regulation_id)
    if not regulation:
        return None

    obligations = get_obligations_by_regulation(db, regulation_id)
    tasks = get_tasks_by_regulation(db, regulation_id)
    gap_analyses = get_gap_analyses_by_regulation(db, regulation_id)

    # Fetch evidence linked to those tasks
    evidence_list = []
    task_ids = [t.id for t in tasks]
    if task_ids:
        evidence_list = db.query(models.Evidence).filter(models.Evidence.task_id.in_(task_ids)).all()

    # Recent audit logs — last 50
    audit_logs = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.timestamp.desc())
        .limit(50)
        .all()
    )

    return {
        "regulation": regulation,
        "obligations": obligations,
        "tasks": tasks,
        "evidence": evidence_list,
        "gap_analyses": gap_analyses,
        "audit_logs": audit_logs,
    }
