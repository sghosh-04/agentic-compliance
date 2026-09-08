import logging
import os
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from ..services.ai_service import AIService
from ..rag.pipeline import RAGPipeline
from ..database import crud, schemas, models
from ..config import REPORTS_DIR
from .document_reader import DocumentReaderAgent
from .regulation_interpreter import RegulationInterpreterAgent
from .applicability_agent import ApplicabilityAgent
from .obligation_extractor import ObligationExtractorAgent
from .task_planner import TaskPlannerAgent
from .gap_analysis import GapAnalysisAgent
from .report_generator import ReportGeneratorAgent

logger = logging.getLogger("orchestrator")

class ComplianceOrchestrator:
    def __init__(self, ai_service: AIService, rag_pipeline: RAGPipeline):
        self.ai_service = ai_service
        self.rag_pipeline = rag_pipeline
        self.reader = DocumentReaderAgent()
        self.interpreter = RegulationInterpreterAgent(self.ai_service)
        self.applicability = ApplicabilityAgent(self.ai_service)
        self.extractor = ObligationExtractorAgent(self.ai_service)
        self.planner = TaskPlannerAgent(self.ai_service)
        self.gap_analyst = GapAnalysisAgent(self.ai_service)
        self.report_generator = ReportGeneratorAgent()

    def process_document(self, db: Session, file_path: str, regulation_id: int, user_id: int = 1) -> dict:
        """
        Executes the compliance analysis pipeline for an uploaded regulation document:
        1. Parsing and cleaning the raw text content.
        2. Embedding and storing document chunks in the vector DB for RAG.
        3. Generating executive summary.
        4. Evaluating applicability scorecard.
        5. Extracting regulatory obligations list.
        6. Recommending actionable compliance tasks.
        7. Auditing operational gaps.
        8. Compiling and writing final compliance reports.
        """
        logger.info(f"Orchestrator: Beginning analysis pipeline for Regulation ID: {regulation_id}")
        
        db_regulation = crud.get_regulation(db, regulation_id)
        if not db_regulation:
            raise ValueError(f"Regulation with ID {regulation_id} not found in database.")

        try:
            # Update status to processing
            crud.update_regulation_status(db, regulation_id, "Processing")
            crud.create_audit_log(db, user_id, "START_PROCESSING", f"Started agent analysis for regulation: {db_regulation.title}")

            # Step 1: Read & Clean document
            cleaned_text = self.reader.run(file_path)
            if not cleaned_text:
                raise ValueError("No text could be extracted or OCR'ed from the document.")

            # Step 2: Index text into Vector DB for RAG
            logger.info("Orchestrator: Ingesting chunks into vector store...")
            chunks_count = self.rag_pipeline.ingest_document(
                text=cleaned_text,
                regulation_id=regulation_id,
                title=db_regulation.title
            )
            logger.info(f"Orchestrator: Ingested {chunks_count} chunks into Chroma DB.")

            # Step 3: Interpret Regulation (Executive Summary)
            summary_info = self.interpreter.run(cleaned_text)
            
            # Step 4: Evaluate Applicability
            applicability_info = self.applicability.run(
                title=db_regulation.title,
                source=db_regulation.source,
                summary=summary_info.get("summary", "")
            )

            # Update database regulation details from summary
            db_regulation.description = summary_info.get("summary", db_regulation.description)
            if summary_info.get("category"):
                db_regulation.category = summary_info.get("category")
            db.commit()

            if not applicability_info.get("applicable", True):
                # If not applicable, complete here with "Processed"
                logger.info(f"Orchestrator: Document is not applicable to our business sector. Stopping.")
                crud.update_regulation_status(db, regulation_id, "Processed", datetime.now())
                
                # Create a quick gap analysis reflecting non-applicability
                crud.create_gap_analysis(
                    db,
                    findings="This regulation was evaluated and found non-applicable to current operations.",
                    risk_assessment="No Risk. Non-applicable scope.",
                    recommendations="No action items needed.",
                    regulation_id=regulation_id,
                    status="Mitigated"
                )
                
                crud.create_audit_log(
                    db, 
                    user_id, 
                    "FINISH_PROCESSING", 
                    f"Completed analysis. Evaluated: Non-applicable. Chunks indexed: {chunks_count}"
                )
                
                return {"status": "Processed", "applicable": False, "chunks": chunks_count}

            # Step 5: Extract Obligations
            obligations_list = self.extractor.run(cleaned_text)
            db_obligations = []
            
            for ob_data in obligations_list:
                # Map date safely
                deadline_date = None
                deadline_str = ob_data.get("compliance_deadline")
                if deadline_str:
                    try:
                        deadline_date = datetime.strptime(deadline_str, "%Y-%m-%d").date()
                    except ValueError:
                        pass
                
                ob_schema = schemas.ObligationBase(
                    title=ob_data.get("title", "Regulatory Obligation"),
                    description=ob_data.get("description", ""),
                    section_reference=ob_data.get("section_reference"),
                    category=ob_data.get("category", "General"),
                    compliance_deadline=deadline_date,
                    penalty_description=ob_data.get("penalty_description"),
                    risk_level=ob_data.get("risk_level", "Medium"),
                    status="Active"
                )
                db_ob = crud.create_obligation(db, ob_schema, regulation_id=regulation_id)
                db_obligations.append(db_ob)

                # Step 6: Planner Agent suggests compliance tasks for active obligations
                suggested_tasks = self.planner.run(ob_data)
                for task_data in suggested_tasks:
                    due_date = None
                    days_ahead = task_data.get("timeline_days", 30)
                    try:
                        from datetime import date, timedelta
                        due_date = date.today() + timedelta(days=int(days_ahead))
                    except ValueError:
                        pass

                    task_schema = schemas.ComplianceTaskCreate(
                        obligation_id=db_ob.id,
                        title=task_data.get("title", f"Implement control for {db_ob.title}"),
                        description=task_data.get("description", ""),
                        assigned_to=user_id, # Assign to active user by default
                        due_date=due_date,
                        status="Pending",
                        priority=task_data.get("priority", db_ob.risk_level)
                    )
                    crud.create_task(db, task_schema)

            # Step 7: Gap Analysis Audit
            # Gather existing active tasks to perform gap audit
            all_tasks = crud.get_tasks(db, limit=50)
            existing_tasks_list = [{"title": t.title, "description": t.description, "status": t.status} for t in all_tasks]
            
            gap_info = self.gap_analyst.run(obligations_list, existing_tasks_list)
            
            # Save Gap Analysis findings to DB
            crud.create_gap_analysis(
                db,
                findings=gap_info.get("findings", "No major gaps found."),
                risk_assessment=gap_info.get("risk_assessment", "Low"),
                recommendations=gap_info.get("recommendations", ""),
                regulation_id=regulation_id,
                status=gap_info.get("status", "Identified")
            )

            # Step 8: Compile and Generate Audit Report File
            report_markdown = self.report_generator.run(
                reg_title=db_regulation.title,
                summary_data=summary_info,
                applicability_data=applicability_info,
                obligations_list=obligations_list,
                gap_data=gap_info
            )

            # Write Report to file
            REPORTS_DIR.mkdir(parents=True, exist_ok=True)
            report_file_name = f"compliance_report_reg_{regulation_id}.md"
            report_file_path = str(REPORTS_DIR / report_file_name)
            
            with open(report_file_path, "w", encoding="utf-8") as f:
                f.write(report_markdown)

            # Update final regulation status to Processed
            crud.update_regulation_status(db, regulation_id, "Processed", datetime.now())
            crud.create_audit_log(
                db, 
                user_id, 
                "FINISH_PROCESSING", 
                f"Completed analysis pipeline successfully. Obligations: {len(db_obligations)}. Chunks: {chunks_count}"
            )
            
            # Auto-record a risk snapshot to track compliance posture over time
            try:
                from ..database import models as _models
                _total_tasks = db.query(_models.ComplianceTask).count()
                _completed_tasks = db.query(_models.ComplianceTask).filter(_models.ComplianceTask.status == "Completed").count()
                _open_gaps = db.query(_models.GapAnalysis).filter(_models.GapAnalysis.status != "Mitigated").count()
                _total_obligations_db = db.query(_models.Obligation).count()
                _score = round((_completed_tasks / _total_tasks * 100), 1) if _total_tasks > 0 else 100.0
                crud.create_risk_snapshot(
                    db,
                    score=_score,
                    total_obligations=_total_obligations_db,
                    completed_tasks=_completed_tasks,
                    total_tasks=_total_tasks,
                    open_gaps=_open_gaps,
                )
            except Exception as snap_err:
                logger.warning("Could not create risk snapshot after processing: %s", snap_err)
            
            logger.info("Orchestrator: Analysis pipeline completed successfully!")
            return {
                "status": "Processed",
                "applicable": True,
                "chunks": chunks_count,
                "obligations_extracted": len(db_obligations),
                "report_path": report_file_path
            }

        except Exception as e:
            logger.error(f"Orchestrator: Error running compliance analysis pipeline: {e}", exc_info=True)
            crud.update_regulation_status(db, regulation_id, "Error")
            crud.create_audit_log(db, user_id, "ERROR_PROCESSING", f"Pipeline failed: {str(e)}")
            raise e

    def regenerate_gap_analysis_and_report(self, db: Session, regulation_id: int, user_id: int = 1) -> dict:
        """
        Re-runs the gap analysis and report generator for an existing processed regulation
        in real-time as tasks, status, or evidence changes.
        """
        logger.info(f"Orchestrator: Performing real-time gap analysis and report regeneration for Regulation ID: {regulation_id}")
        db_regulation = crud.get_regulation(db, regulation_id)
        if not db_regulation:
            logger.warning(f"Orchestrator: Regulation with ID {regulation_id} not found. Skipping real-time update.")
            return {}

        # 1. Fetch obligations from DB
        db_obs = db.query(models.Obligation).filter(models.Obligation.regulation_id == regulation_id).all()
        obligations_list = []
        for o in db_obs:
            obligations_list.append({
                "title": o.title,
                "description": o.description,
                "section_reference": o.section_reference,
                "category": o.category,
                "compliance_deadline": str(o.compliance_deadline) if o.compliance_deadline else None,
                "penalty_description": o.penalty_description,
                "risk_level": o.risk_level,
                "status": o.status
            })

        # 2. Fetch related compliance tasks to perform gap audit
        db_tasks = (
            db.query(models.ComplianceTask)
            .join(models.Obligation)
            .filter(models.Obligation.regulation_id == regulation_id)
            .all()
        )
        existing_tasks_list = [{"title": t.title, "description": t.description, "status": t.status} for t in db_tasks]

        # 3. Re-run Gap Analysis Agent
        gap_info = self.gap_analyst.run(obligations_list, existing_tasks_list)

        # 4. Save/Update Gap Analysis findings to DB
        db_gap = db.query(models.GapAnalysis).filter(models.GapAnalysis.regulation_id == regulation_id).first()
        if db_gap:
            db_gap.findings = gap_info.get("findings", "No major gaps found.")
            db_gap.risk_assessment = gap_info.get("risk_assessment", "Low")
            db_gap.recommendations = gap_info.get("recommendations", "")
            db_gap.status = gap_info.get("status", "Identified")
            db.commit()
            db.refresh(db_gap)
        else:
            crud.create_gap_analysis(
                db,
                findings=gap_info.get("findings", "No major gaps found."),
                risk_assessment=gap_info.get("risk_assessment", "Low"),
                recommendations=gap_info.get("recommendations", ""),
                regulation_id=regulation_id,
                status=gap_info.get("status", "Identified")
            )

        # 5. Re-compile and Generate Audit Report File
        summary_info = {
            "summary": db_regulation.description or "",
            "objective": "Compliance adherence audit",
            "target_audience": "Internal operations team",
            "effective_dates": "Pending validation"
        }
        
        applicability_info = {
            "applicable": True,
            "confidence_score": 1.0,
            "reasoning": "Determined applicable during document ingestion."
        }

        report_markdown = self.report_generator.run(
            reg_title=db_regulation.title,
            summary_data=summary_info,
            applicability_data=applicability_info,
            obligations_list=obligations_list,
            gap_data=gap_info
        )

        # Write Report to file (overwriting existing report file)
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        report_file_name = f"compliance_report_reg_{regulation_id}.md"
        report_file_path = str(REPORTS_DIR / report_file_name)
        
        with open(report_file_path, "w", encoding="utf-8") as f:
            f.write(report_markdown)

        # 6. Auto-record a risk snapshot to track compliance posture over time
        try:
            _total_tasks = db.query(models.ComplianceTask).count()
            _completed_tasks = db.query(models.ComplianceTask).filter(models.ComplianceTask.status == "Completed").count()
            _open_gaps = db.query(models.GapAnalysis).filter(models.GapAnalysis.status != "Mitigated").count()
            _total_obligations_db = db.query(models.Obligation).count()
            _score = round((_completed_tasks / _total_tasks * 100), 1) if _total_tasks > 0 else 100.0
            crud.create_risk_snapshot(
                db,
                score=_score,
                total_obligations=_total_obligations_db,
                completed_tasks=_completed_tasks,
                total_tasks=_total_tasks,
                open_gaps=_open_gaps,
            )
        except Exception as snap_err:
            logger.warning("Could not create risk snapshot during real-time update: %s", snap_err)

        logger.info(f"Orchestrator: Real-time update completed successfully. Report regenerated at {report_file_path}")
        return {"status": "Success", "report_path": report_file_path}
