import unittest

from app.services.ai_service import AIService


class AIServiceFallbackTests(unittest.TestCase):
    def test_generate_text_returns_helpful_reply_without_gemini(self):
        service = AIService()
        service.enabled = False
        prompt = "User Query: What are the periodic re-KYC requirements?"

        reply = service.generate_text(prompt)

        self.assertIsInstance(reply, str)
        self.assertTrue(len(reply) > 0)
        self.assertNotIn("failed to generate", reply.lower())
        self.assertIn("re-kyc", reply.lower())


if __name__ == "__main__":
    unittest.main()
