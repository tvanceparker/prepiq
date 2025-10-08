from decimal import Decimal
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.ingredients_repo import IngredientRepository
from app.services.inventory_stats_service import InventoryStatsService
from app.repositories.alerts_repo import AlertRepository
import math


class ReorderForecastEngine:
    """
    Engine for calculating reorder points, safety stock, and suggested reorder quantities
    for ingredients based on inventory statistics and forecasting data.

    Attributes:
        SERVICE_LEVEL_Z (Decimal): Z-score used for a 95% service level in safety stock calculations.
    """

    SERVICE_LEVEL_Z = Decimal("1.65")  # Z-score for 95% service level

    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str = None):
        """
        Initialize the reorder forecast engine with the necessary repositories and services.

        Args:
            db (AsyncSession): The async database session.
            restaurant_id (int): ID of the restaurant for which forecast data is handled.
        """
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.stats_service = InventoryStatsService(db, restaurant_id)
        self.alert_repo = AlertRepository(db,restaurant_id)
        self._abc_cache: Dict[int, str] = {}

    async def calculate_safety_stock(
        self, ingredient_id: int, lead_time: int
    ) -> Decimal:
        """
        Calculate the safety stock for an ingredient based on its standard deviation of usage and lead time.

        Args:
            ingredient_id (int): ID of the ingredient.
            lead_time (int): Lead time in days for ordering the ingredient.

        Returns:
            Decimal: The calculated safety stock rounded to two decimal places.
        """
        stddev_usage = await self.stats_service.get_std_dev_usage(ingredient_id)
        safety_stock = (
            self.SERVICE_LEVEL_Z * stddev_usage * Decimal(math.sqrt(lead_time))
        )
        safety_stock = safety_stock.quantize(Decimal("0.01"))
        print(
            f"[SAFETY STOCK] Ingredient {ingredient_id}: StdDev Usage={stddev_usage}, Lead Time={lead_time} days, Safety Stock={safety_stock}"
        )
        return safety_stock

    async def calculate_reorder_point(self, ingredient_id: int) -> Decimal:
        """
        Calculate the reorder point for an ingredient based on average daily usage, lead time, and safety stock.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            Decimal: The calculated reorder point rounded to two decimal places.
        """
        lead_time = await self.stats_service.get_lead_time_days(ingredient_id)
        avg_daily_usage = await self.stats_service.get_average_daily_usage(
            ingredient_id
        )
        lead_demand = avg_daily_usage * Decimal(lead_time)
        safety_stock = await self.calculate_safety_stock(ingredient_id, lead_time)
        reorder_point = (lead_demand + safety_stock).quantize(Decimal("0.01"))
        print(
            f"[REORDER POINT] Ingredient {ingredient_id}: Avg Daily Usage={avg_daily_usage}, Lead Time={lead_time}, Lead Demand={lead_demand}, Safety Stock={safety_stock}, Reorder Point={reorder_point}"
        )
        return reorder_point

    async def calculate_max_order(
        self, ingredient_id: int, current_stock: Decimal
    ) -> Decimal:
        """
        Calculate the maximum allowable order quantity for an ingredient based on its max stock level and current stock.

        Args:
            ingredient_id (int): ID of the ingredient.
            current_stock (Decimal): Current inventory level of the ingredient.

        Returns:
            Decimal: The maximum allowable order quantity.
        """
        max_stock = await self.stats_service.get_max_stock_level(ingredient_id)
        if max_stock is not None:
            max_allowed = max_stock - current_stock
            max_allowed = max(max_allowed, Decimal(0))
            print(
                f"[MAX ORDER] Ingredient {ingredient_id}: Max Stock={max_stock}, Current Stock={current_stock}, Max Allowed Order={max_allowed}"
            )
            return max_allowed
        print(f"[MAX ORDER] Ingredient {ingredient_id}: No max stock limit set; treating as unlimited.")
        return Decimal("Infinity")

    async def suggest_reorder_quantity(
        self,
        ingredient_id: int,
        lead_demand: Decimal,
        shelf_demand: Decimal,
        total_demand: Decimal,
        unit: str,
        lead_time: int,
    ) -> Decimal:
        """
        Suggest the reorder quantity for an ingredient based on demand, safety stock, and MOQ (minimum order quantity).

        Args:
            ingredient_id (int): ID of the ingredient.
            lead_demand (Decimal): The demand for the ingredient during the lead time.
            shelf_demand (Decimal): The forecasted demand for the ingredient during the shelf life.
            total_demand (Decimal): Total demand considering both lead and shelf life.
            unit (str): Unit of measurement for the ingredient.
            lead_time (int): Lead time in days.

        Returns:
            Decimal: The suggested reorder quantity rounded to two decimal places.
        """
        abc_class = await self.classify_abc_item(ingredient_id)
        current_stock, current_unit = await self.stats_service.get_current_inventory(
            ingredient_id
        )
        safety_stock = await self.calculate_safety_stock(ingredient_id, lead_time)
        moq = await self.stats_service.get_moq(ingredient_id)

        reorder_point = lead_demand + safety_stock
        print(
            f"[SUGGEST REORDER] Ingredient {ingredient_id}: ABC Class={abc_class}, Current Stock={current_stock} {current_unit}, Lead Demand={lead_demand}, Shelf Demand={shelf_demand}, Safety Stock={safety_stock}, MOQ={moq}"
        )

        if current_stock >= reorder_point:
            print(
                f"[NO REORDER] Ingredient {ingredient_id}: Current stock ({current_stock}) >= reorder point ({reorder_point}), no order needed."
            )
            return Decimal("0.00")
        else:
            await self.create_low_stock_alert(ingredient_id, current_stock, reorder_point)

        reorder_target = lead_demand + shelf_demand + safety_stock
        raw_order_qty = reorder_target - current_stock

        print(
            f"[ORDER QTY CALC] Ingredient {ingredient_id}: Reorder Target={reorder_target}, Raw Order Qty={raw_order_qty}"
        )

        if abc_class == "A":
            order_qty = max(raw_order_qty, moq)
        elif abc_class == "B":
            order_qty = max(raw_order_qty * Decimal("1.1"), moq)
        else:  # 'C'
            order_qty = max(raw_order_qty * Decimal("1.5"), moq * 2)

        max_allowed = await self.calculate_max_order(ingredient_id, current_stock)
        order_qty = min(order_qty, max_allowed)

        order_qty = max(order_qty, Decimal("0")).quantize(Decimal("0.01"))
        print(
            f"[FINAL ORDER QTY] Ingredient {ingredient_id}: After ABC and Max Stock constraints, Suggested Order Qty = {order_qty} {unit}"
        )
        return order_qty

    async def classify_abc_item(self, ingredient_id: int) -> str:
        """
        Classify an ingredient into an ABC category based on its usage and cost.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            str: The ABC classification ('A', 'B', or 'C') of the ingredient.
        """
        cached = self._abc_cache.get(ingredient_id)
        if cached:
            print(
                f"[ABC CLASSIFICATION] Ingredient {ingredient_id}: Using cached classification '{cached}'"
            )
            return cached

        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        abc = ingredient.abc_class or "C"
        self._abc_cache[ingredient_id] = abc
        print(
            f"[ABC CLASSIFICATION] Ingredient {ingredient_id}: Retrieved classification '{abc}' from database"
        )
        return abc

    async def classify_all_ingredients(self, days: int = 90):
        """
        Automatically classify all ingredients based on their consumption value (usage * cost)
        over the past `days`. Updates the ABC classification in the ingredients table.

        Args:
            days (int, optional): Number of days to consider for classification. Defaults to 90.
        """
        ingredients = await self.ingredient_repo.get_all()
        usage_data = []

        self._abc_cache = {}

        for ingredient in ingredients:
            usage = await self.stats_service.get_total_usage_last_n_days(
                ingredient.ingredient_id, days
            )
            cost = ingredient.unit_cost or Decimal("0")
            value = usage * cost
            usage_data.append((ingredient.ingredient_id, value, ingredient.abc_class))

        if not usage_data:
            print("[ABC CLASSIFICATION] No ingredients found to classify.")
            return

        usage_data.sort(key=lambda x: x[1], reverse=True)
        total_value = sum(v for _, v, _ in usage_data)
        if total_value == 0:
            print(
                f"[ABC CLASSIFICATION] Total consumption value is zero across last {days} days; defaulting all to 'C'."
            )

        cumulative = Decimal("0")

        for ingredient_id, value, current_class in usage_data:
            cumulative += value
            pct = (cumulative / total_value * Decimal("100")) if total_value else Decimal("100")
            if pct <= Decimal("70"):
                abc = "A"
            elif pct <= Decimal("90"):
                abc = "B"
            else:
                abc = "C"

            self._abc_cache[ingredient_id] = abc

            if current_class != abc:
                await self.ingredient_repo.update(ingredient_id, {"abc_class": abc})
                print(
                    f"[ABC CLASSIFICATION] Ingredient {ingredient_id}: Updated from '{current_class}' to '{abc}' (value={value}, cumulative_pct={pct})"
                )
            else:
                print(
                    f"[ABC CLASSIFICATION] Ingredient {ingredient_id}: Remains '{abc}' (value={value}, cumulative_pct={pct})"
                )

    async def create_low_stock_alert(self, ingredient_id: int, current_stock: Decimal, reorder_point: Decimal):
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        message = (
            f"Low stock alert: '{ingredient.name}' stock is at {current_stock} "
            f"which is below the reorder point ({reorder_point})."
        )
        alert_data = {
            "restaurant_id": self.restaurant_id,
            "employee_id": None,  # system-generated
            "role": None,
            "alert_type": "LowStock",
            "message": message,
            "status": "Active",
            "is_acknowledged": 0,
        }
        await self.alert_repo.create(alert_data)
        print(f"[ALERT CREATED] {message}")
