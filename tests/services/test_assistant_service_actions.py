from datetime import datetime, timedelta, timezone

import pytest

from app.schemas.assistant_dto import AssistantQueryRequestDTO, AssistantRetrievalMode
from app.services.assistant_service import AssistantService
from app.services.helpers.assistant_action_state import AssistantPendingAction


@pytest.mark.asyncio
async def test_confirm_query_executes_pending_action(monkeypatch):
    pending_action = AssistantPendingAction(
        tool_name="set_inventory_current_stock",
        idempotency_key="assistant:web-session:set_inventory_current_stock:abc12345",
        confirmation_token="secret-token",
        arguments={"inventory_id": 5, "counted_quantity": 5, "reason": "Cycle count"},
        audit_id=77,
        operator_intent="set garlic stock to five pounds",
        preview={"preview": {"inventory_id": 5}},
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    cleared = {"value": False}

    class FakeExecutor:
        def __init__(self, *args, **kwargs):
            pass

        async def execute_pending_action(self, pending):
            assert pending is pending_action
            return {
                "ok": True,
                "tool": pending.tool_name,
                "status": "succeeded",
                "audit_id": pending.audit_id,
                "idempotent_replay": False,
                "data": {"inventory_id": 5},
                "error": None,
            }

    monkeypatch.setattr("app.services.assistant_service.assistant_action_state.get", lambda **kwargs: pending_action)
    monkeypatch.setattr(
        "app.services.assistant_service.assistant_action_state.clear",
        lambda **kwargs: cleared.__setitem__("value", True),
    )
    monkeypatch.setattr("app.services.assistant_service.AssistantToolExecutor", FakeExecutor)

    service = AssistantService(db=None, restaurant_id=9, subscription_tier="full", employee_id=12)
    response = await service._maybe_handle_pending_action(
        AssistantQueryRequestDTO(query="confirm", conversation_id="web-session"),
        AssistantRetrievalMode.structured,
        raw_token="jwt-token",
    )

    assert response is not None
    assert response.answer == "Confirmed and executed set_inventory_current_stock successfully."
    assert response.action_result is not None
    assert response.action_result.status == "succeeded"
    assert cleared["value"] is True