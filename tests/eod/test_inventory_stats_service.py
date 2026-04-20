# -*- coding: utf-8 -*-
"""
Created on Sun Jun  1 18:29:43 2025

@author: 153901
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from decimal import Decimal
from datetime import date
from types import SimpleNamespace
from app.services.inventory_stats_service import InventoryStatsService


@pytest_asyncio.fixture
async def service():
    # Create AsyncSession mock
    db_mock = MagicMock()

    # Patch all repos and ForecastingEngine to mocks inside the service instance
    service = InventoryStatsService(db_mock, restaurant_id=123)

    # Mock all repo attributes
    service.inventory_usage_log_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    service.inventory_repo = AsyncMock()
    service.ingredient_supplier_repo = AsyncMock()
    service.ingredient_repo = AsyncMock()
    service.forecasting_engine = AsyncMock()

    return service


@pytest.mark.asyncio
async def test_get_average_daily_usage_with_sufficient_logs(service):
    # Arrange
    ingredient_id = 1
    usage_data = [(1, 10), (2, 20), (3, 30)] * 5  # 15+ entries
    service.inventory_usage_log_repo.get_daily_usage.return_value = usage_data

    # Act
    avg_usage = await service.get_average_daily_usage(ingredient_id)

    # Assert
    expected_avg = Decimal(
        sum(usage for _, usage in usage_data) / len(usage_data)
    ).quantize(Decimal("0.01"))
    assert avg_usage == expected_avg
    service.forecasting_engine.derive_ingredient_usage_from_sales.assert_not_called()


@pytest.mark.asyncio
async def test_get_average_daily_usage_with_fallback(service):
    ingredient_id = 1
    # Insufficient usage logs (less than 14)
    service.inventory_usage_log_repo.get_daily_usage.return_value = [(1, 10), (2, 20)]

    fallback_usage = {1: {1: 5, 2: 15, 3: 25}}
    service.forecasting_engine.derive_ingredient_usage_from_sales.return_value = (
        fallback_usage
    )

    avg_usage = await service.get_average_daily_usage(ingredient_id)

    expected_avg = Decimal(
        sum(fallback_usage[ingredient_id].values()) / len(fallback_usage[ingredient_id])
    ).quantize(Decimal("0.01"))
    assert avg_usage == expected_avg


@pytest.mark.asyncio
async def test_get_average_daily_usage_no_data_returns_zero(service):
    ingredient_id = 1
    service.inventory_usage_log_repo.get_daily_usage.return_value = []

    service.forecasting_engine.derive_ingredient_usage_from_sales.return_value = {}

    avg_usage = await service.get_average_daily_usage(ingredient_id)
    assert avg_usage == Decimal("0")


@pytest.mark.asyncio
async def test_get_std_dev_usage_with_sufficient_logs(service):
    ingredient_id = 1
    usage_data = [(1, 10), (2, 20), (3, 30), (4, 25), (5, 15)] * 3  # 15+ entries
    service.inventory_usage_log_repo.get_daily_usage.return_value = usage_data

    std_dev = await service.get_std_dev_usage(ingredient_id)

    from statistics import pstdev

    expected_std_dev = Decimal(pstdev([usage for _, usage in usage_data])).quantize(
        Decimal("0.01")
    )
    assert std_dev == expected_std_dev
    service.forecasting_engine.derive_ingredient_usage_from_sales.assert_not_called()


@pytest.mark.asyncio
async def test_get_std_dev_usage_with_fallback(service):
    ingredient_id = 1
    service.inventory_usage_log_repo.get_daily_usage.return_value = [
        (1, 10)
    ] * 10  # Less than 14 unique days

    fallback_usage = {1: {1: 10, 2: 20, 3: 15, 4: 25}}
    service.forecasting_engine.derive_ingredient_usage_from_sales.return_value = (
        fallback_usage
    )

    std_dev = await service.get_std_dev_usage(ingredient_id)

    from statistics import pstdev

    expected_std_dev = Decimal(pstdev(fallback_usage[ingredient_id].values())).quantize(
        Decimal("0.01")
    )
    assert std_dev == expected_std_dev


@pytest.mark.asyncio
async def test_get_std_dev_usage_less_than_two_points_returns_zero(service):
    ingredient_id = 1
    # Return only one data point
    service.inventory_usage_log_repo.get_daily_usage.return_value = [(1, 10)]

    service.forecasting_engine.derive_ingredient_usage_from_sales.return_value = {
        ingredient_id: {1: 10}
    }

    std_dev = await service.get_std_dev_usage(ingredient_id)
    assert std_dev == Decimal("0")


@pytest.mark.asyncio
async def test_get_current_inventory_returns_quantity_and_unit(service):
    ingredient_id = 1

    # Create a proper mock object with the needed fields
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = 10.1234
    inventory_mock.unit = "kg"

    # Correctly patch get_inventory_by_ingredient
    service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
        return_value=inventory_mock
    )

    qty, unit = await service.get_current_inventory(ingredient_id)

    assert qty == Decimal("10.12")
    assert unit == "kg"


@pytest.mark.asyncio
async def test_get_current_inventory_no_inventory(service):
    ingredient_id = 1

    # Make sure it returns None
    service.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=None)

    qty, unit = await service.get_current_inventory(ingredient_id)

    assert qty == Decimal("0.00")
    assert unit == ""


@pytest.mark.asyncio
async def test_get_usable_inventory_projects_partial_lot_usage_before_expiration(service):
    ingredient_id = 1
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = Decimal("17.00")
    inventory_mock.unit = "lb"

    early_lot = SimpleNamespace(
        lot_id=10,
        quantity=Decimal("10.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 16),
        delivery_date=date(2026, 4, 14),
    )
    durable_lot = SimpleNamespace(
        lot_id=11,
        quantity=Decimal("7.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 21),
        delivery_date=date(2026, 4, 14),
    )

    service.inventory_repo.get_inventory_by_ingredient.return_value = inventory_mock
    service.inventory_lot_repo.get_lots_by_ingredient_id.return_value = [early_lot, durable_lot]
    service.inventory_usage_log_repo.get_all_by_lot_id.side_effect = [[], []]

    result = await service.get_usable_inventory(
        ingredient_id,
        usable_until_date=date(2026, 4, 17),
        daily_demand_points=[
            (date(2026, 4, 15), Decimal("2.00")),
            (date(2026, 4, 16), Decimal("2.00")),
            (date(2026, 4, 17), Decimal("0.00")),
        ],
        projection_start_date=date(2026, 4, 15),
    )

    assert result["quantity"] == Decimal("11.00")
    assert result["total_quantity"] == Decimal("17.00")
    assert result["excluded_quantity"] == Decimal("6.00")
    assert result["projected_waste_quantity"] == Decimal("6.00")
    assert result["fefo_applied"] is True
    assert result["fallback_used"] is False
    assert result["eligible_lot_count"] == 2
    assert result["source"] == "usable_lot_projection"
    assert result["projection_start_date"] == date(2026, 4, 15)
    assert result["projection_end_date"] == date(2026, 4, 17)
    assert result["unmet_demand_quantity"] == Decimal("0.00")
    early_summary = next(
        item for item in result["lot_projection_summary"] if item["lot_id"] == 10
    )
    durable_summary = next(
        item for item in result["lot_projection_summary"] if item["lot_id"] == 11
    )
    assert early_summary["consumed_quantity"] == Decimal("4.00")
    assert early_summary["projected_waste_quantity"] == Decimal("6.00")
    assert early_summary["usable_quantity"] == Decimal("4.00")
    assert durable_summary["consumed_quantity"] == Decimal("0.00")
    assert durable_summary["usable_quantity"] == Decimal("7.00")


@pytest.mark.asyncio
async def test_get_usable_inventory_treats_expiration_day_as_consumable(service):
    ingredient_id = 1
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = Decimal("5.00")
    inventory_mock.unit = "lb"

    expiring_lot = SimpleNamespace(
        lot_id=12,
        quantity=Decimal("5.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 16),
        delivery_date=date(2026, 4, 14),
    )

    service.inventory_repo.get_inventory_by_ingredient.return_value = inventory_mock
    service.inventory_lot_repo.get_lots_by_ingredient_id.return_value = [expiring_lot]
    service.inventory_usage_log_repo.get_all_by_lot_id.return_value = []

    result = await service.get_usable_inventory(
        ingredient_id,
        usable_until_date=date(2026, 4, 16),
        daily_demand_points=[
            (date(2026, 4, 15), Decimal("2.00")),
            (date(2026, 4, 16), Decimal("3.00")),
        ],
        projection_start_date=date(2026, 4, 15),
    )

    assert result["quantity"] == Decimal("5.00")
    assert result["projected_waste_quantity"] == Decimal("0.00")
    assert result["lot_projection_summary"][0]["consumed_quantity"] == Decimal("5.00")
    assert result["lot_projection_summary"][0]["projected_waste_quantity"] == Decimal(
        "0.00"
    )


@pytest.mark.asyncio
async def test_get_usable_inventory_consumes_lots_in_fefo_order(service):
    ingredient_id = 1
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = Decimal("8.00")
    inventory_mock.unit = "lb"

    earlier_expiring_lot = SimpleNamespace(
        lot_id=20,
        quantity=Decimal("3.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 16),
        delivery_date=date(2026, 4, 14),
    )
    later_expiring_lot = SimpleNamespace(
        lot_id=21,
        quantity=Decimal("5.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 18),
        delivery_date=date(2026, 4, 14),
    )

    service.inventory_repo.get_inventory_by_ingredient.return_value = inventory_mock
    service.inventory_lot_repo.get_lots_by_ingredient_id.return_value = [
        later_expiring_lot,
        earlier_expiring_lot,
    ]
    service.inventory_usage_log_repo.get_all_by_lot_id.side_effect = [[], []]

    result = await service.get_usable_inventory(
        ingredient_id,
        usable_until_date=date(2026, 4, 17),
        daily_demand_points=[
            (date(2026, 4, 15), Decimal("2.00")),
            (date(2026, 4, 16), Decimal("2.00")),
            (date(2026, 4, 17), Decimal("1.00")),
        ],
        projection_start_date=date(2026, 4, 15),
    )

    first_consumption = next(
        item for item in result["lot_consumption_trace"] if item["action"] == "consume"
    )
    earlier_summary = next(
        item for item in result["lot_projection_summary"] if item["lot_id"] == 20
    )
    later_summary = next(
        item for item in result["lot_projection_summary"] if item["lot_id"] == 21
    )

    assert first_consumption["lot_id"] == 20
    assert earlier_summary["consumed_quantity"] == Decimal("3.00")
    assert later_summary["consumed_quantity"] == Decimal("2.00")
    assert result["projected_waste_quantity"] == Decimal("0.00")


@pytest.mark.asyncio
async def test_get_usable_inventory_prefers_projection_when_forecast_inputs_are_present(
    service,
):
    ingredient_id = 1
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = Decimal("6.00")
    inventory_mock.unit = "lb"

    expiring_lot = SimpleNamespace(
        lot_id=30,
        quantity=Decimal("6.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 16),
        delivery_date=date(2026, 4, 14),
    )

    service.inventory_repo.get_inventory_by_ingredient.return_value = inventory_mock
    service.inventory_lot_repo.get_lots_by_ingredient_id.return_value = [expiring_lot]
    service.inventory_usage_log_repo.get_all_by_lot_id.return_value = []

    with patch.object(
        service.reorder_lot_projection,
        "project_usable_inventory",
        wraps=service.reorder_lot_projection.project_usable_inventory,
    ) as projection_mock:
        result = await service.get_usable_inventory(
            ingredient_id,
            usable_until_date=date(2026, 4, 17),
            daily_demand_points=[
                (date(2026, 4, 15), Decimal("2.00")),
                (date(2026, 4, 16), Decimal("1.00")),
            ],
            projection_start_date=date(2026, 4, 15),
        )

    projection_mock.assert_called_once()
    assert result["source"] == "usable_lot_projection"
    assert result["fallback_used"] is False
    assert result["fefo_applied"] is True
    assert result["quantity"] == Decimal("3.00")
    assert result["projected_waste_quantity"] == Decimal("3.00")


@pytest.mark.asyncio
async def test_get_usable_inventory_uses_delivery_then_lot_id_as_fefo_tiebreakers(service):
    ingredient_id = 1
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = Decimal("3.00")
    inventory_mock.unit = "lb"

    earliest_delivery_lot = SimpleNamespace(
        lot_id=40,
        quantity=Decimal("1.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 18),
        delivery_date=date(2026, 4, 10),
    )
    lower_id_same_delivery_lot = SimpleNamespace(
        lot_id=38,
        quantity=Decimal("1.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 18),
        delivery_date=date(2026, 4, 11),
    )
    higher_id_same_delivery_lot = SimpleNamespace(
        lot_id=39,
        quantity=Decimal("1.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 18),
        delivery_date=date(2026, 4, 11),
    )

    service.inventory_repo.get_inventory_by_ingredient.return_value = inventory_mock
    service.inventory_lot_repo.get_lots_by_ingredient_id.return_value = [
        higher_id_same_delivery_lot,
        lower_id_same_delivery_lot,
        earliest_delivery_lot,
    ]
    service.inventory_usage_log_repo.get_all_by_lot_id.side_effect = [[], [], []]

    result = await service.get_usable_inventory(
        ingredient_id,
        usable_until_date=date(2026, 4, 18),
        daily_demand_points=[
            (date(2026, 4, 15), Decimal("1.00")),
            (date(2026, 4, 16), Decimal("1.00")),
            (date(2026, 4, 17), Decimal("1.00")),
        ],
        projection_start_date=date(2026, 4, 15),
    )

    consume_trace = [
        item["lot_id"]
        for item in result["lot_consumption_trace"]
        if item["action"] == "consume"
    ]

    assert consume_trace == [40, 38, 39]


@pytest.mark.asyncio
async def test_get_usable_inventory_falls_back_to_summary_when_lots_missing(service):
    ingredient_id = 1
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = Decimal("9.25")
    inventory_mock.unit = "kg"

    service.inventory_repo.get_inventory_by_ingredient.return_value = inventory_mock
    service.inventory_lot_repo.get_lots_by_ingredient_id.return_value = []

    result = await service.get_usable_inventory(
        ingredient_id,
        usable_until_date=date(2026, 4, 18),
    )

    assert result["quantity"] == Decimal("9.25")
    assert result["total_quantity"] == Decimal("9.25")
    assert result["excluded_quantity"] == Decimal("0.00")
    assert result["source"] == "inventory_summary"
    assert result["fallback_used"] is True
    assert result["fefo_applied"] is False
    assert result["lot_projection_summary"] == []
    assert result["lot_consumption_trace"] == []
    assert result["projection_start_date"] is None
    assert result["projection_end_date"] == date(2026, 4, 18)
    assert result["unmet_demand_quantity"] == Decimal("0.00")


@pytest.mark.asyncio
async def test_get_usable_inventory_conversion_failure_sets_conversion_fallback(service):
    ingredient_id = 1
    inventory_mock = MagicMock()
    inventory_mock.quantity_on_hand = Decimal("4.00")
    inventory_mock.unit = "kg"

    converted_lot = SimpleNamespace(
        lot_id=50,
        quantity=Decimal("4.00"),
        unit="lb",
        status=SimpleNamespace(value="available"),
        spoilage_expected_date=date(2026, 4, 20),
        delivery_date=date(2026, 4, 14),
    )

    service.inventory_repo.get_inventory_by_ingredient.return_value = inventory_mock
    service.inventory_lot_repo.get_lots_by_ingredient_id.return_value = [converted_lot]
    service.inventory_usage_log_repo.get_all_by_lot_id.return_value = []

    with patch(
        "app.services.inventory_stats_service.convert_unit",
        side_effect=RuntimeError("conversion unavailable"),
    ):
        result = await service.get_usable_inventory(
            ingredient_id,
            usable_until_date=date(2026, 4, 18),
            daily_demand_points=[(date(2026, 4, 15), Decimal("1.00"))],
            projection_start_date=date(2026, 4, 15),
        )

    assert result["conversion_fallback"] is True
    assert result["source"] == "usable_lot_projection"
    assert result["fallback_used"] is False
    assert result["quantity"] == Decimal("4.00")
    assert result["total_quantity"] == Decimal("4.00")


@pytest.mark.asyncio
async def test_get_lead_time_days_returns_supplier_lead_time(service):
    ingredient_id = 1
    supplier_mock = MagicMock(lead_time_days=5)
    service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier.return_value = (
        supplier_mock
    )

    lead_time = await service.get_lead_time_days(ingredient_id)
    assert lead_time == 5


@pytest.mark.asyncio
async def test_get_lead_time_days_returns_default_if_none(service):
    ingredient_id = 1
    service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier.return_value = (
        None
    )

    lead_time = await service.get_lead_time_days(ingredient_id)
    assert lead_time == 1


@pytest.mark.asyncio
async def test_get_moq_returns_supplier_moq(service):
    ingredient_id = 1
    supplier_mock = MagicMock(min_order_quantity=10)
    service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier.return_value = (
        supplier_mock
    )

    moq = await service.get_moq(ingredient_id)
    assert moq == Decimal("10")


@pytest.mark.asyncio
async def test_get_moq_returns_default_if_none(service):
    ingredient_id = 1
    service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier.return_value = (
        None
    )

    moq = await service.get_moq(ingredient_id)
    assert moq == Decimal("1")


@pytest.mark.asyncio
async def test_get_max_stock_level_returns_value(service):
    ingredient_id = 1
    ingredient_mock = MagicMock(max_stock_level=Decimal("100"))
    service.ingredient_repo.get_by_id.return_value = ingredient_mock

    max_stock = await service.get_max_stock_level(ingredient_id)
    assert max_stock == Decimal("100")


@pytest.mark.asyncio
async def test_get_max_stock_level_returns_none_if_not_set(service):
    ingredient_id = 1
    ingredient_mock = MagicMock(max_stock_level=None)
    service.ingredient_repo.get_by_id.return_value = ingredient_mock

    max_stock = await service.get_max_stock_level(ingredient_id)
    assert max_stock is None


@pytest.mark.asyncio
async def test_get_shelf_life_days_returns_value(service):
    ingredient_id = 1
    ingredient_mock = MagicMock(shelf_life_days=45)
    service.ingredient_repo.get_by_id.return_value = ingredient_mock

    shelf_life = await service.get_shelf_life_days(ingredient_id)
    assert shelf_life == 45


@pytest.mark.asyncio
async def test_get_shelf_life_days_returns_default_if_none(service):
    ingredient_id = 1
    ingredient_mock = MagicMock(shelf_life_days=None)
    service.ingredient_repo.get_by_id.return_value = ingredient_mock

    shelf_life = await service.get_shelf_life_days(ingredient_id)
    assert shelf_life == 30


@pytest.mark.asyncio
async def test_get_total_usage_last_n_days_returns_sum(service):
    ingredient_id = 1
    usage_data = [(1, 10.5), (2, 20.75), (3, 5.25)]
    service.inventory_usage_log_repo.get_daily_usage.return_value = usage_data

    total_usage = await service.get_total_usage_last_n_days(ingredient_id, days=90)
    expected_total = Decimal(sum(usage for _, usage in usage_data)).quantize(
        Decimal("0.01")
    )

    assert total_usage == expected_total
