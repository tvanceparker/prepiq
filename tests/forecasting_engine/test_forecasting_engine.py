import pytest
import pandas as pd
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.services.forecasting_engine import ForecastingEngine

@pytest.mark.skip(reason="Refactored")
@pytest.mark.asyncio
async def test_load_data():
    mock_db = MagicMock()
    engine = ForecastingEngine(db=mock_db, restaurant_id=1)

    # Mock sales_repo.get_sales_between
    mock_sale = type(
        "Sale",
        (object,),
        {
            "menu_item_id": 1,
            "sale_timestamp": datetime(2025, 6, 1, 12),
            "quantity_sold": 5,
        },
    )()
    engine.sales_repo.get_sales_between = AsyncMock(return_value=[mock_sale])

    sales = await engine.load_data(days_back=7)
    assert isinstance(sales, list)
    assert len(sales) == 1
    assert sales[0].menu_item_id == 1


def test_preprocess_data():
    raw_sales = [
        type(
            "Sale",
            (object,),
            {
                "menu_item_id": 1,
                "sale_timestamp": datetime(2025, 6, 1, 12, 0),
                "quantity_sold": 3,
            },
        )(),
        type(
            "Sale",
            (object,),
            {
                "menu_item_id": 1,
                "sale_timestamp": datetime(2025, 6, 1, 18, 0),
                "quantity_sold": 2,
            },
        )(),
        type(
            "Sale",
            (object,),
            {
                "menu_item_id": 2,
                "sale_timestamp": datetime(2025, 6, 2, 12, 0),
                "quantity_sold": 5,
            },
        )(),
    ]
    engine = ForecastingEngine(db=None, restaurant_id=1)
    df = engine.preprocess_data(raw_sales)

    assert "menu_item_id" in df.columns
    assert "date" in df.columns
    assert "quantity_sold" in df.columns
    assert "day_of_week" in df.columns
    assert "is_weekend" in df.columns

    # Check aggregation sums for menu_item_id=1 on 2025-06-01
    row = df[(df["menu_item_id"] == 1) & (df["date"] == date(2025, 6, 1))].iloc[0]
    assert row["quantity_sold"] == 5


def test_train_model():
    engine = ForecastingEngine(db=None, restaurant_id=1)
    data = pd.DataFrame(
        {
            "menu_item_id": [1, 1, 2, 2],
            "date": [
                pd.Timestamp("2025-06-01"),
                pd.Timestamp("2025-06-02"),
                pd.Timestamp("2025-06-01"),
                pd.Timestamp("2025-06-02"),
            ],
            "quantity_sold": [10, 12, 5, 7],
            "day_of_week": [0, 1, 0, 1],
            "is_weekend": [0, 0, 0, 0],
        }
    )
    models = engine.train_model(data)
    assert 1 in models
    assert 2 in models
    for model in models.values():
        preds = model.predict([[0, 0]])
        assert preds.shape[0] == 1


def test_predict_menu_item_demand():
    engine = ForecastingEngine(db=None, restaurant_id=1)
    data = pd.DataFrame(
        {
            "menu_item_id": [1, 1],
            "date": [pd.Timestamp("2025-06-01"), pd.Timestamp("2025-06-02")],
            "quantity_sold": [10, 15],
            "day_of_week": [0, 1],
            "is_weekend": [0, 0],
        }
    )
    engine.models = engine.train_model(data)
    forecast = engine.predict_menu_item_demand(2)
    assert isinstance(forecast, list)
    assert all(
        "menu_item_id" in f and "forecast_date" in f and "predicted_quantity" in f
        for f in forecast
    )
    assert all(f["predicted_quantity"] >= 0 for f in forecast)


