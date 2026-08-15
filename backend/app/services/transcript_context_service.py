"""
Timestamp-based context retrieval.

V1 deliberately avoids embeddings / vector search / RAG. Instead it takes a
simple, cheap, and predictable approach: given the timestamp a question was
asked at, return the transcript segments that fall within a window around
that timestamp. See section 36 of the product spec for how this can evolve
into hybrid (timestamp + semantic) retrieval later.
"""
from typing import List

from app.core.logging_config import get_logger
from app.schemas.video import TranscriptSegment
from app.services.youtube_utils import format_timestamp

logger = get_logger(__name__)


def get_context_window(
    segments: List[TranscriptSegment],
    timestamp: float,
    window_seconds: int = 60,
) -> List[TranscriptSegment]:
    """
    Return transcript segments whose time range overlaps
    [timestamp - window_seconds, timestamp + window_seconds].

    Safely narrows near the start/end of the video since the window simply
    won't find segments outside the transcript's own range.
    """
    lower = max(0.0, timestamp - window_seconds)
    upper = timestamp + window_seconds

    window = [
        seg for seg in segments
        if (seg.start + seg.duration) >= lower and seg.start <= upper
    ]

    # Guarantee at least *something* is returned even if the video has very
    # sparse segments and none technically overlap (e.g. long single-line
    # captions) -- fall back to the closest few segments by start time.
    if not window and segments:
        window = sorted(segments, key=lambda s: abs(s.start - timestamp))[:5]
        window.sort(key=lambda s: s.start)

    return window


def format_context_for_prompt(segments: List[TranscriptSegment]) -> str:
    """Render segments as timestamp-tagged lines for the Gemini prompt."""
    lines = [f"[{format_timestamp(seg.start)}] {seg.text}" for seg in segments]
    return "\n".join(lines)
