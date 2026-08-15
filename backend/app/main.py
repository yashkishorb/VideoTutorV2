import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import chat, health, video
from app.core.config import get_settings
from app.core.logging_config import configure_logging, get_logger

settings = get_settings()
configure_logging(settings.environment)
logger = get_logger(__name__)

app = FastAPI(
    title="VideoTutor API",
    description="Backend for VideoTutor -- an AI tutor for YouTube educational videos.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(video.router)
app.include_router(chat.router)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Friendly, consistent error shape. Never leak stack traces to clients.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled exception on %s: %s", request.url.path, type(exc).__name__)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("VideoTutor backend starting up (environment=%s)", settings.environment)
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY is not set -- /api/chat will fail until it is configured.")
