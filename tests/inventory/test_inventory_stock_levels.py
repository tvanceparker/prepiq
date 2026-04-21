from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.inventory_service import InventoryService


@pytest.fixture
def inventory_service(mock_db):
    service = InventoryService(mock_db, 5, "full", employee_id=11)
    service.ingredient_repo = AsyncMock()
    service.inventory_repo = AsyncMock()
    service.ingredient_supplier_repo = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_get_ingredients_with_stock_levels_prefers_safety_stock_for_watch_threshold(
    inventory_service,
):
    ingredient = MagicMock(ingredient_id=101, name="Tomatoes", abc_class="A", unit="lb")
    inventory = MagicMock(quantity_on_hand=Decimal("8.00"), unit="lb", shelf_life_days=5)
    supplier = MagicMock(
        ingredient_id=101,
        ingredient_supplier_id=201,
        lead_time_days=2,
        min_order_quantity=4,
        unit="lb",
        shelf_life_days=7,
    )

    inventory_service.ingredient_repo.get_all.return_value = [ingredient]
    inventory_service.inventory_repo.get_inventory_by_ingredient.return_value = inventory
    inventory_service.ingredient_supplier_repo.get_by_ingredient_ids.return_value = [supplier]
    inventory_service._resolve_cached_forecast_run_date = AsyncMock(
        return_value=date(2026, 4, 20)
    )
    inventory_service._get_last_eod_ledger = AsyncMock(
        return_value=MagicMock(finalized=True, finished_at=datetime(2026, 4, 20, 9, 0, 0))
    )
    inventory_service._load_cached_ingredient_forecast = AsyncMock(
        return_value={
            101: {
                "daily_breakdown": [
                    (date(2026, 4, 20), 4.0),
                    (date(2026, 4, 21), 4.0),
                ],
                "unit": "lb",
            }
        }
    )

    reorder_engine = MagicMock()
    reorder_engine.choose_supplier_option = AsyncMock(return_value={"supplier": supplier})
    reorder_engine.build_reorder_decision = AsyncMock(
        return_value={
            "reorder_point": Decimal("12.00"),
            "safety_stock": Decimal("9.00"),
        }
    )
    restaurant = MagicMock(last_eod_run_date=date(2026, 4, 20), forecast_length=30)

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine",
        return_value=reorder_engine,
    ):
        restaurant_repo_cls.return_value.get_by_id = AsyncMock(return_value=restaurant)

        result = await inventory_service.get_ingredients_with_stock_levels()

    assert len(result) == 1
    assert result[0]["watch_threshold"] == 9.0
    assert result[0]["watch_threshold_kind"] == "safety_stock"
    assert result[0]["watch_threshold_label"] == "Safety buffer"
    assert result[0]["reorder_point"] == 12.0
    assert result[0]["status"] == "low"
    assert result[0]["threshold_available"] is True

    reorder_engine.build_reorder_decision.assert_awaited_once()
    assert reorder_engine.build_reorder_decision.await_args.kwargs["manage_alerts"] is False


@pytest.mark.asyncio
async def test_get_ingredients_with_stock_levels_marks_unavailable_without_finalized_forecast(
    inventory_service,
):
    ingredient = MagicMock(ingredient_id=202, name="Lemons", abc_class=None, unit="each")
    inventory = MagicMock(quantity_on_hand=Decimal("5.00"), unit="each", shelf_life_days=None)

    inventory_service.ingredient_repo.get_all.return_value = [ingredient]
    inventory_service.inventory_repo.get_inventory_by_ingredient.return_value = inventory
    inventory_service.ingredient_supplier_repo.get_by_ingredient_ids.return_value = []
    inventory_service._resolve_cached_forecast_run_date = AsyncMock(return_value=None)

    reorder_engine = MagicMock()
    reorder_engine.choose_supplier_option = AsyncMock()
    reorder_engine.build_reorder_decision = AsyncMock()
    restaurant = MagicMock(last_eod_run_date=None, forecast_length=30)

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine",
        return_value=reorder_engine,
    ):
        restaurant_repo_cls.return_value.get_by_id = AsyncMock(return_value=restaurant)

        result = await inventory_service.get_ingredients_with_stock_levels()

    assert len(result) == 1
    assert result[0]["status"] == "unavailable"
    assert result[0]["threshold_available"] is False
    assert result[0]["watch_threshold"] is None
    assert "No finalized EOD forecast" in result[0]["threshold_message"]

    reorder_engine.build_reorder_decision.assert_not_called()