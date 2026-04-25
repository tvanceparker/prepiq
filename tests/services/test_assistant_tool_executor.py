import pytest

from app.services.helpers import assistant_tool_executor as tool_module
from app.services.helpers.assistant_action_state import AssistantPendingAction, assistant_action_state
from app.services.helpers.assistant_tool_executor import AssistantToolExecutor


@pytest.mark.asyncio
async def test_tool_executor_runs_safe_query_tool_with_operator_intent(monkeypatch):
    captured = {}

    async def fake_execute_mcp_query(spec, payload, adapter_call, raw_token=None):
        captured["tool"] = spec.name
        captured["horizon_days"] = payload.horizon_days
        captured["operator_intent"] = payload.operator_intent
        captured["raw_token"] = raw_token
        return {
            "ok": True,
            "tool": spec.name,
            "status": "succeeded",
            "audit_id": None,
            "requires_confirmation": False,
            "data": {
                "forecast_status": "ready",
                "horizon_days": payload.horizon_days,
                "operator_intent": payload.operator_intent,
            },
            "error": None,
        }

    monkeypatch.setattr(tool_module, "execute_mcp_query", fake_execute_mcp_query)

    executor = AssistantToolExecutor(
        db=object(),
        restaurant_id=9,
        subscription_tier="full",
        employee_id=12,
        operator_intent="what should I reorder today?",
        raw_token="jwt-token",
    )

    result = await executor.execute_tool(
        "get_purchase_order_suggestions",
        {"horizon_days": 5, "use_cached_forecast": True},
    )

    assert result["ok"] is True
    assert result["tool"] == "get_purchase_order_suggestions"
    assert result["data"]["forecast_status"] == "ready"
    assert result["data"]["horizon_days"] == 5
    assert result["data"]["operator_intent"] == "what should I reorder today?"
    assert captured["raw_token"] == "jwt-token"


@pytest.mark.asyncio
async def test_high_risk_action_is_staged_for_confirmation(monkeypatch):
    assistant_action_state.clear(
        restaurant_id=9,
        employee_id=12,
        conversation_id="web-session",
    )

    async def fake_execute_mcp_action(spec, payload, adapter_call, raw_token=None):
        assert payload.dry_run is True
        assert payload.confirmation_token is None
        return {
            "ok": True,
            "tool": spec.name,
            "status": "requires_confirmation",
            "audit_id": 77,
            "idempotent_replay": False,
            "requires_confirmation": True,
            "confirmation_token": "secret-token",
            "data": {
                "preview": {"inventory_id": payload.inventory_id, "counted_quantity": str(payload.counted_quantity)},
                "preflight": {"validated": ["inventory"]},
                "will_execute": False,
            },
            "error": None,
        }

    monkeypatch.setattr(tool_module, "execute_mcp_action", fake_execute_mcp_action)

    executor = AssistantToolExecutor(
        db=object(),
        restaurant_id=9,
        subscription_tier="full",
        employee_id=12,
        operator_intent="set garlic stock to five pounds",
        raw_token="jwt-token",
        conversation_id="web-session",
    )

    result = await executor.execute_tool(
        "set_inventory_current_stock",
        {"inventory_id": 5, "counted_quantity": 5, "reason": "Cycle count"},
    )

    assert result["requires_confirmation"] is True
    assert result["confirmation_token"] is None
    assert result["pending_action"]["tool"] == "set_inventory_current_stock"
    assert executor.pending_action is not None


@pytest.mark.asyncio
async def test_execute_pending_action_replays_stored_confirmation(monkeypatch):
    captured = {}

    async def fake_execute_mcp_action(spec, payload, adapter_call, raw_token=None):
        captured["confirmation_token"] = payload.confirmation_token
        captured["dry_run"] = payload.dry_run
        captured["idempotency_key"] = payload.idempotency_key
        captured["raw_token"] = raw_token
        return {
            "ok": True,
            "tool": spec.name,
            "status": "succeeded",
            "audit_id": 91,
            "idempotent_replay": False,
            "requires_confirmation": False,
            "confirmation_token": None,
            "data": {"inventory_id": payload.inventory_id, "counted_quantity": str(payload.counted_quantity)},
            "error": None,
        }

    monkeypatch.setattr(tool_module, "execute_mcp_action", fake_execute_mcp_action)

    executor = AssistantToolExecutor(
        db=object(),
        restaurant_id=9,
        subscription_tier="full",
        employee_id=12,
        operator_intent="set garlic stock to five pounds",
        raw_token="jwt-token",
        conversation_id="web-session",
    )

    pending_action = AssistantPendingAction(
        tool_name="set_inventory_current_stock",
        idempotency_key="assistant:web-session:set_inventory_current_stock:abc12345",
        confirmation_token="secret-token",
        arguments={"inventory_id": 5, "counted_quantity": 5, "reason": "Cycle count"},
        audit_id=77,
        operator_intent="set garlic stock to five pounds",
        preview={"preview": {"inventory_id": 5}},
        created_at=executor.pending_action.created_at if executor.pending_action else __import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        expires_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )

    result = await executor.execute_pending_action(pending_action)

    assert result["ok"] is True
    assert captured["confirmation_token"] == "secret-token"
    assert captured["dry_run"] is False
    assert captured["idempotency_key"] == pending_action.idempotency_key
    assert captured["raw_token"] == "jwt-token"