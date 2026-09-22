from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, datetime
from ..database import get_db, crud, schemas, models

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard", response_model=schemas.DashboardMetricsResponse)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Computes summary data for the frontend dashboards including:
    - Compliance status ratios
    - Priority count tallies
    - Open gaps counts
    - Quick lists of recent tasks and circular updates
    """
    # 1. Base query lengths
    total_regulations = db.query(models.Regulation).count()
    total_obligations = db.query(models.Obligation).count()
    total_tasks = db.query(models.ComplianceTask).count()
    gaps_count = db.query(models.GapAnalysis).filter(models.GapAnalysis.status != "Mitigated").count()

    # 2. Task status distribution
    tasks_by_status = {"Pending": 0, "In_Progress": 0, "Under_Review": 0, "Completed": 0}
    task_statuses = db.query(models.ComplianceTask.status, models.func.count(models.ComplianceTask.id)).group_by(models.ComplianceTask.status).all()
    for status_name, count in task_statuses:
        if status_name in tasks_by_status:
            tasks_by_status[status_name] = count

    # 3. Obligation risk distribution
    obligations_by_risk = {"High": 0, "Medium": 0, "Low": 0}
    risk_stats = db.query(models.Obligation.risk_level, models.func.count(models.Obligation.id)).group_by(models.Obligation.risk_level).all()
    for risk_name, count in risk_stats:
        if risk_name in obligations_by_risk:
            obligations_by_risk[risk_name] = count

    # 4. Overall compliance score calculation
    # Score = % of tasks that are completed. If no tasks, defaults to 100.
    overall_compliance_score = 100.0
    if total_tasks > 0:
        completed_tasks = tasks_by_status.get("Completed", 0)
        overall_compliance_score = float((completed_tasks / total_tasks) * 100)
    # Clamp between 0 and 100
    overall_compliance_score = round(max(0.0, min(100.0, overall_compliance_score)), 1)

    # 5. Recent task and regulation feeds
    recent_tasks = db.query(models.ComplianceTask).order_by(models.ComplianceTask.created_at.desc()).limit(5).all()
    recent_regulations = db.query(models.Regulation).order_by(models.Regulation.created_at.desc()).limit(5).all()

    return schemas.DashboardMetricsResponse(
        overall_compliance_score=overall_compliance_score,
        total_regulations=total_regulations,
        total_obligations=total_obligations,
        total_tasks=total_tasks,
        tasks_by_status=tasks_by_status,
        obligations_by_risk=obligations_by_risk,
        gaps_count=gaps_count,
        recent_tasks=recent_tasks,
        recent_regulations=recent_regulations
    )


@router.get("/risk-timeline")
def get_risk_timeline(db: Session = Depends(get_db)):
    """
    Returns all recorded risk score snapshots ordered by time (ascending).
    Used to render the Live Risk Score Timeline chart.
    """
    snapshots = crud.get_risk_snapshots(db, limit=90)
    return [
        {
            "score": s.score,
            "total_obligations": s.total_obligations,
            "completed_tasks": s.completed_tasks,
            "total_tasks": s.total_tasks,
            "open_gaps": s.open_gaps,
            "recorded_at": s.recorded_at.isoformat() if s.recorded_at else None,
        }
        for s in snapshots
    ]


@router.post("/snapshot")
def create_snapshot(db: Session = Depends(get_db)):
    """
    Computes current compliance metrics from the live DB state and saves a new RiskSnapshot.
    Returns the newly created snapshot.
    """
    total_obligations = db.query(models.Obligation).count()
    total_tasks = db.query(models.ComplianceTask).count()
    completed_tasks = (
        db.query(models.ComplianceTask)
        .filter(models.ComplianceTask.status == "Completed")
        .count()
    )
    open_gaps = (
        db.query(models.GapAnalysis)
        .filter(models.GapAnalysis.status != "Mitigated")
        .count()
    )

    # Score = percentage of tasks completed, clamped 0-100
    if total_tasks > 0:
        score = round((completed_tasks / total_tasks) * 100, 1)
    else:
        score = 100.0

    snapshot = crud.create_risk_snapshot(
        db,
        score=score,
        total_obligations=total_obligations,
        completed_tasks=completed_tasks,
        total_tasks=total_tasks,
        open_gaps=open_gaps,
    )

    return {
        "score": snapshot.score,
        "total_obligations": snapshot.total_obligations,
        "completed_tasks": snapshot.completed_tasks,
        "total_tasks": snapshot.total_tasks,
        "open_gaps": snapshot.open_gaps,
        "recorded_at": snapshot.recorded_at.isoformat() if snapshot.recorded_at else None,
    }


@router.get("/department-heatmap")
def get_department_heatmap(db: Session = Depends(get_db)):
    """
    Groups obligations by category (department), joins with tasks, and computes
    per-category obligation/task metrics and a risk score.
    risk_score = (overdue*3 + pending*1) / max(total_obligations, 1), normalized 0-10
    """
    today = date.today()

    # Fetch all obligations
    obligations = db.query(models.Obligation).all()

    # Group by category
    category_map: dict = {}
    for ob in obligations:
        cat = ob.category or "Uncategorized"
        if cat not in category_map:
            category_map[cat] = {"obligation_ids": [], "total_obligations": 0}
        category_map[cat]["obligation_ids"].append(ob.id)
        category_map[cat]["total_obligations"] += 1

    result = []
    for cat, info in category_map.items():
        ob_ids = info["obligation_ids"]

        # Fetch all tasks for obligations in this category
        tasks = (
            db.query(models.ComplianceTask)
            .filter(models.ComplianceTask.obligation_id.in_(ob_ids))
            .all()
        )

        completed = sum(1 for t in tasks if t.status == "Completed")
        pending = sum(1 for t in tasks if t.status in ("Pending", "In_Progress", "Under_Review"))
        overdue = sum(
            1
            for t in tasks
            if t.due_date and t.due_date < today and t.status != "Completed"
        )

        total_obligations = info["total_obligations"]
        raw_risk = (overdue * 3 + pending * 1) / max(total_obligations, 1)
        # Normalize to 0-10 scale, cap at 10
        risk_score = round(min(raw_risk, 10.0), 2)

        result.append(
            {
                "department": cat,
                "total_obligations": total_obligations,
                "completed": completed,
                "pending": pending,
                "overdue": overdue,
                "risk_score": risk_score,
            }
        )

    # Sort by risk_score descending (highest risk first)
    result.sort(key=lambda x: x["risk_score"], reverse=True)
    return result
