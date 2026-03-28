"""
Shared fixtures for EOD pipeline tests.
"""
import pytest
import pytest_asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Import ALL ORM models to ensure complete SQLAlchemy mapper configuration
# This prevents InvalidRequestError for missing relationship targets
from app.db.models.activity_logs_orm import ActivityLog
from app.db.models.alerts_orm import Alert
from app.db.models.batch_recipe_forecast_breakdown_orm import BatchRecipeForecastBreakdown
from app.db.models.batch_recipe_ingredients_orm import BatchRecipeIngredient
from app.db.models.batch_recipes_orm import BatchRecipe
from app.db.models.clock_events_orm import ClockEvent
from app.db.models.daily_forecast_accuracy_orm import DailyForecastAccuracy
from app.db.models.devices_orm import Device
from app.db.models.employees_orm import Employee
from app.db.models.eod_run_ledger_orm import EODRunLedger
from app.db.models.eod_purchase_order_suggestion_orm import EODPurchaseOrderSuggestion
from app.db.models.error_logs_orm import ErrorLog
from app.db.models.forecast_accuracy_orm import ForecastAccuracy
from app.db.models.forecast_breakdown_orm import ForecastBreakdown
from app.db.models.forecasts_orm import Forecast
from app.db.models.ingredient_forecast_breakdown_orm import IngredientForecastBreakdown
from app.db.models.ingredient_supplier_orm import IngredientSupplier
from app.db.models.ingredients_orm import Ingredient
from app.db.models.inventory_lot_orm import InventoryLot
from app.db.models.inventory_orm import Inventory
from app.db.models.inventory_usage_log_orm import InventoryUsageLog
from app.db.models.lead_time_data_orm import LeadTimeData
from app.db.models.menu_item_batch_usage_orm import MenuItemBatchUsage
from app.db.models.menu_item_recipes_orm import MenuItemRecipe
from app.db.models.menu_items_orm import MenuItem
from app.db.models.order_item_modifiers_orm import OrderItemModifier
from app.db.models.order_items_orm import OrderItem
from app.db.models.orders_orm import Order
from app.db.models.payments_orm import Payment
from app.db.models.permissions_orm import Permission
from app.db.models.purchase_order_items_orm import PurchaseOrderItem
from app.db.models.purchase_orders_orm import PurchaseOrder
from app.db.models.recipe_ingredients_orm import RecipeIngredient
from app.db.models.recipe_modifiers_orm import RecipeModifier
from app.db.models.restaurants_orm import Restaurant
from app.db.models.role_permissions_orm import RolePermission
from app.db.models.roles_orm import Role
from app.db.models.sales_orm import Sales
from app.db.models.scheduled_shifts_orm import ScheduledShift
from app.db.models.spoilage_data_orm import SpoilageData
from app.db.models.supplier_orm import Supplier
from app.db.models.supplier_preferences_orm import SupplierPreference
from app.db.models.traffic_data_orm import TrafficData
from app.db.models.weather_data_orm import WeatherData


@pytest.fixture
def restaurant_id():
    """Standard restaurant ID for tests."""
    return 1


@pytest.fixture
def subscription_tier():
    """Master tier for advanced features."""
    return "master"


@pytest.fixture
def test_date():
    """Fixed test date for reproducibility."""
    return date(2025, 11, 20)


@pytest_asyncio.fixture
async def mock_db_session():
    """Mock async database session."""
    session = AsyncMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.close = AsyncMock()
    session.in_transaction = MagicMock(return_value=False)
    return session


@pytest.fixture
def sample_sales_data(test_date):
    """Sample sales data for testing."""
    return [
        Sales(
            sale_id=1,
            restaurant_id=1,
            menu_item_id=101,
            quantity_sold=10,
            sale_timestamp=datetime.combine(test_date, datetime.min.time()),
        ),
        Sales(
            sale_id=2,
            restaurant_id=1,
            menu_item_id=102,
            quantity_sold=5,
            sale_timestamp=datetime.combine(test_date, datetime.min.time()),
        ),
    ]


@pytest.fixture
def sample_menu_items():
    """Sample menu items for testing."""
    return [
        MenuItem(
            menu_item_id=101,
            restaurant_id=1,
            name="Burger",
            category="Entrees",
            price=Decimal("12.50"),
            is_active=True,
        ),
        MenuItem(
            menu_item_id=102,
            restaurant_id=1,
            name="Salad",
            category="Entrees",
            price=Decimal("15.00"),
            is_active=True,
        ),
    ]


@pytest.fixture
def sample_ingredients():
    """Sample ingredients for testing."""
    items = [
        Ingredient(
            ingredient_id=1001,
            restaurant_id=1,
            name="Ground Beef",
            unit="lb",
            abc_class="A",
        ),
        Ingredient(
            ingredient_id=1002,
            restaurant_id=1,
            name="Lettuce",
            unit="head",
            abc_class="B",
        ),
        Ingredient(
            ingredient_id=1003,
            restaurant_id=1,
            name="Tomato",
            unit="lb",
            abc_class="C",
        ),
    ]

    # Ensure attributes used in tests exist
    items[0].unit_cost = Decimal("5.00")
    items[1].unit_cost = Decimal("2.00")
    items[2].unit_cost = Decimal("3.00")
    for item in items:
        item.shelf_life_days = 7
        item.max_stock_level = Decimal("100.00")

    return items


