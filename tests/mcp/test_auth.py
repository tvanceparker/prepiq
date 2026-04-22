import pytest

from app.mcp_server.auth import MCPActorContext, require_permissions


@pytest.mark.asyncio
async def test_mcp_permission_hook_allows_active_user_without_role_binding():
    actor = MCPActorContext(
        username="operator",
        restaurant_id=5,
        subscription_tier="full",
        employee_id=42,
        name="Operator",
        role_id=None,
    )

    assert await require_permissions(None, actor, ["legacy_permission_name"]) is None