@pytest.mark.asyncio
async def test_generate_ingredient_breakdown():
    engine = ForecastingEngine(db=None, restaurant_id=1)

    # Setup mock repos with async methods
    engine.menu_item_recipe_repo = MagicMock()
    engine.recipe_ingredient_repo = MagicMock()
    engine.batch_recipe_repo = MagicMock()
    engine.batch_recipe_ingredient_repo = MagicMock()
    engine.ingredient_repo = MagicMock()

    # Mock methods
    engine.menu_item_recipe_repo.get_recipe_ids_for_menu_item = AsyncMock(
        return_value=[100]
    )
    engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(
        return_value=[
            type(
                "RecipeIngredient",
                (object,),
                {
                    "ingredient_type": "ingredient",
                    "reference_id": 10,
                    "quantity_used": "2.5",
                },
            )()
        ]
    )
    engine.batch_recipe_repo.get_by_id = AsyncMock(
        return_value=type(
            "BatchRecipe", (object,), {"yield_quantity": "5", "yield_unit": "kg"}
        )()
    )
    engine.batch_recipe_ingredient_repo.get_by_batch_recipe_id = AsyncMock(
        return_value=[
            type(
                "BatchIngredient",
                (object,),
                {"ingredient_id": 20, "quantity_used": "10", "unit": "g"},
            )()
        ]
    )
    engine.ingredient_repo.get_by_id = AsyncMock(
        side_effect=lambda x: type("Ingredient", (object,), {"unit": "kg"})()
    )

    # Helpers used inside generate_ingredient_breakdown
    # Define normalize_unit and convert_unit for the test context if they are imported outside
    def normalize_unit(u):
        return u.lower()

    def convert_unit(qty, from_unit, to_unit):
        # simple conversion: if from g to kg, divide by 1000
        if from_unit == "g" and to_unit == "kg":
            return qty / Decimal(1000)
        if from_unit == to_unit:
            return qty
        raise ValueError("Unsupported conversion")

    # Patch them on the engine for the test
    engine.normalize_unit = normalize_unit
    engine.convert_unit = convert_unit

    # Input data
    forecast_breakdown = [
        {
            "menu_item_id": 1,
            "forecast_date": date(2025, 6, 1),
            "predicted_quantity": "3",
        }
    ]
    batch_recipe_breakdown = [
        {
            "batch_recipe_id": 200,
            "forecast_date": date(2025, 6, 1),
            "required_quantity": "10",
        }
    ]

    # We need to patch normalize_unit and convert_unit calls inside generate_ingredient_breakdown or rewrite calls
    # For now, we monkeypatch global helpers
    import builtins
    import sys

    mod = sys.modules[engine.__class__.__module__]
    setattr(mod, "normalize_unit", normalize_unit)
    setattr(mod, "convert_unit", convert_unit)

    result = await engine.generate_ingredient_breakdown(
        forecast_breakdown, batch_recipe_breakdown
    )
    assert isinstance(result, list)
    assert any(entry["ingredient_id"] == 10 for entry in result)
    assert any(entry["ingredient_id"] == 20 for entry in result)


@pytest.mark.asyncio
async def test_aggregate_ingredient_demand_for_reorder():
    engine = ForecastingEngine(db=None, restaurant_id=1)

    engine.ingredient_repo = MagicMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        side_effect=lambda x: type("Ingredient", (object,), {"unit": "kg"})()
    )

    today = date.today()

    forecast_breakdown = [
        {
            "ingredient_id": 10,
            "forecast_date": today,
            "quantity": "2.5",
            "source_type": "menu_item",
            "source_id": 1,
            "unit": "kg",
        },
        {
            "ingredient_id": 10,
            "forecast_date": today + timedelta(days=1),
            "quantity": "3.0",
            "source_type": "batch_recipe",
            "source_id": 2,
            "unit": "kg",
        },
        {
            "ingredient_id": 20,
            "forecast_date": today,
            "quantity": "1.0",
            "source_type": "menu_item",
            "source_id": 1,
            "unit": "kg",
        },
    ]

    aggregated = await engine.aggregate_ingredient_demand_for_reorder(
        forecast_breakdown, days=2
    )

    assert 10 in aggregated
    assert 20 in aggregated

    assert aggregated[10]["total_quantity"] == Decimal("5.5")
    assert aggregated[20]["total_quantity"] == Decimal("1.0")

    assert aggregated[10]["unit"] == "kg"
    assert isinstance(aggregated[10]["daily_breakdown"], list)


