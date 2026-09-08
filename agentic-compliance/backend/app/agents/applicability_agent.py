import logging
from ..services.ai_service import AIService
from ..rag.prompt_templates import APPLICABILITY_PROMPT

logger = logging.getLogger("applicability_agent")

class ApplicabilityAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, title: str, source: str, summary: str, org_profile: dict = None) -> dict:
        """
        Evaluates whether a regulation applies to the organization.
        """
        logger.info("Applicability Agent: Evaluating match scorecard...")
        if not org_profile:
            # Default SEBI-regulated AMC profile
            org_profile = {
                "industry": "Financial Services (Wealth & Asset Management)",
                "org_category": "Registered Asset Management Company (AMC)",
                "scope": "Retail mutual funds distribution, institutional asset management, customer onboarding (KYC), and hosting security infrastructures."
            }

        prompt = APPLICABILITY_PROMPT.format(
            industry=org_profile.get("industry", "Financial Services"),
            org_category=org_profile.get("org_category", "Asset Management Company"),
            scope=org_profile.get("scope", "All operational divisions"),
            title=title,
            source=source,
            summary=summary
        )

        result = self.ai_service.generate_json(prompt)
        logger.info(f"Applicability Agent: Applicable={result.get('applicable', True)} Score={result.get('confidence_score', 1.0)}")
        return result
