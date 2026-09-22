from fastapi import APIRouter, Request
from ..database import schemas
from ..main_deps import get_rag_pipeline, get_ai_service
from ..rag.prompt_templates import CHAT_PROMPT

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("", response_model=schemas.ChatResponse)
async def ask_compliance_bot(request: Request):
    """
    RAG Chat endpoint. Searches vector store for relevant context chunks matching
    the query and generates a compliance answer complete with source citations.
    """
    payload = await request.json()
    message = payload.get("message", "")
    history = payload.get("history", [])

    rag_pipeline = get_rag_pipeline()
    ai_service = get_ai_service()

    chunks = rag_pipeline.query(message, limit=4)

    context_text = ""
    for i, chunk in enumerate(chunks):
        title = chunk["metadata"].get("title", "Document Segment")
        context_text += f"[Chunk {i+1} | Source: {title}]:\n{chunk['text']}\n\n"

    history_log = ""
    for turn in history[-6:]:
        role = "User" if turn.get("role") == "user" else "Assistant"
        content = turn.get("content", "")
        history_log += f"{role}: {content}\n"

    prompt = CHAT_PROMPT.format(
        context=context_text if context_text.strip() else "No document context is available in database.",
        history=history_log,
        query=message
    )

    reply = ai_service.generate_text(prompt)

    sources_list = [{
        "id": chunk["id"],
        "text": chunk["text"],
        "title": chunk["metadata"].get("title", "Regulatory Document"),
        "score": chunk["score"]
    } for chunk in chunks]

    return schemas.ChatResponse(reply=reply, sources=sources_list)
