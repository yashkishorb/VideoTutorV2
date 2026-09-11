"""
Transcript extraction service.

Uses youtube-transcript.ai as the transcript source because direct
YouTube transcript requests can be blocked when the backend runs
from a cloud provider such as Render.

The rest of the application remains independent of the transcript
provider.
"""

from dataclasses import dataclass
from typing import List, Optional
import re

import httpx

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

    def get_transcript(self, video_id: str) -> TranscriptResult:
        cached = self._cache.get(video_id)

        if cached is not None:
            logger.info("transcript cache hit video_id=%s", video_id)
            return cached

        logger.info(
            "transcript fetch started video_id=%s provider=youtube-transcript.ai",
            video_id,
        )

        url = f"https://youtube-transcript.ai/transcript/{video_id}.txt"

        try:
            response = httpx.get(
                url,
                timeout=20.0,
                follow_redirects=True,
            )

            logger.info(
                "transcript provider response video_id=%s status=%s",
                video_id,
                response.status_code,
            )

            if response.status_code == 404:
                raise VideoUnavailableError(
                    "The video could not be found or is unavailable."
                )

            response.raise_for_status()

            text = response.text.strip()

            if not text:
                raise TranscriptUnavailableError(
                    "The transcript returned by the provider was empty."
                )

            segments = self._parse_transcript(text)

            if not segments:
                raise TranscriptUnavailableError(
                    "Could not parse the transcript returned by the provider."
                )

            result = TranscriptResult(
                segments=segments,
                language=None,
            )

            self._cache.set(video_id, result)

            logger.info(
                "transcript fetch succeeded video_id=%s segments=%d",
                video_id,
                len(segments),
            )

            return result

        except (VideoUnavailableError, TranscriptUnavailableError):
            raise

        except httpx.HTTPStatusError as exc:
            logger.warning(
                "transcript provider HTTP error video_id=%s status=%s",
                video_id,
                exc.response.status_code,
            )
            raise TranscriptUnavailableError(
                "We couldn't access a transcript for this video."
            ) from exc

        except httpx.RequestError as exc:
            logger.warning(
                "transcript provider request failed video_id=%s error=%s",
                video_id,
                type(exc).__name__,
            )
            raise TranscriptUnavailableError(
                "We couldn't access a transcript for this video."
            ) from exc

        except Exception as exc:
            logger.warning(
                "transcript fetch failed video_id=%s error=%s",
                video_id,
                type(exc).__name__,
            )
            raise TranscriptUnavailableError(
                "We couldn't access a transcript for this video."
            ) from exc

    @staticmethod
    def _parse_transcript(text: str) -> List[TranscriptSegment]:
        """
        Parse youtube-transcript.ai timestamped transcript text.

        Example:
            [0:02] Hello everyone
            [0:15] Welcome to the video
        """

        pattern = re.compile(
            r"\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*?)(?=\n\[\d+:\d+(?:\.\d+)?\]|\Z)",
            re.DOTALL,
        )

        matches = list(pattern.finditer(text))

        segments: List[TranscriptSegment] = []

        for index, match in enumerate(matches):
            minutes = int(match.group(1))
            seconds = float(match.group(2))
            start = minutes * 60 + seconds

            transcript_text = " ".join(
                match.group(3).split()
            ).strip()

            if not transcript_text:
                continue

            # Calculate duration from the next timestamp.
            if index + 1 < len(matches):
                next_match = matches[index + 1]

                next_minutes = int(next_match.group(1))
                next_seconds = float(next_match.group(2))

                next_start = next_minutes * 60 + next_seconds
                duration = max(0.1, next_start - start)
            else:
                # Last segment: give it a small fallback duration.
                duration = 2.0

            segments.append(
                TranscriptSegment(
                    start=start,
                    duration=duration,
                    text=transcript_text,
                )
            )

        return segments

    @staticmethod
    def fetch_video_title(video_id: str) -> Optional[str]:
        """
        Best-effort title lookup via YouTube's public oEmbed endpoint.
        No API key required.
        """

        try:
            resp = httpx.get(
                "https://www.youtube.com/oembed",
                params={
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "format": "json",
                },
                timeout=5.0,
            )

            if resp.status_code == 200:
                return resp.json().get("title")

        except Exception:
            logger.info(
                "title lookup failed video_id=%s",
                video_id,
            )

        return None


transcript_service = TranscriptService()