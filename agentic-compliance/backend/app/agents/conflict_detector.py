import json
import logging
from ..services.ai_service import AIService
from ..rag.prompt_templates import CONFLICT_DETECTOR_PROMPT

logger = logging.getLogger("conflict_detector")


class ConflictDetectorAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, reg_a: dict, reg_b: dict) -> dict:
        """
        Detects semantic conflicts and overlaps between two regulations.

        Args:
            reg_a: dict with keys 'title' and 'obligations' (list of obligation dicts)
            reg_b: dict with keys 'title' and 'obligations' (list of obligation dicts)

        Returns:
            dict with keys: conflicts, overlaps, conflict_score, summary
        """
        def _format_obligations(obligations: list) -> str:
            lines = []
            for i, ob in enumerate(obligations, 1):
                lines.append(
                    f"{i}. [{ob.get('title', 'Untitled')}] "
                    f"Category: {ob.get('category', 'N/A')} | "
                    f"Risk: {ob.get('risk_level', 'N/A')} | "
                    f"Description: {ob.get('description', '')[:300]}"
                )
            return "\n".join(lines) if lines else "No obligations extracted."

        prompt = CONFLICT_DETECTOR_PROMPT.format(
            reg_a_title=reg_a.get("title", "Regulation A"),
            obligations_a=_format_obligations(reg_a.get("obligations", [])),
            reg_b_title=reg_b.get("title", "Regulation B"),
            obligations_b=_format_obligations(reg_b.get("obligations", [])),
        )

        logger.info(
            "ConflictDetector: Analyzing '%s' vs '%s'",
            reg_a.get("title"), reg_b.get("title"),
        )

        result = self.ai_service.generate_json(prompt)

        # Ensure required keys are present with safe defaults
        return {
            "conflicts": result.get("conflicts", []),
            "overlaps": result.get("overlaps", []),
            "conflict_score": float(result.get("conflict_score", 0.0)),
            "summary": result.get("summary", "Analysis could not be completed."),
        }
