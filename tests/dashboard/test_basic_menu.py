import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from fastapi import UploadFile
from io import BytesIO

from app.services.dashboard_service import DashboardService


@pytest_asyncio.fixture
def mock_repos():
    mock_sales = AsyncMock()
    mock_menu = AsyncMock()
    mock_forecast = AsyncMock()
    mock_accuracy = AsyncMock()
    
    db = MagicMock()
    restaurant_id = 123
    tier = "pro"

    service = DashboardService(db, restaurant_id, tier, employee_id=1)
    service.sales_repo = mock_sales
    service.menu_repo = mock_menu
    service.forecast_breakdown_repo = mock_forecast
    service.daily_accuracy_repo = mock_accuracy

    return service, mock_menu


@pytest.mark.asyncio
async def test_create_menu_item(mock_repos):
    service, mock_menu = mock_repos
    mock_menu.create.return_value = {"id": 1, "name": "Test Item"}

    data = {"name": "Test Item", "price": 10.0, "is_active": True}
    result = await service.create_menu_item(data)

    mock_menu.create.assert_awaited_once_with(data)
    assert result["name"] == "Test Item"


@pytest.mark.asyncio
async def test_update_menu_item(mock_repos):
    service, mock_menu = mock_repos
    mock_menu.update.return_value = {"id": 1, "name": "Updated"}

    result = await service.update_menu_item(1, {"name": "Updated"})

    mock_menu.update.assert_awaited_once_with(1, {"name": "Updated"})
    assert result["name"] == "Updated"


@pytest.mark.asyncio
async def test_deactivate_menu_item(mock_repos):
    service, mock_menu = mock_repos
    mock_menu.update.return_value = {"id": 1, "is_active": False}

    result = await service.deactivate_menu_item(1)

    mock_menu.update.assert_awaited_once_with(1, {"is_active": False})
    assert result["is_active"] is False


@pytest.mark.asyncio
async def test_list_menu_items(mock_repos):
    service, mock_menu = mock_repos
    mock_menu.get_all.return_value = [{"name": "A"}, {"name": "B"}]

    result = await service.list_menu_items()

    mock_menu.get_all.assert_awaited_once()
    assert isinstance(result, list)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_upload_menu_items_csv(mock_repos):
    service, mock_menu = mock_repos
    mock_menu.create.side_effect = lambda x: x  # Echo back input for test

    csv_content = (
        "name,category,price,is_active\n"
        "Burger,Fast Food,9.99,True\n"
        "Salad,Healthy,6.50,False\n"
    )
    file = UploadFile(filename="test.csv", file=BytesIO(csv_content.encode()))

    result = await service.upload_menu_items_csv(file)

    assert len(result) == 2
    assert result[0]["name"] == "Burger"
    assert result[1]["is_active"] is False
    assert mock_menu.create.await_count == 2
