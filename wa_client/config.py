"""Application settings — loaded once from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from typing import List

try:
    from dotenv import load_dotenv

    load_dotenv(dotenv_path=".env.local")
except ImportError:
    pass


@dataclass(frozen=True)
class Settings:
    """Validated configuration for wa_client."""

    server_url: str = "http://127.0.0.1:8000"
    session_id: str = "default"
    request_timeout: int = 120
    mongodb_uri: str = ""
    db_name: str = "daily-habit-tracker"

    def __post_init__(self) -> None:
        if self.request_timeout < 5:
            raise ValueError("request_timeout must be >= 5 seconds")
        if not self.server_url.startswith("http"):
            raise ValueError("server_url must be an http(s) URL")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return singleton settings loaded from environment."""
    port = os.getenv("WHATSAPP_SERVER_PORT", "8000")
    default_url = f"http://127.0.0.1:{port}"
    return Settings(
        server_url=os.getenv("WHATSAPP_SERVER_URL", default_url).rstrip("/"),
        session_id=os.getenv("ADMIN_ID", os.getenv("ADMIN_SESSION_ID", "default")),
        request_timeout=int(os.getenv("WA_CLIENT_TIMEOUT", "120")),
        mongodb_uri=os.getenv("MONGODB_URI", ""),
        db_name=os.getenv("DB_NAME", "daily-habit-tracker"),
    )