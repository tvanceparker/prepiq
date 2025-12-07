import pytest
from unittest.mock import AsyncMock, MagicMock
import json
from datetime import date
from app.services.admin_service import AdminService
from app.schemas.admin_dto import TenantInfoUpdateRequest

@pytest.fixture
def mock_restaurant():
    # Instead of MagicMock(), use a simple class or a mock with attributes set to real values
    class MockRestaurant:
        restaurant_id = 1
        name = "Testaurant"
        phone = "555-555-5555"
        email = "test@restaurant.com"
        address = "123 Test Street"
        city = "Testville"
        state = "TS"
        zip_code = "12345"
        subscription_tier = "basic"
        subscription_status = "active"
        expiry_date = "2025-12-31"
        hours_of_operation = json.dumps([
            {"day": "Monday", "open_time": "09:00", "close_time": "17:00", "is_closed": False}
        ])

    return MockRestaurant()
@pytest.fixture
def admin_service():
    mock_session = AsyncMock()
    return AdminService(db=mock_session, restaurant_id=1, subscription_tier='basic', employee_id=1)

@pytest.mark.asyncio
async def test_get_tenant_info(monkeypatch, admin_service, mock_restaurant):
    # Patch the repository's get_by_id method
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = mock_restaurant
    admin_service.restaurant_repo = mock_repo

    result = await admin_service.get_tenant_info()

    expected = {
        "restaurant_id": 1,
        "name": "Testaurant",
        "phone": "555-555-5555",
        "email": "test@restaurant.com",
        "address": "123 Test Street",
        "city": "Testville",
        "state": "TS",
        "zip_code": "12345",
        "subscription_tier": "basic",
        "subscription_status": "active",
        "expiry_date": date(2025, 12, 31),
        "hours_of_operation": [{"day": "Monday", "open_time": "09:00", "close_time": "17:00", "is_closed": False}],
    }

    assert result.model_dump() == expected
    mock_repo.get_by_id.assert_awaited_once_with(1)

@pytest.mark.asyncio
async def test_get_tenant_info_none(admin_service):
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = None
    admin_service.restaurant_repo = mock_repo

    result = await admin_service.get_tenant_info()

    assert result is None
    mock_repo.get_by_id.assert_awaited_once_with(1)

@pytest.mark.asyncio
async def test_update_tenant_info(admin_service):
    mock_repo = AsyncMock()
    admin_service.restaurant_repo = mock_repo

    update_payload = {
        "name": "Updated Name",
        "email": "new@email.com",
        "phone": "555-666-7777",
        "address": "456 Updated Ave",
        "city": "New City",
        "state": "NC",
        "zip_code": "54321",
        "subscription_tier": "pro",
        "subscription_status": "active",
        "expiry_date": "2026-01-01",
        "hours_of_operation": [
            {"day": "Tuesday", "open_time": "10:00", "close_time": "18:00", "is_closed": False}
        ],
    }

    await admin_service.update_tenant_info(TenantInfoUpdateRequest(**update_payload))

    expected_update = {
        "name": "Updated Name",
        "phone": "555-666-7777",
        "email": "new@email.com",
        "address": "456 Updated Ave",
        "city": "New City",
        "state": "NC",
        "zip_code": "54321",
        "hours_of_operation": json.dumps(
            [
                {
                    "day": "Tuesday",
                    "open_time": "10:00",
                    "close_time": "18:00",
                    "is_closed": False,
                }
            ]
        ),
    }

    mock_repo.update.assert_awaited_once_with(1, expected_update)
