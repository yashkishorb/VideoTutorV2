"""
Basic structured logging configuration.

IMPORTANT: never log the Gemini API key, full transcripts, or full
conversation histories. Only log high-level events (received, success,
failure) with minimal identifying context (video id, message length).
"""
import logging
import sys


def configure_logging(environment: str = "development") -> None:
    level = logging.INFO if environment == "production" else logging.DEBUG

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]

    # Quiet down noisy third-party loggers.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
