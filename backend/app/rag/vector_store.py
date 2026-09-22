import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger("vector_store")

class LocalJSONCollection:
    """
    Fallback vector store collection using JSON files and NumPy for cosine similarity.
    Ensures complete operational capability even if ChromaDB binaries fail to compile on target systems.
    """
    def __init__(self, name: str, db_path: str):
        self.name = name
        self.db_path = db_path
        self.file_path = os.path.join(db_path, f"{name}_store.json")
        self.data = []
        self._load()

    def _load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
                logger.info(f"Loaded {len(self.data)} chunks from local vector store: {self.name}")
            except Exception as e:
                logger.error(f"Error loading local JSON vector store: {e}")
                self.data = []

    def _save(self):
        os.makedirs(self.db_path, exist_ok=True)
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving local JSON vector store: {e}")

    def add(self, ids: List[str], embeddings: List[List[float]], metadatas: List[Dict[str, Any]], documents: List[str]):
        for idx, doc_id in enumerate(ids):
            # Check for duplicate IDs and remove
            self.data = [item for item in self.data if item["id"] != doc_id]
            self.data.append({
                "id": doc_id,
                "embedding": embeddings[idx],
                "metadata": metadatas[idx],
                "document": documents[idx]
            })
        self._save()

    def query(self, query_embeddings: List[List[float]], n_results: int = 5, where: Optional[Dict[str, Any]] = None) -> Dict[str, List]:
        query_vector = np.array(query_embeddings[0])
        
        candidates = []
        for item in self.data:
            # Metadata filter
            if where:
                match = True
                for k, v in where.items():
                    if item["metadata"].get(k) != v:
                        match = False
                        break
                if not match:
                    continue
            
            doc_vector = np.array(item["embedding"])
            
            # Cosine similarity calculations
            dot_product = np.dot(query_vector, doc_vector)
            norm_q = np.linalg.norm(query_vector)
            # Re-ensure non-zero norm
            norm_d = np.linalg.norm(doc_vector)
            
            similarity = dot_product / (norm_q * norm_d) if (norm_q > 0 and norm_d > 0) else 0.0
            candidates.append((similarity, item))

        # Sort similarity descending
        candidates.sort(key=lambda x: x[0], reverse=True)
        top_candidates = candidates[:n_results]

        return {
            "ids": [[c[1]["id"] for c in top_candidates]],
            "documents": [[c[1]["document"] for c in top_candidates]],
            "metadatas": [[c[1]["metadata"] for c in top_candidates]],
            "distances": [[float(1.0 - c[0]) for c in top_candidates]] # Chroma returns distance: 1.0 - similarity
        }


class VectorStoreManager:
    def __init__(self, db_path: str):
        self.db_path = os.path.abspath(db_path)
        self.client_type = "chroma"
        self.chroma_client = None

        try:
            import chromadb
            # Try to initialize ChromaDB Persistent Client
            logger.info(f"Initializing native ChromaDB PersistentClient at: {self.db_path}")
            self.chroma_client = chromadb.PersistentClient(path=self.db_path)
            self.client_type = "chroma"
        except Exception as e:
            logger.warning(f"Could not initialize native ChromaDB: {e}. Falling back to NumPy Vector Store.")
            self.client_type = "mock"
            os.makedirs(self.db_path, exist_ok=True)

    def get_or_create_collection(self, name: str):
        if self.client_type == "chroma":
            # Chroma collections have an internal add/query API
            return self.chroma_client.get_or_create_collection(name=name)
        else:
            return LocalJSONCollection(name=name, db_path=self.db_path)
