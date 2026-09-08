from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db, crud
from ..database import schemas
from .auth import get_current_user
from ..main_deps import get_ai_service
from ..agents.diff_engine import RegulationDiffAgent
from ..services.ai_service import AIService

router = APIRouter(prefix="/diff", tags=["diff"])


def _reg_to_dict(regulation) -> dict:
    """Convert a DB Regulation object to a plain dict for the agent."""
    return {
        "title": regulation.title,
        "obligations": [
            {
                "id": ob.id,
                "title": ob.title,
                "description": ob.description,
                "section_reference": ob.section_reference,
                "category": ob.category or "General",
                "risk_level": ob.risk_level or "Medium",
                "compliance_deadline": str(ob.compliance_deadline) if ob.compliance_deadline else None,
                "penalty_description": ob.penalty_description,
            }
            for ob in regulation.obligations
        ],
    }


@router.get("/compare")
def compare_regulations(
    reg_old_id: int,
    reg_new_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service),
):
    """
    Perform a semantic diff between two regulation versions using AI.
    Returns changed obligations, new obligations, removed obligations,
    deadline changes, and penalty changes.
    """
    if reg_old_id == reg_new_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select two different regulations to compare.",
        )

    reg_old = crud.get_regulation(db, reg_old_id)
    if not reg_old:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regulation with ID {reg_old_id} not found.",
        )

    reg_new = crud.get_regulation(db, reg_new_id)
    if not reg_new:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regulation with ID {reg_new_id} not found.",
        )

    if not reg_old.obligations:
        ob_s = schemas.ObligationBase(
            title=f"General Governance ({reg_old.title})",
            description=f"Compliance requirements and operational governance prescribed under {reg_old.title}.",
            section_reference="Section 1.0",
            category=reg_old.category or "General",
            compliance_deadline=None,
            penalty_description="Regulatory warning and administrative audit review.",
            risk_level="Medium",
            status="Active"
        )
        crud.create_obligation(db, ob_s, regulation_id=reg_old.id)
        db.refresh(reg_old)

    if not reg_new.obligations:
        ob_s = schemas.ObligationBase(
            title=f"General Governance ({reg_new.title})",
            description=f"Compliance requirements and operational governance prescribed under {reg_new.title}.",
            section_reference="Section 1.0",
            category=reg_new.category or "General",
            compliance_deadline=None,
            penalty_description="Regulatory warning and administrative audit review.",
            risk_level="Medium",
            status="Active"
        )
        crud.create_obligation(db, ob_s, regulation_id=reg_new.id)
        db.refresh(reg_new)


    agent = RegulationDiffAgent(ai_service)
    result = agent.run(_reg_to_dict(reg_old), _reg_to_dict(reg_new))

    crud.create_audit_log(
        db,
        current_user.id,
        "REGULATION_DIFF",
        f"Semantic diff: '{reg_old.title}' (old) vs '{reg_new.title}' (new). "
        f"Changed: {len(result['changed_obligations'])}, "
        f"New: {len(result['new_obligations'])}, "
        f"Removed: {len(result['removed_obligations'])}.",
    )

    return {
        "reg_old": {"id": reg_old.id, "title": reg_old.title},
        "reg_new": {"id": reg_new.id, "title": reg_new.title},
        **result,
    }
