from .embeddings import EmbeddingsManager
from .vector_store import VectorStoreManager

class Retriever:
    def __init__(self, vector_store: VectorStoreManager, embeddings_manager: EmbeddingsManager):
        self.vector_store = vector_store
        self.embeddings_manager = embeddings_manager
        # Ensure our regulations collection exists
        self.collection = self.vector_store.get_or_create_collection("regulations")

    def retrieve(self, query: str, regulation_id: int = None, limit: int = 4) -> list:
        """
        Takes a text query, embeds it, queries the collection, and formats results.
        Supports filtering by regulation_id.
        """
        if not query:
            return []

        query_vector = self.embeddings_manager.get_embedding(query)
        
        # Build metadata filter
        where_clause = {}
        if regulation_id is not None:
            where_clause["regulation_id"] = regulation_id

        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=limit,
            where=where_clause if where_clause else None
        )

        formatted_results = []
        if results and "documents" in results and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            ids = results["ids"][0]
            # Handle distance calculations safely
            dists = results.get("distances", [[0.0] * len(docs)])[0]

            for idx in range(len(docs)):
                formatted_results.append({
                    "id": ids[idx],
                    "text": docs[idx],
                    "metadata": metas[idx],
                    "score": float(1.0 - dists[idx]) # Cosine similarity score
                })

        return formatted_results
