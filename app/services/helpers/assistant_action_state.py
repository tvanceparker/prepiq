from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Any

from app.mcp_server.confirmation import DEFAULT_CONFIRMATION_TTL_SECONDS


@dataclass(frozen=True)
class AssistantPendingAction:
    tool_name: str
    idempotency_key: str
    confirmation_token: str
    arguments: dict[str, Any]
    audit_id: int | None
    operator_intent: str
    preview: dict[str, Any] | None
    created_at: datetime
    expires_at: datetime

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "tool": self.tool_name,
            "audit_id": self.audit_id,
            "requires_confirmation": True,
            "preview": self.preview,
            "expires_at": self.expires_at.isoformat(),
        }


class AssistantActionStateStore:
    def __init__(self):
        self._lock = Lock()
        self._entries: dict[tuple[int, int, str], AssistantPendingAction] = {}

    def save(
        self,
        *,
        restaurant_id: int,
        employee_id: int,
        conversation_id: str,
        tool_name: str,
        idempotency_key: str,
        confirmation_token: str,
        arguments: dict[str, Any],
        audit_id: int | None,
        operator_intent: str,
        preview: dict[str, Any] | None,
    ) -> AssistantPendingAction:
        now = datetime.now(timezone.utc)
        pending_action = AssistantPendingAction(
            tool_name=tool_name,
            idempotency_key=idempotency_key,
            confirmation_token=confirmation_token,
            arguments=arguments,
            audit_id=audit_id,
            operator_intent=operator_intent,
            preview=preview,
            created_at=now,
            expires_at=now + timedelta(seconds=DEFAULT_CONFIRMATION_TTL_SECONDS),
        )
        with self._lock:
            self._entries[(restaurant_id, employee_id, conversation_id)] = pending_action
        return pending_action

    def get(
        self,
        *,
        restaurant_id: int,
        employee_id: int,
        conversation_id: str,
    ) -> AssistantPendingAction | None:
        key = (restaurant_id, employee_id, conversation_id)
        with self._lock:
            pending_action = self._entries.get(key)
            if not pending_action:
                return None
            if pending_action.expires_at <= datetime.now(timezone.utc):
                self._entries.pop(key, None)
                return None
            return pending_action

    def clear(
        self,
        *,
        restaurant_id: int,
        employee_id: int,
        conversation_id: str,
    ) -> None:
        with self._lock:
            self._entries.pop((restaurant_id, employee_id, conversation_id), None)


assistant_action_state = AssistantActionStateStore()