from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db, crud
from ..database import schemas
from .auth import get_current_user
from ..main_deps import get_ai_service
from ..rag.prompt_templates import REGULATOR_SIM_PROMPT
from ..services.ai_service import AIService

router = APIRouter(prefix="/regulator", tags=["regulator"])


class SimulateRequest(BaseModel):
    policy_text: str
    obligation_id: int


@router.post("/simulate")
def simulate_regulator(
    request: SimulateRequest,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user),
    ai_service: AIService = Depends(get_ai_service),
):
    """
    Simulate a regulator reviewing an internal policy/practice against a specific obligation.
    Returns verdict, reasoning, identified gaps, and recommendations.
    """
    obligation = crud.get_obligation(db, request.obligation_id)
    if not obligation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Obligation with ID {request.obligation_id} not found.",
        )

    if not request.policy_text or not request.policy_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="policy_text cannot be empty.",
        )

    prompt = REGULATOR_SIM_PROMPT.format(
        obligation_title=obligation.title,
        obligation_description=obligation.description,
        category=obligation.category or "General",
        risk_level=obligation.risk_level or "Medium",
        penalty=obligation.penalty_description or "Not specified",
        section_reference=obligation.section_reference or "Not specified",
        policy_text=request.policy_text[:5000],
    )

    result = ai_service.generate_json(prompt)

    verdict = result.get("verdict", "Does Not Satisfy")
    if verdict not in ("Satisfies", "Partially Satisfies", "Does Not Satisfy"):
        verdict = "Does Not Satisfy"

    crud.create_audit_log(
        db,
        current_user.id,
        "REGULATOR_SIM",
        f"Regulator simulation for obligation '{obligation.title}' (ID {obligation.id}). "
        f"Verdict: {verdict}.",
    )

    return {
        "obligation": {
            "id": obligation.id,
            "title": obligation.title,
            "category": obligation.category,
            "risk_level": obligation.risk_level,
        },
        "verdict": verdict,
        "reasoning": result.get("reasoning", "No reasoning provided."),
        "gaps": result.get("gaps", []),
        "recommendations": result.get("recommendations", []),
    }
