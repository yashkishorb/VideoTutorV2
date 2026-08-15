from fastapi import APIRouter, HTTPException

from app.core.logging_config import get_logger
from app.schemas.video import VideoAnalyzeRequest, VideoAnalyzeResponse
from app.services.transcript_service import (
    TranscriptUnavailableError,
    VideoUnavailableError,
    transcript_service,
)
from app.services.youtube_utils import InvalidYouTubeUrlError, extract_video_id

logger = get_logger(__name__)
router = APIRouter(tags=["video"])


@router.post("/api/video/analyze", response_model=VideoAnalyzeResponse)
def analyze_video(payload: VideoAnalyzeRequest) -> VideoAnalyzeResponse:
    logger.info("video analyze request received")

    try:
        video_id = extract_video_id(payload.youtubeUrl)
    except InvalidYouTubeUrlError:
        raise HTTPException(status_code=400, detail="That doesn't look like a valid YouTube URL.")

    try:
        result = transcript_service.get_transcript(video_id)
    except VideoUnavailableError:
        raise HTTPException(
            status_code=404,
            detail="This video is unavailable. It may be private, deleted, or region-restricted.",
        )
    except TranscriptUnavailableError:
        raise HTTPException(
            status_code=422,
            detail="We couldn't access a transcript for this video.",
        )

    title = transcript_service.fetch_video_title(video_id)

    return VideoAnalyzeResponse(
        videoId=video_id,
        title=title,
        transcript=result.segments,
        transcriptAvailable=True,
        transcriptLanguage=result.language,
    )
