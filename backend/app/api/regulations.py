from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List
import os
from ..database import get_db, crud, schemas
from ..config import REPORTS_DIR
from .auth import get_current_user
from ..main_deps import get_ai_service, get_orchestrator

router = APIRouter(prefix="/regulations", tags=["regulations"])

@router.get("", response_model=List[schemas.RegulationResponse])
def read_regulations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Fetches the catalog of all ingested regulations.
    """
    return crud.get_regulations(db, skip=skip, limit=limit)

@router.get("/{regulation_id}", response_model=schemas.RegulationResponse)
def read_regulation(regulation_id: int, db: Session = Depends(get_db)):
    """
    Retrieves detailed metadata for a single regulation, including extracted obligations.
    """
    db_regulation = crud.get_regulation(db, regulation_id=regulation_id)
    if not db_regulation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Regulation not found"
        )
    return db_regulation

@router.post("/{regulation_id}/generate-report")
def generate_regulation_report(
    regulation_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Triggers on-demand AI generation of a compliance audit report for a regulation.
    Saves the Markdown report to disk and returns its content.
    """
    db_regulation = crud.get_regulation(db, regulation_id=regulation_id)
    if not db_regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")
    if db_regulation.status != "Processed":
        raise HTTPException(
            status_code=400,
            detail="Regulation must be fully processed before generating a report."
        )

    ai_service = get_ai_service()

    # Gather obligations for this regulation
    obligations = crud.get_obligations_by_regulation(db, regulation_id)
    obligations_text = ""
    for i, ob in enumerate(obligations, 1):
        obligations_text += (
            f"\n{i}. **{ob.title}** [{ob.risk_level} Risk]\n"
            f"   - Description: {ob.description}\n"
            f"   - Section: {ob.section_reference or 'General'}\n"
            f"   - Deadline: {ob.compliance_deadline or 'Ongoing'}\n"
            f"   - Penalty: {ob.penalty_description or 'None specified'}\n"
            f"   - Tasks Assigned: {len(ob.tasks)}\n"
        )

    # Gather gap analyses
    gaps = crud.get_gap_analyses_by_regulation(db, regulation_id)
    gaps_text = ""
    for i, gap in enumerate(gaps, 1):
        gaps_text += (
            f"\n{i}. **Gap #{gap.id}** [{gap.status}]\n"
            f"   - Findings: {gap.findings}\n"
            f"   - Risk: {gap.risk_assessment}\n"
            f"   - Recommendations: {gap.recommendations}\n"
        )

    prompt = f"""
Generate a professional compliance audit report in Markdown format for the following regulation.

REGULATION DETAILS:
- Title: {db_regulation.title}
- Source: {db_regulation.source}
- Category: {db_regulation.category or 'General'}
- Published: {db_regulation.published_date or 'Unknown'}
- Description: {db_regulation.description or 'No description provided.'}

OBLIGATIONS EXTRACTED ({len(obligations)} total):
{obligations_text if obligations_text else "No obligations extracted yet."}

GAP ANALYSES ({len(gaps)} total):
{gaps_text if gaps_text else "No gap analyses conducted yet."}

Generate a detailed compliance audit report with:
1. Executive Summary
2. Regulatory Background
3. Obligations Matrix Summary
4. Compliance Gap Analysis
5. Risk Assessment
6. Recommended Action Plan
7. Conclusion

Format it professionally in Markdown with headers, tables where appropriate, and clear action items.
"""
    
    report_content = ai_service.generate_text(prompt)

    # Save to disk
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file_name = f"compliance_report_reg_{regulation_id}.md"
    report_file_path = REPORTS_DIR / report_file_name
    
    with open(report_file_path, "w", encoding="utf-8") as f:
        f.write(report_content)

    crud.create_audit_log(
        db,
        current_user.id,
        "GENERATE_REPORT",
        f"Generated compliance report for regulation: {db_regulation.title}"
    )

    return Response(
        content=report_content,
        media_type="text/markdown"
    )

@router.get("/{regulation_id}/report")
def get_regulation_report(
    regulation_id: int, 
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Downloads the existing Markdown compliance audit report for a regulation.
    If the report file does not exist on disk yet, it compiles and saves it automatically.
    """
    db_regulation = crud.get_regulation(db, regulation_id=regulation_id)
    if not db_regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")
        
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file_name = f"compliance_report_reg_{regulation_id}.md"
    report_file_path = REPORTS_DIR / report_file_name
    
    if not report_file_path.exists():
        from ..agents.report_generator import ReportGeneratorAgent
        report_gen = ReportGeneratorAgent()
        
        summary_info = {
            "summary": db_regulation.description or f"Executive summary for {db_regulation.title}",
            "category": db_regulation.category or "General"
        }
        applicability_info = {
            "applicable": True,
            "reasoning": "Applicable to organizational compliance governance."
        }
        
        obligations_list = [
            {
                "title": o.title,
                "description": o.description,
                "section_reference": o.section_reference,
                "category": o.category,
                "compliance_deadline": str(o.compliance_deadline) if o.compliance_deadline else None,
                "penalty_description": o.penalty_description,
                "risk_level": o.risk_level
            }
            for o in db_regulation.obligations
        ]
        
        gaps_info = {
            "findings": "Operational compliance review conducted across extracted obligations.",
            "risk_assessment": "Managed",
            "recommendations": "Enforce continuous control testing and audit log verification."
        }
        
        report_markdown = report_gen.run(
            reg_title=db_regulation.title,
            summary_data=summary_info,
            applicability_data=applicability_info,
            obligations_list=obligations_list,
            gap_data=gaps_info
        )
        
        with open(report_file_path, "w", encoding="utf-8") as f:
            f.write(report_markdown)

    return FileResponse(
        str(report_file_path), 
        media_type="text/markdown", 
        filename=f"compliance_report_{regulation_id}.md"
    )


@router.post("/{regulation_id}/process")
def process_regulation_now(
    regulation_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Manually triggers or re-triggers the multi-agent pipeline for an ingested regulation.
    """
    db_regulation = crud.get_regulation(db, regulation_id=regulation_id)
    if not db_regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")
        
    file_path = db_regulation.file_path or f"./app/storage/uploads/{db_regulation.title}.pdf"
    
    orchestrator = get_orchestrator()
    result = orchestrator.process_document(
        db=db,
        file_path=file_path,
        regulation_id=regulation_id,
        user_id=current_user.id
    )
    return result

@router.delete("/{regulation_id}")
def delete_regulation(
    regulation_id: int, 
    db: Session = Depends(get_db),
    current_user: schemas.UserResponse = Depends(get_current_user)
):
    """
    Removes a regulation and its associated obligations and tasks from the database.
    """
    db_regulation = crud.get_regulation(db, regulation_id=regulation_id)
    if not db_regulation:
        raise HTTPException(status_code=404, detail="Regulation not found")
        
    db.delete(db_regulation)
    db.commit()
    return {"detail": "Regulation and related records deleted successfully."}

