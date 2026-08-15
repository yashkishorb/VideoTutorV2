from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class TranscriptSegment(BaseModel):
    start: float = Field(..., description="Start time of the segment in seconds")
    duration: float = Field(..., description="Duration of the segment in seconds")
    text: str = Field(..., description="Transcript text for the segment")


class VideoAnalyzeRequest(BaseModel):
    youtubeUrl: str = Field(..., min_length=1, max_length=2048)

    @field_validator("youtubeUrl")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("youtubeUrl must not be empty")
        return v.strip()


class VideoAnalyzeResponse(BaseModel):
    videoId: str
    title: Optional[str] = None
    transcript: List[TranscriptSegment]
    transcriptAvailable: bool = True
    transcriptLanguage: Optional[str] = None
