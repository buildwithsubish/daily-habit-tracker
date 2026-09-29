"""Execution tracking and WhatsApp report delivery (recipients from caller/MongoDB only)."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Set

from wa_client.client import WhatsAppServerClient
from wa_client.config import Settings, get_settings
from wa_client.logging import setup_logging
from wa_client.models import TaskStats


@dataclass
class ExecutionReport:
    label: str
    stats: TaskStats
    execution_time_sec: float
    errors: List[str] = field(default_factory=list)
    details: List[str] = field(default_factory=list)

    def format_message(self) -> str:
        lines = [
            "📋 *Execution Report*",
            "",
            f"*Job:* {self.label}",
            f"*Time:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            f"• Total tasks: {self.stats.total}",
            f"• Completed: {self.stats.completed}",
            f"• Failed: {self.stats.failed}",
            f"• Skipped: {self.stats.skipped}",
            f"• Running: {self.stats.running}",
            f"• Success count: {self.stats.success_count}",
            f"• Failure count: {self.stats.failure_count}",
            f"• Duration: {self.execution_time_sec:.1f}s",
        ]
        if self.details:
            lines.extend(["", "*Details:*", *[f"• {d}" for d in self.details[:15]]])
        if self.errors:
            lines.extend(["", "*Errors:*", *[f"• {e}" for e in self.errors[:10]]])
        return "\n".join(lines)


class ExecutionTracker:
    def __init__(self, label: str) -> None:
        self.label = label
        self.stats = TaskStats()
        self.errors: List[str] = []
        self.details: List[str] = []
        self._started = time.monotonic()

    def record(
        self,
        *,
        completed: int = 0,
        failed: int = 0,
        skipped: int = 0,
        running: int = 0,
        detail: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        self.stats.completed += completed
        self.stats.failed += failed
        self.stats.skipped += skipped
        self.stats.running = running
        self.stats.total = (
            self.stats.completed + self.stats.failed + self.stats.skipped + self.stats.running
        )
        if detail:
            self.details.append(detail)
        if error:
            self.errors.append(error)

    def finish(self) -> ExecutionReport:
        elapsed = time.monotonic() - self._started
        self.stats.running = 0
        self.stats.total = self.stats.completed + self.stats.failed + self.stats.skipped
        return ExecutionReport(
            label=self.label,
            stats=self.stats,
            execution_time_sec=elapsed,
            errors=list(self.errors),
            details=list(self.details),
        )


def send_execution_report(
    report: ExecutionReport,
    client: Optional[WhatsAppServerClient] = None,
    *,
    recipients: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, int]:
    """Send report via whatsapp_server.py. Recipients must be supplied by caller (from MongoDB)."""
    settings = get_settings()
    wa = client or WhatsAppServerClient(settings)
    logger = setup_logging()
    message = report.format_message()

    targets = recipients or []
    if not targets:
        logger.warning("No report recipients supplied; skipping WhatsApp delivery")
        return {"sent": 0, "failed": 0}

    seen: Set[str] = set()
    sent = 0
    failed = 0

    for target in targets:
        phone = str(target.get("phone", "")).replace(" ", "")
        contact = target.get("contact") or target.get("name") or ""
        key = phone or contact
        if not key or key in seen:
            continue
        seen.add(key)
        try:
            resp = wa.send_message(
                message,
                phone=phone or None,
                contact=contact if not phone else None,
            )
            if resp.ok and resp.body.get("success", True):
                sent += 1
            else:
                failed += 1
                report.errors.append(
                    f"Send to {target.get('name', 'recipient')}: {resp.body.get('error', resp.status_code)}"
                )
        except Exception as exc:
            failed += 1
            report.errors.append(f"Send to {target.get('name', 'recipient')}: {exc}")

    logger.info(
        "execution_report_sent label=%s sent=%s failed=%s duration=%.1fs",
        report.label,
        sent,
        failed,
        report.execution_time_sec,
    )
    return {"sent": sent, "failed": failed}