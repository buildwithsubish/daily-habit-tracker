"""Typed models for WhatsApp server API payloads and responses."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ApiResponse:
    status_code: int
    body: Dict[str, Any]

    @property
    def ok(self) -> bool:
        return 200 <= self.status_code < 300

    def get(self, key: str, default: Any = None) -> Any:
        return self.body.get(key, default)


@dataclass
class SendMessagePayload:
    session_id: str
    message: str
    phone: Optional[str] = None
    contact: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "session_id": self.session_id,
            "message": self.message,
        }
        if self.phone:
            data["phone"] = self.phone
        if self.contact:
            data["contact"] = self.contact
        return data


@dataclass
class CreatePollPayload:
    session_id: str
    contact: str
    question: str
    options: List[str]
    allow_multiple: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "contact": self.contact,
            "question": self.question,
            "options": self.options,
            "allow_multiple": self.allow_multiple,
        }


@dataclass
class PollQueryPayload:
    session_id: str
    contact: str
    question: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {"session_id": self.session_id, "contact": self.contact}
        if self.question:
            data["question"] = self.question
        return data


@dataclass
class TaskStats:
    total: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    running: int = 0

    @property
    def success_count(self) -> int:
        return self.completed

    @property
    def failure_count(self) -> int:
        return self.failed