@pytest.fixture
def sample_inventory(sample_ingredients):
    """Sample inventory for testing."""
    return [
        Inventory(
            inventory_id=2001,
            restaurant_id=1,
            ingredient_id=1001,
            quantity_on_hand=Decimal("50.00"),
            unit="lb",
            shelf_life_days=7,
        ),
        Inventory(
            inventory_id=2002,
            restaurant_id=1,
            ingredient_id=1002,
            quantity_on_hand=Decimal("20.00"),
            unit="head",
            shelf_life_days=5,
        ),
        Inventory(
            inventory_id=2003,
            restaurant_id=1,
            ingredient_id=1003,
            quantity_on_hand=Decimal("15.00"),
            unit="lb",
            shelf_life_days=4,
        ),
    ]


@pytest.fixture
def sample_suppliers():
    """Sample supplier data for testing."""
    return [
        IngredientSupplier(
            ingredient_supplier_id=3001,
            restaurant_id=1,
            ingredient_id=1001,
            supplier_id=501,
            lead_time_days=3,
            min_order_quantity=Decimal("10.00"),
            pack_size=1,
            quantity_per_pack_item=Decimal("5.00"),
            unit="lb",
            cost_per_unit=Decimal("4.50"),
            preferred=True,
            supplier_priority=1,
        ),
        IngredientSupplier(
            ingredient_supplier_id=3002,
            restaurant_id=1,
            ingredient_id=1002,
            supplier_id=502,
            lead_time_days=2,
            min_order_quantity=Decimal("5.00"),
            pack_size=1,
            quantity_per_pack_item=Decimal("1.00"),
            unit="head",
            cost_per_unit=Decimal("1.80"),
            preferred=True,
            supplier_priority=1,
        ),
    ]


@pytest.fixture
def sample_recipe_ingredients():
    """Sample recipe ingredients for menu items."""
    return [
        RecipeIngredient(
            recipe_ingredient_id=4001,
            restaurant_id=1,
            recipe_id=301,
            ingredient_type="ingredient",
            reference_id=1001,  # Ground Beef
            quantity_used=Decimal("0.25"),
        ),
        RecipeIngredient(
            recipe_ingredient_id=4002,
            restaurant_id=1,
            recipe_id=301,
            ingredient_type="ingredient",
            reference_id=1002,  # Lettuce
            quantity_used=Decimal("0.10"),
        ),
        RecipeIngredient(
            recipe_ingredient_id=4003,
            restaurant_id=1,
            recipe_id=302,
            ingredient_type="ingredient",
            reference_id=1002,  # Lettuce
            quantity_used=Decimal("0.50"),
        ),
        RecipeIngredient(
            recipe_ingredient_id=4004,
            restaurant_id=1,
            recipe_id=302,
            ingredient_type="ingredient",
            reference_id=1003,  # Tomato
            quantity_used=Decimal("0.20"),
        ),
    ]


@pytest.fixture
def sample_eod_ledger(test_date):
    """Sample EOD ledger entry."""
    return EODRunLedger(
        restaurant_id=1,
        run_date=test_date,
        started_at=datetime.utcnow(),
        running=False,
        sales_deducted=False,
        forecast_completed=False,
        reorder_completed=False,
        po_written=False,
        finished_at=None,
        errors=None,
    )


@pytest.fixture
def mock_forecasting_engine():
    """Mock forecasting engine with common methods."""
    engine = AsyncMock()
    engine.initialize = AsyncMock()
    engine.run_forecasting_pipeline = AsyncMock(return_value={
        1001: {
            "total_quantity": Decimal("30.00"),
            "unit": "lb",
            "daily_breakdown": [
                (date.today() + timedelta(days=i), Decimal("1.00"))
                for i in range(30)
            ],
        },
        1002: {
            "total_quantity": Decimal("15.00"),
            "unit": "head",
            "daily_breakdown": [
                (date.today() + timedelta(days=i), Decimal("0.50"))
                for i in range(30)
            ],
        },
    })
    engine.evaluate_and_record_accuracy = AsyncMock()
    engine.evaluate_and_record_daily_forecast_accuracy = AsyncMock()
    engine.derive_ingredient_usage_from_sales = AsyncMock(return_value={})
    return engine


@pytest.fixture
def mock_reorder_engine():
    """Mock reorder engine with common methods."""
    engine = AsyncMock()
    engine.classify_all_ingredients = AsyncMock()
    engine.suggest_reorder_quantity = AsyncMock(return_value=Decimal("10.00"))
    engine.classify_abc_item = AsyncMock(return_value="A")
    engine.calculate_safety_stock = AsyncMock(return_value=Decimal("5.00"))
    engine.calculate_reorder_point = AsyncMock(return_value=Decimal("15.00"))
    return engine


@pytest.fixture
def mock_inventory_stats():
    """Mock inventory stats service."""
    stats = AsyncMock()
    stats.get_average_daily_usage = AsyncMock(return_value=Decimal("2.00"))
    stats.get_std_dev_usage = AsyncMock(return_value=Decimal("0.50"))
    stats.get_current_inventory = AsyncMock(return_value=(Decimal("50.00"), "lb"))
    stats.get_lead_time_days = AsyncMock(return_value=3)
    stats.get_moq = AsyncMock(return_value=Decimal("10.00"))
    stats.get_max_stock_level = AsyncMock(return_value=Decimal("100.00"))
    stats.get_shelf_life_days = AsyncMock(return_value=7)
    stats.get_total_usage_last_n_days = AsyncMock(return_value=Decimal("60.00"))
    return stats
