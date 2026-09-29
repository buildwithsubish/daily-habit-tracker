"""Lightweight client library for the WhatsApp Automation Server (whatsapp_server.py)."""

from wa_client.client import WhatsAppServerClient
from wa_client.config import Settings, get_settings

__version__ = "1.0.0"
from wa_client.reporting import ExecutionReport, ExecutionTracker, send_execution_report

__all__ = [
    "WhatsAppServerClient",
    "Settings",
    "get_settings",
    "ExecutionTracker",
    "ExecutionReport",
    "send_execution_report",
]