import logging
from ..services.ai_service import AIService
from ..rag.prompt_templates import REGULATION_DIFF_PROMPT

logger = logging.getLogger("diff_engine")


class RegulationDiffAgent:
    def __init__(self, ai_service: AIService):
        self.ai_service = ai_service

    def run(self, reg_old: dict, reg_new: dict) -> dict:
        """
        Performs a semantic diff between two regulation versions.

        Args:
            reg_old: dict with keys 'title' and 'obligations' (list of obligation dicts)
            reg_new: dict with keys 'title' and 'obligations' (list of obligation dicts)

        Returns:
            dict with keys: changed_obligations, new_obligations, removed_obligations,
                            deadline_changes, penalty_changes, summary
        """

        def _format_obligations(obligations: list) -> str:
            lines = []
            for i, ob in enumerate(obligations, 1):
                lines.append(
                    f"{i}. [{ob.get('title', 'Untitled')}] "
                    f"Section: {ob.get('section_reference', 'N/A')} | "
                    f"Deadline: {ob.get('compliance_deadline', 'N/A')} | "
                    f"Penalty: {ob.get('penalty_description', 'N/A')[:150] if ob.get('penalty_description') else 'N/A'} | "
                    f"Description: {ob.get('description', '')[:300]}"
                )
            return "\n".join(lines) if lines else "No obligations."

        prompt = REGULATION_DIFF_PROMPT.format(
            reg_old_title=reg_old.get("title", "Older Regulation"),
            obligations_old=_format_obligations(reg_old.get("obligations", [])),
            reg_new_title=reg_new.get("title", "Newer Regulation"),
            obligations_new=_format_obligations(reg_new.get("obligations", [])),
        )

        logger.info(
            "DiffAgent: Comparing '%s' (old) vs '%s' (new)",
            reg_old.get("title"), reg_new.get("title"),
        )

        result = self.ai_service.generate_json(prompt)

        return {
            "changed_obligations": result.get("changed_obligations", []),
            "new_obligations": result.get("new_obligations", []),
            "removed_obligations": result.get("removed_obligations", []),
            "deadline_changes": result.get("deadline_changes", []),
            "penalty_changes": result.get("penalty_changes", []),
            "summary": result.get("summary", "Diff could not be completed."),
        }
