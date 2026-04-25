from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

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


@pytest.mark.asyncio
async def test_confirm_query_executes_audit_backed_pending_action_when_memory_is_empty(monkeypatch):
    pending_action = AssistantPendingAction(
        tool_name="update_recipe",
        idempotency_key="assistant:web-session:update_recipe:abc12345",
        confirmation_token="rebuilt-token",
        arguments={"recipe_id": 5, "name": "Test", "ingredients": []},
        audit_id=88,
        operator_intent="confirmed pending assistant action",
        preview={"preview": {"recipe_id": 5}},
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
                "data": {"recipe_id": 5},
                "error": None,
            }

    monkeypatch.setattr("app.services.assistant_service.assistant_action_state.get", lambda **kwargs: None)
    monkeypatch.setattr(
        "app.services.assistant_service.assistant_action_state.clear",
        lambda **kwargs: cleared.__setitem__("value", True),
    )
    monkeypatch.setattr("app.services.assistant_service.AssistantToolExecutor", FakeExecutor)
    async def load_pending(self, conversation_id):
        assert conversation_id == "web-session"
        return pending_action

    monkeypatch.setattr(
        AssistantService,
        "_load_pending_action_from_audit",
        load_pending,
    )

    service = AssistantService(db=None, restaurant_id=9, subscription_tier="full", employee_id=12)
    response = await service._maybe_handle_pending_action(
        AssistantQueryRequestDTO(query="perfect do it", conversation_id="web-session"),
        AssistantRetrievalMode.structured,
        raw_token="jwt-token",
    )

    assert response is not None
    assert response.answer == "Confirmed and executed update_recipe successfully."
    assert response.action_result is not None
    assert response.action_result.audit_id == 88
    assert cleared["value"] is True


@pytest.mark.asyncio
async def test_load_pending_action_from_audit_reconstructs_staged_action():
    created_at = datetime.now(timezone.utc).replace(tzinfo=None)
    audit = SimpleNamespace(
        tool_name="update_recipe",
        idempotency_key="assistant:web-session:update_recipe:abc12345",
        input_summary={
            "idempotency_key": "assistant:web-session:update_recipe:abc12345",
            "recipe_id": 5,
            "name": "Test",
            "ingredients": [],
        },
        result_summary={"preview": {"recipe_id": 5}},
        payload_hash="abc123",
        risk_level="recipe_component_replacement",
        audit_id=88,
        created_at=created_at,
    )

    class FakeScalars:
        def first(self):
            return audit

    class FakeResult:
        def scalars(self):
            return FakeScalars()

    class FakeDb:
        async def execute(self, statement):
            return FakeResult()

    service = AssistantService(db=FakeDb(), restaurant_id=9, subscription_tier="full", employee_id=12)
    pending = await service._load_pending_action_from_audit("web-session")

    assert pending is not None
    assert pending.tool_name == "update_recipe"
    assert pending.idempotency_key == "assistant:web-session:update_recipe:abc12345"
    assert pending.arguments == {"recipe_id": 5, "name": "Test", "ingredients": []}
    assert pending.confirmation_token
    assert pending.audit_id == 88


@pytest.mark.parametrize(
    "query",
    [
        "perfect do it",
        "yes please go ahead",
        "looks good, approve it",
        "sounds good",
    ],
)
def test_confirmation_request_accepts_natural_approval_phrases(query):
    service = AssistantService(
        db=None,
        restaurant_id=9,
        subscription_tier="full",
        employee_id=12,
    )

    assert service._is_confirmation_request(query) is True


@pytest.mark.parametrize(
    "query",
    [
        "do not do it",
        "don't approve it",
        "no cancel",
    ],
)
def test_confirmation_request_rejects_negative_phrases(query):
    service = AssistantService(
        db=None,
        restaurant_id=9,
        subscription_tier="full",
        employee_id=12,
    )

    assert service._is_confirmation_request(query) is False
