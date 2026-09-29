"""HTTP client for whatsapp_server.py — zero extra dependencies."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from wa_client.config import Settings, get_settings
from wa_client.exceptions import WAApiError, WAConnectionError
from wa_client.logging import log_event, setup_logging
from wa_client.models import (
    ApiResponse,
    CreatePollPayload,
    PollQueryPayload,
    SendMessagePayload,
)

# Endpoints exposed by whatsapp_server.py (do not add routes here — server is external).
AVAILABLE_ROUTES = frozenset({
    "/",
    "/health",
    "/session/init",
    "/session/login",
    "/session/phone-login",
    "/session/status",
    "/session/disconnect",
    "/message/send",
    "/poll/create",
    "/poll/results",
    "/poll/vote",
    "/poll/parse-results",
    "/sessions",
    "/contact/create",
    "/contact/open-or-create",
    "/contact/check",
    "/session/data",
    "/session/save",
    "/session/load",
    "/session/set-db",
    "/screenshot",
    "/screenshots",
})


class WhatsAppServerClient:
    """Typed client for all public whatsapp_server.py HTTP endpoints."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.logger = logger or setup_logging()
        self._session_id = self.settings.session_id

    @property
    def session_id(self) -> str:
        return self._session_id

    def set_session_id(self, session_id: str) -> None:
        self._session_id = session_id

    def request(
        self,
        path: str,
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None,
        *,
        raise_on_error: bool = False,
    ) -> ApiResponse:
        if path not in AVAILABLE_ROUTES and "?" not in path:
            self.logger.warning("Endpoint %s may not exist on whatsapp_server.py", path)

        url = f"{self.settings.server_url}{path}"
        headers = {"Content-Type": "application/json"}
        payload = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)

        log_event(self.logger, "request_start", method=method, path=path)
        try:
            with urllib.request.urlopen(req, timeout=self.settings.request_timeout) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                response = ApiResponse(status_code=resp.status, body=body)
        except urllib.error.HTTPError as exc:
            try:
                body = json.loads(exc.read().decode("utf-8"))
            except Exception:
                body = {"error": exc.reason}
            response = ApiResponse(status_code=exc.code, body=body)
        except urllib.error.URLError as exc:
            raise WAConnectionError(
                f"Cannot connect to WhatsApp server at {self.settings.server_url}: {exc.reason}"
            ) from exc
        except json.JSONDecodeError as exc:
            raise WAApiError(0, "Invalid JSON response", path) from exc

        if raise_on_error and not response.ok:
            raise WAApiError(response.status_code, str(response.body), path)

        log_event(
            self.logger,
            "request_done" if response.ok else "request_failed",
            method=method,
            path=path,
            status=response.status_code,
        )
        return response

    # --- Health & session ---

    def health(self) -> ApiResponse:
        return self.request("/health")

    def root(self) -> ApiResponse:
        return self.request("/")

    def init_session(self, session_id: Optional[str] = None, timeout: int = 30) -> ApiResponse:
        sid = session_id or self._session_id
        return self.request("/session/init", "POST", {"session_id": sid, "timeout": timeout})

    def login(self, session_id: Optional[str] = None, timeout: int = 30) -> ApiResponse:
        sid = session_id or self._session_id
        return self.request("/session/login", "POST", {"session_id": sid, "timeout": timeout})

    def phone_login(
        self,
        phone_number: str,
        *,
        session_id: Optional[str] = None,
        country: str = "India",
        session_timeout: int = 120,
    ) -> ApiResponse:
        sid = session_id or self._session_id
        return self.request(
            "/session/phone-login",
            "POST",
            {
                "session_id": sid,
                "phone_number": phone_number,
                "country": country,
                "session_timeout": session_timeout,
            },
        )

    def session_status(self, session_id: Optional[str] = None) -> ApiResponse:
        sid = session_id or self._session_id
        return self.request(f"/session/status?session_id={urllib.parse.quote(sid)}")

    def disconnect(self, session_id: Optional[str] = None) -> ApiResponse:
        sid = session_id or self._session_id
        return self.request(f"/session/disconnect?session_id={urllib.parse.quote(sid)}", "POST")

    def list_sessions(self) -> ApiResponse:
        return self.request("/sessions")

    def validate_session(self, session_id: Optional[str] = None) -> ApiResponse:
        """Compatibility helper — uses /session/status since /session/validate is not exposed."""
        resp = self.session_status(session_id)
        status = str(resp.body.get("status", "unknown")).lower()
        valid = status in {"connected", "connecting"}
        return ApiResponse(
            status_code=resp.status_code,
            body={
                "success": resp.ok,
                "valid": valid,
                "status": status,
                "needs_reauth": status in {"disconnected", "failed"},
                "reason": None if valid else f"Session status: {status}",
            },
        )

    # --- Messaging ---

    def send_message(
        self,
        message: str,
        *,
        phone: Optional[str] = None,
        contact: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> ApiResponse:
        payload = SendMessagePayload(
            session_id=session_id or self._session_id,
            message=message,
            phone=phone,
            contact=contact,
        )
        return self.request("/message/send", "POST", payload.to_dict(), raise_on_error=False)

    # --- Polls ---

    def create_poll(
        self,
        contact: str,
        question: str,
        options: List[str],
        *,
        allow_multiple: bool = False,
        session_id: Optional[str] = None,
    ) -> ApiResponse:
        payload = CreatePollPayload(
            session_id=session_id or self._session_id,
            contact=contact,
            question=question,
            options=options,
            allow_multiple=allow_multiple,
        )
        return self.request("/poll/create", "POST", payload.to_dict())

    def poll_results(
        self,
        contact: str,
        question: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> ApiResponse:
        payload = PollQueryPayload(session_id=session_id or self._session_id, contact=contact, question=question)
        return self.request("/poll/results", "POST", payload.to_dict())

    def poll_status(
        self,
        contact: str,
        question: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> ApiResponse:
        """Derive poll/message status from /poll/results (no dedicated /poll/status route)."""
        resp = self.poll_results(contact, question, session_id)
        if not resp.ok or not resp.body.get("success"):
            return ApiResponse(
                status_code=resp.status_code,
                body={"success": False, "status": "unknown", "error": resp.body.get("error", "poll check failed")},
            )
        total_votes = int(resp.body.get("total_votes") or 0)
        response_time = resp.body.get("response_time")
        if total_votes > 0 or response_time:
            status = "read"
        elif resp.body.get("options"):
            status = "delivered"
        else:
            status = "sent"
        return ApiResponse(
            status_code=resp.status_code,
            body={"success": True, "status": status, "total_votes": total_votes, "derived_from": "/poll/results"},
        )

    def vote_poll(
        self,
        contact: str,
        question: str,
        option_index: int = 0,
        session_id: Optional[str] = None,
    ) -> ApiResponse:
        return self.request(
            "/poll/vote",
            "POST",
            {
                "session_id": session_id or self._session_id,
                "contact": contact,
                "question": question,
                "option_index": option_index,
            },
        )

    # --- Contacts ---

    def create_contact(
        self,
        first_name: str,
        last_name: str,
        phone_number: str,
        session_id: Optional[str] = None,
    ) -> ApiResponse:
        return self.request(
            "/contact/create",
            "POST",
            {
                "session_id": session_id or self._session_id,
                "first_name": first_name,
                "last_name": last_name,
                "phone_number": phone_number,
            },
        )

    def open_or_create_contact(
        self,
        contact_name: str,
        phone_number: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> ApiResponse:
        data: Dict[str, Any] = {
            "session_id": session_id or self._session_id,
            "contact_name": contact_name,
        }
        if phone_number:
            data["phone_number"] = phone_number
        return self.request("/contact/open-or-create", "POST", data)

    def check_contact(self, contact_name: str, session_id: Optional[str] = None) -> ApiResponse:
        sid = session_id or self._session_id
        q = urllib.parse.urlencode({"session_id": sid, "contact_name": contact_name})
        return self.request(f"/contact/check?{q}", "POST")

    # --- Session persistence ---

    def get_session_data(self, session_id: Optional[str] = None) -> ApiResponse:
        sid = session_id or self._session_id
        return self.request(f"/session/data?session_id={urllib.parse.quote(sid)}")

    def save_session(self, session_id: Optional[str] = None) -> ApiResponse:
        sid = session_id or self._session_id
        return self.request(f"/session/save?session_id={urllib.parse.quote(sid)}", "POST")

    def load_session(self, session_data: str, session_id: Optional[str] = None) -> ApiResponse:
        return self.request(
            "/session/load",
            "POST",
            {"session_id": session_id or self._session_id, "session_data": session_data},
        )

    def set_db_session(self, session_data: str, session_id: Optional[str] = None) -> ApiResponse:
        return self.request(
            "/session/set-db",
            "POST",
            {"session_id": session_id or self._session_id, "session_data": session_data},
        )

    # --- Utilities ---

    def screenshot(self, filename: Optional[str] = None, session_id: Optional[str] = None) -> ApiResponse:
        sid = session_id or self._session_id
        path = f"/screenshot?session_id={urllib.parse.quote(sid)}"
        if filename:
            path += f"&filename={urllib.parse.quote(filename)}"
        return self.request(path, "POST")

    def list_screenshots(self) -> ApiResponse:
        return self.request("/screenshots")