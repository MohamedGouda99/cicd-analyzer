from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- Supabase ---
    supabase_url: str
    supabase_key: str

    # --- OpenAI ---
    openai_api_key: str
    openai_model: str = "gpt-4o"

    # --- GitHub ---
    github_token: str
    github_webhook_secret: str

    # --- App ---
    app_name: str = "CI/CD Pipeline Analyzer"
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    log_level: str = "INFO"


settings = Settings()  # type: ignore[call-arg]
