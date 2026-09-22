import logging
from ..services.ai_service import AIService
from ..rag.prompt_templates import REGULATION_INTERPRETER_PROMPT

logger = logging.getLogger("regulation_interpreter")

class RegulationInterpreterAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, cleaned_text: str) -> dict:
        """
        Analyzes the regulation text, summarizing and finding target audiences.
        """
        logger.info("Interpreter Agent: Processing regulation text...")
        # Use first 8000 characters of the text for high-level summary to avoid token issues
        sample_text = cleaned_text[:8000]
        prompt = REGULATION_INTERPRETER_PROMPT.format(text=sample_text)
        
        result = self.ai_service.generate_json(prompt)
        logger.info("Interpreter Agent: Complete.")
        return result
