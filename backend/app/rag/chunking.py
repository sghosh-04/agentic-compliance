def chunk_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> list:
    """
    Splits document text into logically bounded paragraphs or sentences
    while adhering to max chunk size and target overlap.
    """
    if not text:
        print("[ERROR] No text received for chunking.")
        return []

    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = min(start + chunk_size, text_len)

        if end < text_len:
            boundary = text.rfind('\n\n', start + chunk_size // 2, end)
            if boundary != -1:
                end = boundary + 2
            else:
                boundary = text.rfind('\n', start + chunk_size // 2, end)
                if boundary != -1:
                    end = boundary + 1
                else:
                    boundary = text.rfind('. ', start + chunk_size // 2, end)
                    if boundary != -1:
                        end = boundary + 2

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_len:
            break

        next_start = end - chunk_overlap
        if next_start <= start:
            start = end
        else:
            start = next_start

        if chunk_size <= chunk_overlap:
            break

    print(f"[SUCCESS] Total Chunks Created: {len(chunks)}")

    if chunks:
        print("First Chunk:")
        print(chunks[0][:300])

    return chunks