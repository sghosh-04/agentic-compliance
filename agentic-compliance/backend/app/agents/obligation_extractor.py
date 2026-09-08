import logging
from ..services.ai_service import AIService
from ..rag.prompt_templates import OBLIGATION_EXTRACTOR_PROMPT

logger = logging.getLogger("obligation_extractor")

class ObligationExtractorAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, text: str) -> list:
        """
        Scans regulatory text for directives, mandates, penalties, and compliance limits.
        """
        logger.info("Obligation Extractor Agent: Extracting directives...")
        # Use first 15000 characters to prevent token limits on standard LLM calls
        sample_text = text[:15000]
        prompt = OBLIGATION_EXTRACTOR_PROMPT.format(text=sample_text)
        
        result = self.ai_service.generate_json(prompt)
        obligations = result.get("obligations", [])
        logger.info(f"Obligation Extractor Agent: Successfully extracted {len(obligations)} obligations.")
        return obligations
