"""
Small, dependency-free helpers for working with YouTube URLs.

Kept separate from the transcript service so URL parsing can be reused
(and unit tested) independently of transcript extraction.
"""
import re
from urllib.parse import parse_qs, urlparse


class InvalidYouTubeUrlError(ValueError):
    """Raised when a string cannot be parsed into a valid YouTube video id."""


_VIDEO_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{11}$")


def extract_video_id(url: str) -> str:
    """
    Extract an 11-character YouTube video id from a variety of URL shapes:

    - https://www.youtube.com/watch?v=VIDEOID
    - https://youtu.be/VIDEOID
    - https://www.youtube.com/embed/VIDEOID
    - https://www.youtube.com/shorts/VIDEOID
    - https://music.youtube.com/watch?v=VIDEOID
    - raw 11-character video id
    """
    candidate = url.strip()

    # Bare video id passed directly.
    if _VIDEO_ID_RE.match(candidate):
        return candidate

    if "://" not in candidate:
        candidate = "https://" + candidate

    try:
        parsed = urlparse(candidate)
    except ValueError as exc:
        raise InvalidYouTubeUrlError("Could not parse URL") from exc

    host = (parsed.hostname or "").lower().replace("www.", "").replace("m.", "")

    allowed_hosts = {"youtube.com", "youtu.be", "music.youtube.com", "youtube-nocookie.com"}
    if host not in allowed_hosts:
        raise InvalidYouTubeUrlError("URL is not a recognized YouTube domain")

    video_id = None

    if host == "youtu.be":
        video_id = parsed.path.lstrip("/").split("/")[0]
    else:
        query = parse_qs(parsed.query)
        if "v" in query and query["v"]:
            video_id = query["v"][0]
        else:
            path_parts = [p for p in parsed.path.split("/") if p]
            for marker in ("embed", "shorts", "live"):
                if marker in path_parts:
                    idx = path_parts.index(marker)
                    if idx + 1 < len(path_parts):
                        video_id = path_parts[idx + 1]
                        break

    if not video_id or not _VIDEO_ID_RE.match(video_id):
        raise InvalidYouTubeUrlError("Could not find a valid video id in the URL")

    return video_id


def format_timestamp(seconds: float) -> str:
    """Format seconds as MM:SS, or HH:MM:SS for videos over an hour."""
    total_seconds = max(0, int(round(seconds)))
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"
