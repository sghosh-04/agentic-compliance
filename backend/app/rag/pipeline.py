from typing import List, Dict, Any
from .chunking import chunk_text
from .embeddings import EmbeddingsManager
from .vector_store import VectorStoreManager
from .retriever import Retriever

class RAGPipeline:
    def __init__(self, db_path: str):
        self.embeddings = EmbeddingsManager()
        self.vector_store = VectorStoreManager(db_path)
        self.retriever = Retriever(self.vector_store, self.embeddings)
        self.collection = self.vector_store.get_or_create_collection("regulations")

    def ingest_document(self, text: str, regulation_id: int, title: str) -> int:

        print("=" * 60)
        print("RAG INGESTION STARTED")
        print("=" * 60)

        if not text:
            print("❌ No text received.")
            return 0

        print(f"Text Length: {len(text)}")

        # Chunking
        chunks = chunk_text(text)

        print(f"Chunks Created: {len(chunks)}")

        if not chunks:
            print("❌ Chunking failed.")
            return 0

        ids = [
            f"reg_{regulation_id}_chunk_{i}"
            for i in range(len(chunks))
        ]

        metadatas = [
            {
                "regulation_id": regulation_id,
                "title": title,
                "chunk_index": i
            }
            for i in range(len(chunks))
        ]

        print("Generating embeddings...")

        embeddings = self.embeddings.get_embeddings(chunks)

        print(f"Embeddings Generated: {len(embeddings)}")

        print("Saving to Vector Store...")

        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=chunks
        )

        print("✅ Saved Successfully")

        try:
            print("Collection Count:", self.collection.count())
        except Exception as e:
            print(e)

        print("=" * 60)

        return len(chunks)
   

    def query(self, text: str, regulation_id: int = None, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves top relevant chunks from the vector database.
        """
        return self.retriever.retrieve(query=text, regulation_id=regulation_id, limit=limit)
