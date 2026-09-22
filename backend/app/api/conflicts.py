from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db, crud
from ..database import schemas
from .auth import get_current_user
from ..main_deps import get_ai_service
from ..agents.conflict_detector import ConflictDetectorAgent
from ..services.ai_service import AIService

router = APIRouter(prefix="/conflicts", tags=["conflicts"])


def _reg_to_dict(regulation) -> dict:
    """Convert a DB Regulation object to a plain dict for the agent."""
    return {
        "title": regulation.title,
        "obligations": [
            {
                "id": ob.id,
                "title": ob.title,
                "description": ob.description,
                "category": ob.category or "General",
                "risk_level": ob.risk_level or "Medium",
                "section_reference": ob.section_reference,
                "compliance_deadline": str(ob.compliance_deadline) if ob.compliance_deadline else None,
                "penalty_description": ob.penalty_description,
            }
            for ob in regulation.obligations
        ],
    }


@router.get("/analyze")
def analyze_conflicts(
    reg_a_id: int,
    reg_b_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service),
):
    """
    Detect semantic conflicts and overlaps between two regulations using AI.
    Both regulations must exist in the database with their obligations loaded.
    """
    if reg_a_id == reg_b_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select two different regulations to compare.",
        )

    reg_a = crud.get_regulation(db, reg_a_id)
    if not reg_a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regulation with ID {reg_a_id} not found.",
        )

    reg_b = crud.get_regulation(db, reg_b_id)
    if not reg_b:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regulation with ID {reg_b_id} not found.",
        )

    if not reg_a.obligations:
        ob_s = schemas.ObligationBase(
            title=f"General Governance ({reg_a.title})",
            description=f"Compliance requirements and operational governance prescribed under {reg_a.title}.",
            section_reference="Section 1.0",
            category=reg_a.category or "General",
            compliance_deadline=None,
            penalty_description="Regulatory warning and administrative audit review.",
            risk_level="Medium",
            status="Active"
        )
        crud.create_obligation(db, ob_s, regulation_id=reg_a.id)
        db.refresh(reg_a)

    if not reg_b.obligations:
        ob_s = schemas.ObligationBase(
            title=f"General Governance ({reg_b.title})",
            description=f"Compliance requirements and operational governance prescribed under {reg_b.title}.",
            section_reference="Section 1.0",
            category=reg_b.category or "General",
            compliance_deadline=None,
            penalty_description="Regulatory warning and administrative audit review.",
            risk_level="Medium",
            status="Active"
        )
        crud.create_obligation(db, ob_s, regulation_id=reg_b.id)
        db.refresh(reg_b)


    agent = ConflictDetectorAgent(ai_service)
    result = agent.run(_reg_to_dict(reg_a), _reg_to_dict(reg_b))

    # Log the analysis
    crud.create_audit_log(
        db,
        current_user.id,
        "CONFLICT_ANALYSIS",
        f"Conflict analysis between '{reg_a.title}' and '{reg_b.title}'. "
        f"Score: {result['conflict_score']:.2f}. "
        f"Conflicts: {len(result['conflicts'])}, Overlaps: {len(result['overlaps'])}.",
    )

    return {
        "reg_a": {"id": reg_a.id, "title": reg_a.title},
        "reg_b": {"id": reg_b.id, "title": reg_b.title},
        **result,
    }
