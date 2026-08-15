from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.video import TranscriptSegment


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=4000)


class ChatRequest(BaseModel):
    videoId: str = Field(..., min_length=1, max_length=64)
    timestamp: float = Field(..., ge=0, description="Current YouTube player time in seconds")
    question: str = Field(..., min_length=1, max_length=500)
    videoTitle: Optional[str] = Field(None, max_length=300)
    transcriptContext: Optional[List[TranscriptSegment]] = None
    fullTranscript: Optional[List[TranscriptSegment]] = None
    conversationHistory: List[ConversationMessage] = Field(default_factory=list)

    @field_validator("question")
    @classmethod
    def question_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("question must not be empty")
        return v.strip()


class ChatResponse(BaseModel):
    answer: str
    timestamp: float
    timestampFormatted: str
