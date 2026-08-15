"""
Application configuration.

All configuration is loaded from environment variables (via a .env file in
local development). Nothing here is hardcoded so that model names, API keys,
and deployment URLs can change without touching application code.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # Server
    port: int = 8000
    environment: str = "development"

    # Cost / safety controls
    max_question_length: int = 500
    max_conversation_history_messages: int = 8
    transcript_context_window_seconds: int = 60

    @property
    def allowed_origins(self) -> List[str]:
        # Support a comma separated list in FRONTEND_ORIGIN for multiple
        # deployed frontends (e.g. staging + production).
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