@pytest.mark.asyncio
async def test_derive_ingredient_usage_from_sales(monkeypatch):
    engine = ForecastingEngine(db=None, restaurant_id=1)

    # Mock load_data to return 2 sales
    sale1 = type(
        "Sale",
        (object,),
        {"menu_item_id": 1, "sale_timestamp": date(2025, 6, 1), "quantity_sold": 3},
    )
    sale2 = type(
        "Sale",
        (object,),
        {"menu_item_id": 2, "sale_timestamp": date(2025, 6, 2), "quantity_sold": 4},
    )
    engine.load_data = AsyncMock(return_value=[sale1, sale2])

    # Mock generate_batch_recipe_breakdown returns dummy batch data
    engine.generate_batch_recipe_breakdown = AsyncMock(
        return_value={
            # keys arbitrary, can be empty for test
        }
    )

    # Mock generate_ingredient_breakdown returns ingredient usage
    engine.generate_ingredient_breakdown = AsyncMock(
        return_value=[
            {
                "ingredient_id": 100,
                "forecast_date": date(2025, 6, 1),
                "quantity": "1.0",
            },
            {
                "ingredient_id": 101,
                "forecast_date": date(2025, 6, 2),
                "quantity": "2.0",
            },
        ]
    )

    usage = await engine.derive_ingredient_usage_from_sales(days=30)
    assert 100 in usage
    assert 101 in usage
    assert usage[100][date(2025, 6, 1)] == Decimal("1.0")
    assert usage[101][date(2025, 6, 2)] == Decimal("2.0")


@pytest.mark.asyncio
async def test_run_forecasting_pipeline(monkeypatch):
    engine = ForecastingEngine(db=None, restaurant_id=1)

    # Patch all async methods used in pipeline
    engine.load_data = AsyncMock(
        return_value=[
            type(
                "Sale",
                (object,),
                {
                    "menu_item_id": 1,
                    "sale_timestamp": date(2025, 6, 1),
                    "quantity_sold": 5,
                },
            )()
        ]
    )
    engine.preprocess_data = MagicMock(
        return_value=pd.DataFrame(
            {
                "menu_item_id": [1],
                "date": [pd.Timestamp("2025-06-01")],
                "quantity_sold": [5],
                "day_of_week": [0],
                "is_weekend": [0],
            }
        )
    )
    engine.train_model = MagicMock(return_value={1: MagicMock()})
    engine.predict_menu_item_demand = MagicMock(
        return_value=[
            {
                "menu_item_id": 1,
                "forecast_date": date(2025, 6, 1),
                "predicted_quantity": 5,
            }
        ]
    )
    engine.generate_batch_recipe_breakdown = AsyncMock(
        return_value={
            # dummy batch data
        }
    )
    engine.generate_ingredient_breakdown = AsyncMock(
        return_value=[
            {"ingredient_id": 10, "forecast_date": date(2025, 6, 1), "quantity": "5"}
        ]
    )
    engine.aggregate_ingredient_demand_for_reorder = AsyncMock(
        return_value={
            10: {
                "total_quantity": Decimal("5"),
                "unit": "count",
                "daily_breakdown": [(date(2025, 6, 1), Decimal("5"))],
            }
        }
    )

    result = await engine.run_forecasting_pipeline(
        horizon_days=1, reorder_horizon_days=1
    )
    assert isinstance(result, dict)
    assert 10 in result
    assert result[10]["total_quantity"] == Decimal("5")
