import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]

# Vercel serverless: working directory is read-only, only /tmp is writable.
_DEFAULT_DB = (
    "sqlite:////tmp/resolveiq.db"
    if os.environ.get("VERCEL")
    else "sqlite:///./resolveiq.db"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT / ".env", Path(".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    hindsight_base_url: str = "https://api.hindsight.vectorize.io"
    hindsight_api_key: str = ""
    hindsight_bank_id: str = "resolveiq-incidents"

    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"

    database_url: str = _DEFAULT_DB
    memory_provider: str = "hindsight"


@lru_cache
def get_settings() -> Settings:
    return Settings()
