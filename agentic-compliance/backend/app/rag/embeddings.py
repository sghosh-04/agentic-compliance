import os
import logging
import numpy as np
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("embeddings")


class EmbeddingsManager:
    def __init__(self):
        self.model = None
        self.model_type = "mock"

        try:
            from sentence_transformers import SentenceTransformer

            # Store model cache locally
            cache_dir = os.path.abspath(
                os.path.join(
                    os.path.dirname(__file__),
                    "..",
                    "storage",
                    ".cache"
                )
            )

            os.makedirs(cache_dir, exist_ok=True)
            os.environ["SENTENCE_TRANSFORMERS_HOME"] = cache_dir

            print("Loading SentenceTransformer model...")

            self.model = SentenceTransformer(
                "all-MiniLM-L6-v2",
                cache_folder=cache_dir
            )

            self.model_type = "local"

            print("[SUCCESS] SentenceTransformer loaded successfully.")
            logger.info("SentenceTransformer initialized.")

        except Exception as e:
            self.model_type = "mock"

            print(f"[ERROR] Failed to load SentenceTransformer: {e}")
            print("[WARNING] Falling back to mock embeddings.")

            logger.error(e)

    def get_embedding(self, text: str) -> list:
        """
        Generate embedding for a single text.
        """

        if not text:
            text = "empty"

        if self.model_type == "local":
            try:
                embedding = self.model.encode(
                    text,
                    convert_to_numpy=True
                )

                print(f"Generated embedding ({len(embedding)} dimensions)")

                return embedding.tolist()

            except Exception as e:
                print(f"Embedding generation failed: {e}")
                logger.error(e)

        # Mock embedding
        h = hash(text)

        np.random.seed(abs(h) % (2**32 - 1))

        vec = np.random.randn(384)

        norm = np.linalg.norm(vec)

        if norm > 0:
            vec = vec / norm

        return vec.tolist()

    def get_embeddings(self, texts: list) -> list:
        """
        Generate embeddings for multiple text chunks.
        """

        print("=" * 60)
        print("Embedding Pipeline Started")
        print("=" * 60)

        print(f"Received {len(texts)} chunks")

        if len(texts) == 0:
            print("[ERROR] No chunks received.")
            return []

        print(f"Embedding Mode: {self.model_type}")

        if self.model_type == "local":
            try:

                embeddings = self.model.encode(
                    texts,
                    convert_to_numpy=True,
                    show_progress_bar=True
                )

                embeddings = embeddings.tolist()

                print(f"[SUCCESS] Generated {len(embeddings)} embeddings")

                print(f"Embedding Dimension: {len(embeddings[0])}")

                print("=" * 60)

                return embeddings

            except Exception as e:

                print(f"[ERROR] Embedding Error: {e}")

                logger.error(e)

        print("[WARNING] Using Mock Embeddings")

        mock_embeddings = [
            self.get_embedding(text)
            for text in texts
        ]

        print(f"Generated {len(mock_embeddings)} mock embeddings")

        print("=" * 60)

        return mock_embeddings