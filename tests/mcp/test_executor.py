from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.mcp_server import executor
from app.mcp_server.auth import MCPActorContext
from app.mcp_server.errors import MCPPermissionError
from app.mcp_server.executor import ToolSpec, execute_mcp_action, execute_mcp_query
from app.mcp_server.schemas import CreateMenuItemInput, ListPurchaseOrdersInput


class FakeSession:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def commit(self):
        return None

    async def rollback(self):
        return None


class FakeAuditRepository:
    store = {}
    next_id = 1

    def __init__(self, db, restaurant_id):
        self.restaurant_id = restaurant_id

    async def get_by_idempotency_key(self, *, tool_name, idempotency_key):
        return self.store.get((self.restaurant_id, tool_name, idempotency_key))

    async def create(self, data):
        audit = SimpleNamespace(
            audit_id=self.__class__.next_id,
            restaurant_id=self.restaurant_id,
            **data,
        )
        self.__class__.next_id += 1
        self.store[(self.restaurant_id, data["tool_name"], data["idempotency_key"])] = audit
        return audit

    async def mark(self, audit_id, **kwargs):
        for audit in self.store.values():
            if audit.audit_id == audit_id:
                for key, value in kwargs.items():
                    setattr(audit, key, value)
                return audit
        return None


class FakeAdapters:
    def __init__(self, db, actor):
        self.actor = actor

    async def preflight(self, tool_name, payload):
        return {"validated": ["fake"], "tool": tool_name}


@pytest.fixture(autouse=True)
def executor_harness(monkeypatch):
    FakeAuditRepository.store = {}
    FakeAuditRepository.next_id = 1
    actor = MCPActorContext(
        username="manager",
        restaurant_id=1,
        subscription_tier="full",
        employee_id=7,
        name="Manager",
        role_id=3,
    )
    monkeypatch.setattr(executor, "AsyncSessionLocal", lambda: FakeSession())
    monkeypatch.setattr(executor, "MCPActionAuditRepository", FakeAuditRepository)
    monkeypatch.setattr(executor, "MCPServiceAdapters", FakeAdapters)
    monkeypatch.setattr(executor, "_raw_token_from_context", lambda raw_token=None: "token")
    monkeypatch.setattr(executor, "decode_actor_from_token", lambda token: actor)
    monkeypatch.setattr(executor, "validate_actor_against_database", AsyncMock(return_value=actor))
    monkeypatch.setattr(executor, "require_permissions", AsyncMock(return_value=None))
    return actor


@pytest.mark.asyncio
async def test_high_risk_tool_requires_dry_run_confirmation_then_executes():
    spec = ToolSpec(
        name="set_menu_item_active",
        permissions=("edit_menu",),
        confirmation_required=True,
        risk_level="menu_lifecycle",
    )
    payload = CreateMenuItemInput(
        idempotency_key="menu-key-1",
        name="Burger",
        price=12,
        dry_run=True,
    )
    executed = []

    async def execute_tool(adapters):
        executed.append(True)
        return {"created": True}

    dry_run_result = await execute_mcp_action(
        spec,
        payload,
        execute_tool,
        raw_token="token",
    )

    assert dry_run_result["ok"] is True
    assert dry_run_result["requires_confirmation"] is True
    assert dry_run_result["confirmation_token"]
    assert executed == []

    execute_payload = payload.model_copy(
        update={
            "dry_run": False,
            "confirmation_token": dry_run_result["confirmation_token"],
        }
    )
    execute_result = await execute_mcp_action(
        spec,
        execute_payload,
        execute_tool,
        raw_token="token",
    )

    assert execute_result["ok"] is True
    assert execute_result["status"] == "succeeded"
    assert execute_result["data"] == {"created": True}
    assert executed == [True]


