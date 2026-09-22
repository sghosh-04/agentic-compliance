import logging
import json
from ..services.ai_service import AIService
from ..rag.prompt_templates import GAP_ANALYSIS_PROMPT

logger = logging.getLogger("gap_analysis")

class GapAnalysisAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, obligations: list, current_tasks: list) -> dict:
        """
        Performs audit comparison of new obligations against current task control systems
        to detect process gaps.
        """
        logger.info("Gap Analysis Agent: Performing comparison audit...")
        
        # Serialize list items for prompt context
        formatted_obs = json.dumps([{
            "title": o.get("title"),
            "description": o.get("description"),
            "risk": o.get("risk_level")
        } for o in obligations], indent=2)

        formatted_tasks = json.dumps([{
            "title": t.get("title"),
            "description": t.get("description"),
            "status": t.get("status")
        } for t in current_tasks], indent=2)

        prompt = GAP_ANALYSIS_PROMPT.format(
            obligations=formatted_obs,
            current_tasks=formatted_tasks
        )

        result = self.ai_service.generate_json(prompt)
        logger.info(f"Gap Analysis Agent: Complete. Status={result.get('status', 'Identified')}")
        return result
