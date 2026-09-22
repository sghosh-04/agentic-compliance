import json
import logging
from ..services.ai_service import AIService
from ..rag.prompt_templates import EVIDENCE_MATCHER_PROMPT

logger = logging.getLogger("evidence_matcher")


class EvidenceMatcherAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, evidence_text: str, obligations: list) -> dict:
        """
        Semantically matches evidence text against open obligations.

        Args:
            evidence_text: Extracted text from the evidence document.
            obligations: List of obligation dicts with keys id, title, description, category, risk_level.

        Returns:
            dict with keys: matches (list), summary (str)
        """
        # Truncate evidence text to avoid exceeding token limits
        truncated_text = evidence_text[:4000] if len(evidence_text) > 4000 else evidence_text

        obligations_json = json.dumps(
            [
                {
                    "id": ob.get("id"),
                    "title": ob.get("title", "Untitled"),
                    "description": ob.get("description", "")[:300],
                    "category": ob.get("category", "General"),
                    "risk_level": ob.get("risk_level", "Medium"),
                }
                for ob in obligations
            ],
            indent=2,
        )

        prompt = EVIDENCE_MATCHER_PROMPT.format(
            evidence_text=truncated_text,
            obligations_json=obligations_json,
        )

        logger.info("EvidenceMatcher: Matching evidence against %d obligations.", len(obligations))

        result = self.ai_service.generate_json(prompt)

        matches = result.get("matches", [])
        # Clamp confidence values
        for m in matches:
            try:
                m["confidence"] = max(0.0, min(1.0, float(m.get("confidence", 0.0))))
            except (TypeError, ValueError):
                m["confidence"] = 0.0

        return {
            "matches": matches,
            "summary": result.get("summary", "Matching could not be completed."),
        }