@pytest.mark.asyncio
async def test_idempotency_replays_success_without_reexecuting():
    spec = ToolSpec(name="create_menu_item", permissions=("edit_menu",))
    payload = CreateMenuItemInput(idempotency_key="menu-key-2", name="Burger", price=12)
    executed = []

    async def execute_once(adapters):
        executed.append(True)
        return {"created": True}

    async def execute_again(adapters):
        executed.append(True)
        return {"created": "again"}

    first = await execute_mcp_action(
        spec,
        payload,
        execute_once,
        raw_token="token",
    )
    second = await execute_mcp_action(
        spec,
        payload,
        execute_again,
        raw_token="token",
    )

    assert first["ok"] is True
    assert second["ok"] is True
    assert second["idempotent_replay"] is True
    assert second["data"] == {"created": True}
    assert executed == [True]


@pytest.mark.asyncio
async def test_permission_failure_is_audited_and_normalized(monkeypatch):
    monkeypatch.setattr(
        executor,
        "require_permissions",
        AsyncMock(side_effect=MCPPermissionError("Missing required MCP permission(s): edit_menu.")),
    )
    spec = ToolSpec(name="create_menu_item", permissions=("edit_menu",))
    payload = CreateMenuItemInput(idempotency_key="menu-key-3", name="Burger", price=12)

    result = await execute_mcp_action(
        spec,
        payload,
        AsyncMock(return_value={"created": True}),
        raw_token="token",
    )

    assert result["ok"] is False
    assert result["error"]["code"] == "permission_denied"
    audit = next(iter(FakeAuditRepository.store.values()))
    assert audit.status == "denied"


@pytest.mark.asyncio
async def test_full_tier_guard_blocks_basic_actor(monkeypatch, executor_harness):
    basic_actor = MCPActorContext(
        username="manager",
        restaurant_id=1,
        subscription_tier="basic",
        employee_id=7,
        name="Manager",
        role_id=3,
    )
    monkeypatch.setattr(executor, "validate_actor_against_database", AsyncMock(return_value=basic_actor))
    spec = ToolSpec(
        name="create_recipe",
        permissions=("add_recipe",),
        full_tier_required=True,
    )
    payload = CreateMenuItemInput(idempotency_key="menu-key-4", name="Burger", price=12)

    result = await execute_mcp_action(
        spec,
        payload,
        AsyncMock(return_value={"created": True}),
        raw_token="token",
    )

    assert result["ok"] is False
    assert result["error"]["code"] == "tier_unavailable"


@pytest.mark.asyncio
async def test_idempotency_key_rejects_different_payload():
    spec = ToolSpec(name="create_menu_item", permissions=("edit_menu",))
    first_payload = CreateMenuItemInput(idempotency_key="menu-key-5", name="Burger", price=12)
    second_payload = CreateMenuItemInput(idempotency_key="menu-key-5", name="Taco", price=12)

    await execute_mcp_action(
        spec,
        first_payload,
        AsyncMock(return_value={"created": True}),
        raw_token="token",
    )
    result = await execute_mcp_action(
        spec,
        second_payload,
        AsyncMock(return_value={"created": "wrong"}),
        raw_token="token",
    )

    assert result["ok"] is False
    assert result["error"]["code"] == "idempotency_conflict"


@pytest.mark.asyncio
async def test_read_only_query_uses_authz_without_idempotency_or_audit():
    spec = ToolSpec(
        name="list_purchase_orders",
        permissions=("manage_purchase_orders",),
        full_tier_required=True,
    )
    payload = ListPurchaseOrdersInput(status="cart")
    executed = []

    async def execute_query(adapters):
        executed.append(True)
        return [{"order_id": 11, "status": "cart"}]

    result = await execute_mcp_query(
        spec,
        payload,
        execute_query,
        raw_token="token",
    )

    assert result["ok"] is True
    assert result["audit_id"] is None
    assert result["data"] == [{"order_id": 11, "status": "cart"}]
    assert executed == [True]
    assert FakeAuditRepository.store == {}
