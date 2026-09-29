"""Structured logging helpers for wa_client."""

from __future__ import annotations

import logging
import sys
from typing import Any

_CONFIGURED = False


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """Configure module logger once."""
    global _CONFIGURED
    logger = logging.getLogger("wa_client")
    if not _CONFIGURED:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s", "%H:%M:%S")
        )
        logger.addHandler(handler)
        logger.setLevel(level)
        _CONFIGURED = True
    return logger


def log_event(logger: logging.Logger, event: str, **fields: Any) -> None:
    """Emit a compact structured log line."""
    if fields:
        extras = " ".join(f"{k}={v!r}" for k, v in fields.items())
        logger.info("%s | %s", event, extras)
    else:
        logger.info("%s", event)