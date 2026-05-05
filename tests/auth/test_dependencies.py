from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.api.dependencies import CurrentUser, check_permissions, get_current_user
from app.utils.security import create_access_token


@pytest.mark.asyncio
async def test_check_permissions_skips_when_role_id_missing(mock_db):
    current_user = CurrentUser(
        username="testuser",
        restaurant_id=7,
        subscription_tier="basic",
        employee_id=42,
        name="Test User",
        role_id=None,
    )

    permission_check = check_permissions(["tenant_info"])

    await permission_check(current_user=current_user, db=mock_db)

    mock_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_check_permissions_raises_when_required_permission_missing(mock_db):
    current_user = CurrentUser(
        username="testuser",
        restaurant_id=7,
        subscription_tier="pro",
        employee_id=42,
        name="Test User",
        role_id=3,
    )
    mock_result = SimpleNamespace(
        scalars=lambda: SimpleNamespace(all=lambda: [])
    )
    mock_db.execute.return_value = mock_result

    permission_check = check_permissions(["tenant_info"])

    with pytest.raises(HTTPException) as exc_info:
        await permission_check(current_user=current_user, db=mock_db)

    assert exc_info.value.status_code == 403
    assert "Missing required permissions" in exc_info.value.detail
    mock_db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_current_user_normalizes_legacy_full_tier_claim():
    token, _ = create_access_token(
        {
            "sub": "testuser",
            "restaurant_id": 7,
            "subscription_tier": "master",
            "employee_id": 42,
            "name": "Test User",
            "role_id": 3,
        }
    )

    current_user = await get_current_user(token=token)

    assert current_user.subscription_tier == "full"