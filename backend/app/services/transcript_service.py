"""
Transcript extraction service.

This module is intentionally isolated from the AI layer: it knows nothing
about Gemini. If the underlying extraction mechanism needs to change later
(different library, an official captions API, a paid proxy to dodge IP
blocks, etc.) only this file should need to change.

Also provides a very small in-memory cache so that re-analyzing the same
video within a process's lifetime does not repeat network calls. This is
explicitly NOT a persistent cache -- see the module docstring in
core/config.py for where a Redis/Postgres cache could later be added.
"""
from dataclasses import dataclass
from typing import List, Optional

import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

from app.core.logging_config import get_logger
from app.schemas.video import TranscriptSegment

logger = get_logger(__name__)


class TranscriptUnavailableError(Exception):
    """Raised when no transcript could be retrieved for a video."""


class VideoUnavailableError(Exception):
    """Raised when the video itself cannot be found or is private/deleted."""


@dataclass
class TranscriptResult:
    segments: List[TranscriptSegment]
    language: Optional[str]


class _InMemoryTranscriptCache:
    """Very small process-local cache keyed by video id."""

    def __init__(self) -> None:
        self._store: dict[str, TranscriptResult] = {}

    def get(self, video_id: str) -> Optional[TranscriptResult]:
        return self._store.get(video_id)

    def set(self, video_id: str, result: TranscriptResult) -> None:
        self._store[video_id] = result


class TranscriptService:
    def __init__(self) -> None:
        self._cache = _InMemoryTranscriptCache()
        self._api = YouTubeTranscriptApi()

    def get_transcript(self, video_id: str) -> TranscriptResult:
        cached = self._cache.get(video_id)
        if cached is not None:
            logger.info("transcript cache hit video_id=%s", video_id)
            return cached

        logger.info("transcript fetch started video_id=%s", video_id)
        try:
            transcript_list = self._api.list(video_id)

            # Prefer a manually created transcript, fall back to a generated
            # one, in whatever language is available. Try English first for
            # a stable default, otherwise take the first available.
            transcript = None
            try:
                transcript = transcript_list.find_transcript(["en"])
            except NoTranscriptFound:
                for t in transcript_list:
                    transcript = t
                    break

            if transcript is None:
                raise NoTranscriptFound(video_id, [], transcript_list)

            fetched = transcript.fetch()
            segments = [
                TranscriptSegment(start=item.start, duration=item.duration, text=item.text)
                for item in fetched
            ]
            result = TranscriptResult(segments=segments, language=transcript.language_code)
            self._cache.set(video_id, result)
            logger.info(
                "transcript fetch succeeded video_id=%s segments=%d language=%s",
                video_id,
                len(segments),
                transcript.language_code,
            )
            return result

        except (TranscriptsDisabled, NoTranscriptFound) as exc:
            logger.info("transcript unavailable video_id=%s reason=%s", video_id, type(exc).__name__)
            raise TranscriptUnavailableError(str(exc)) from exc
        except VideoUnavailable as exc:
            logger.info("video unavailable video_id=%s", video_id)
            raise VideoUnavailableError(str(exc)) from exc
        except Exception as exc:  # noqa: BLE001 - convert unknown failures to a clean error
            logger.warning("transcript fetch failed video_id=%s error=%s", video_id, type(exc).__name__)
            raise TranscriptUnavailableError(str(exc)) from exc

    @staticmethod
    def fetch_video_title(video_id: str) -> Optional[str]:
        """Best-effort title lookup via YouTube's public oEmbed endpoint (no API key required)."""
        try:
            resp = httpx.get(
                "https://www.youtube.com/oembed",
                params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"},
                timeout=5.0,
            )
            if resp.status_code == 200:
                return resp.json().get("title")
        except Exception:  # noqa: BLE001 - title is a nice-to-have, never fatal
            logger.info("title lookup failed video_id=%s", video_id)
        return None


transcript_service = TranscriptService()
