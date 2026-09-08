import json
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from ..database import get_db, crud
from ..database import schemas
from .auth import get_current_user

router = APIRouter(prefix="/export", tags=["export"])


def _serialize(obj):
    """JSON serializer for objects not serializable by default json module."""
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


@router.get("/audit-package/{regulation_id}")
def export_audit_package(
    regulation_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
):
    """
    Generates and downloads a comprehensive JSON audit package for a regulation.
    Includes: regulation metadata, obligations, tasks, evidence, gap analyses, and audit logs.
    """
    data = crud.get_audit_package_data(db, regulation_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regulation with ID {regulation_id} not found.",
        )

    reg = data["regulation"]

    def _ob_dict(ob):
        return {
            "id": ob.id,
            "title": ob.title,
            "description": ob.description,
            "section_reference": ob.section_reference,
            "category": ob.category,
            "risk_level": ob.risk_level,
            "status": ob.status,
            "compliance_deadline": ob.compliance_deadline,
            "penalty_description": ob.penalty_description,
            "created_at": ob.created_at,
        }

    def _task_dict(t):
        return {
            "id": t.id,
            "obligation_id": t.obligation_id,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date,
            "assigned_to": t.assigned_to,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
        }

    def _evidence_dict(ev):
        return {
            "id": ev.id,
            "task_id": ev.task_id,
            "title": ev.title,
            "file_path": ev.file_path,
            "status": ev.status,
            "comments": ev.comments,
            "uploaded_by": ev.uploaded_by,
            "uploaded_at": ev.uploaded_at,
        }

    def _gap_dict(g):
        return {
            "id": g.id,
            "findings": g.findings,
            "risk_assessment": g.risk_assessment,
            "recommendations": g.recommendations,
            "status": g.status,
            "created_at": g.created_at,
        }

    def _log_dict(log):
        return {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp,
        }

    package = {
        "export_metadata": {
            "exported_by": current_user.username,
            "exported_at": datetime.utcnow().isoformat(),
            "regulation_id": regulation_id,
        },
        "regulation": {
            "id": reg.id,
            "title": reg.title,
            "description": reg.description,
            "source": reg.source,
            "category": reg.category,
            "reference_url": reg.reference_url,
            "published_date": reg.published_date,
            "status": reg.status,
            "processed_at": reg.processed_at,
            "created_at": reg.created_at,
        },
        "obligations": [_ob_dict(ob) for ob in data["obligations"]],
        "tasks": [_task_dict(t) for t in data["tasks"]],
        "evidence": [_evidence_dict(ev) for ev in data["evidence"]],
        "gap_analyses": [_gap_dict(g) for g in data["gap_analyses"]],
        "audit_trail": [_log_dict(log) for log in data["audit_logs"]],
        "summary": {
            "total_obligations": len(data["obligations"]),
            "total_tasks": len(data["tasks"]),
            "total_evidence": len(data["evidence"]),
            "total_gaps": len(data["gap_analyses"]),
            "completed_tasks": sum(1 for t in data["tasks"] if t.status == "Completed"),
            "open_gaps": sum(1 for g in data["gap_analyses"] if g.status != "Mitigated"),
        },
    }

    json_bytes = json.dumps(package, default=_serialize, indent=2).encode("utf-8")

    crud.create_audit_log(
        db,
        current_user.id,
        "EXPORT_AUDIT_PACKAGE",
        f"Exported audit package for regulation '{reg.title}' (ID {regulation_id}).",
    )

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="audit_package_reg_{regulation_id}.json"'
        },
    )
