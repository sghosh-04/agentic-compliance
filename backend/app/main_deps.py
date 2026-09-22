import os
from .services.ai_service import AIService
from .rag.pipeline import RAGPipeline
from .agents.orchestrator import ComplianceOrchestrator

# Initialize global shared instances
# Chroma DB Path defaults to the persisted directory path
chroma_path = os.getenv("CHROMA_DB_PATH", "../chroma_db")

ai_service_instance = AIService()
rag_pipeline_instance = RAGPipeline(db_path=chroma_path)
orchestrator_instance = ComplianceOrchestrator(ai_service_instance, rag_pipeline_instance)

def get_ai_service() -> AIService:
    return ai_service_instance

def get_rag_pipeline() -> RAGPipeline:
    return rag_pipeline_instance

def get_orchestrator() -> ComplianceOrchestrator:
    return orchestrator_instance
