import unittest
from app.rag.chunking import chunk_text

class TestChunking(unittest.TestCase):
    def test_short_text(self):
        text = "This is a short document."
        chunks = chunk_text(text, chunk_size=100, chunk_overlap=20)
        self.assertEqual(chunks, ["This is a short document."])

    def test_text_slightly_larger_than_overlap_but_smaller_than_size(self):
        text = "A" * 300
        # Should not infinite loop
        chunks = chunk_text(text, chunk_size=500, chunk_overlap=100)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], text)

    def test_text_multiple_chunks(self):
        text = "A" * 1500
        chunks = chunk_text(text, chunk_size=500, chunk_overlap=100)
        # Without boundary adjustment since it's just A's:
        # Chunk 1: [0:500]
        # Chunk 2: [400:900]
        # Chunk 3: [800:1300]
        # Chunk 4: [1200:1500]
        self.assertEqual(len(chunks), 4)

if __name__ == "__main__":
    unittest.main()
