import logging
from ..services.ai_service import AIService
from ..rag.prompt_templates import TASK_PLANNER_PROMPT

logger = logging.getLogger("task_planner")

class TaskPlannerAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, obligation: dict) -> list:
        """
        Suggests concrete compliance tasks for a specific obligation.
        """
        logger.info(f"Task Planner Agent: Creating tasks for obligation: {obligation.get('title')}")
        prompt = TASK_PLANNER_PROMPT.format(
            title=obligation.get("title", "Compliance Obligation"),
            description=obligation.get("description", ""),
            category=obligation.get("category", "General"),
            deadline=obligation.get("compliance_deadline", "2026-12-31"),
            risk_level=obligation.get("risk_level", "Medium")
        )
        
        result = self.ai_service.generate_json(prompt)
        tasks = result.get("tasks", [])
        logger.info(f"Task Planner Agent: Created {len(tasks)} tasks.")
        return tasks
