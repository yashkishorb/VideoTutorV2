from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.core.logging_config import get_logger
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.gemini_service import GeminiQuotaError, GeminiServiceError, gemini_service
from app.services.transcript_context_service import format_context_for_prompt, get_context_window
from app.services.youtube_utils import format_timestamp

logger = get_logger(__name__)
router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    settings = get_settings()
    logger.info(
        "chat request received video_id=%s timestamp=%.1f question_length=%d",
        payload.videoId,
        payload.timestamp,
        len(payload.question),
    )

    if len(payload.question) > settings.max_question_length:
        raise HTTPException(status_code=400, detail="Question is too long.")

    # Transcript context is supplementary, not required. Prefer context the
    # frontend already narrowed down; otherwise derive it from the full
    # transcript if provided. If neither is available (extraction failed,
    # or the frontend simply has nothing yet), the AI still answers using
    # conversation history and general knowledge -- it is never blocked on
    # transcript availability.
    context_segments = []
    if payload.transcriptContext:
        context_segments = payload.transcriptContext
    elif payload.fullTranscript:
        context_segments = get_context_window(
            payload.fullTranscript,
            payload.timestamp,
            window_seconds=settings.transcript_context_window_seconds,
        )

    context_text = format_context_for_prompt(context_segments) if context_segments else None

    try:
        answer = gemini_service.answer_question(
            video_id=payload.videoId,
            timestamp=payload.timestamp,
            question=payload.question,
            transcript_context=context_text,
            video_title=payload.videoTitle,
            conversation_history=payload.conversationHistory,
        )
    except GeminiQuotaError as exc:
        raise HTTPException(status_code=429, detail=str(exc))
    except GeminiServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return ChatResponse(
        answer=answer,
        timestamp=payload.timestamp,
        timestampFormatted=format_timestamp(payload.timestamp),
    )
