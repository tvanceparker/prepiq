# app/services/inventory_stats_service.py

from datetime import date
from decimal import Decimal
from typing import Any, Dict, Optional
import math
from statistics import mean, pstdev
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.inventory_repo import InventoryRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.services.forecasting_engine import ForecastingEngine
from app.services.utils.unit_conversion import convert_unit
from app.core.logging import logger
from app.utils.logger_helpers import log_method


class InventoryStatsService:
    """
    Service layer responsible for computing inventory-related statistics such as
    average usage, standard deviation, stock levels, shelf life, etc.
    """

    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str = None):
        """
        Initialize the InventoryStatsService with repositories and forecasting engine.

        Args:
            db (AsyncSession): The async database session.
            restaurant_id (int): ID of the restaurant for which data is handled.
        """
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.ingredient_supplier_repo = IngredientSupplierRepository(db, restaurant_id)
        self.forecasting_engine = ForecastingEngine(db, restaurant_id)
        self._sales_derived_usage_cache: Dict[int, Dict[int, Dict[date, Decimal]]] = {}

    async def _get_sales_derived_usage(
        self, days: int
    ) -> Dict[int, Dict[date, Decimal]]:
        cached_usage = self._sales_derived_usage_cache.get(days)
        if cached_usage is not None:
            logger.debug(
                "[INV STATS] SalesDerivedUsage cache_hit days=%s ingredients=%s",
                days,
                len(cached_usage),
            )
            return cached_usage

        usage_by_ingredient = await self.forecasting_engine.derive_ingredient_usage_from_sales(
            days
        )
        self._sales_derived_usage_cache[days] = usage_by_ingredient
        logger.debug(
            "[INV STATS] SalesDerivedUsage cache_fill days=%s ingredients=%s",
            days,
            len(usage_by_ingredient),
        )
        return usage_by_ingredient

    @log_method("InventoryStats: Average Daily Usage")
    async def get_average_daily_usage(
        self, ingredient_id: int, days: int = 30
    ) -> Decimal:
        """
        Calculate the average daily usage of an ingredient over a given number of days.

        Args:
            ingredient_id (int): ID of the ingredient.
            days (int, optional): Number of days to average over. Defaults to 30.

        Returns:
            Decimal: The average daily usage rounded to two decimal places.
        """
        usage_data = await self.inventory_usage_log_repo.get_daily_usage(
            ingredient_id, days
        )
        if len(usage_data) >= 14:
            daily_totals = [float(usage) for _, usage in usage_data]
            logger.debug(
                f"[INV STATS] AvgDaily ingredient={ingredient_id} source=logs days={days} samples={len(daily_totals)}"
            )
        else:
            logger.debug(
                f"[INV STATS] AvgDaily Fallback ingredient={ingredient_id} log_samples={len(usage_data)} using=sales-derived"
            )
            usage_by_ingredient = await self._get_sales_derived_usage(days)
            ingredient_usage = usage_by_ingredient.get(ingredient_id, {})
            daily_totals = list(ingredient_usage.values())

        if not daily_totals:
            logger.info(
                f"[INV STATS] AvgDaily ingredient={ingredient_id} no_usage_data returning=0"
            )
            return Decimal("0")

        avg_usage = Decimal(mean(daily_totals)).quantize(Decimal("0.01"))
        logger.debug(
            f"[INV STATS] AvgDaily ingredient={ingredient_id} value={avg_usage}"
        )
        return avg_usage

    @log_method("InventoryStats: Std Dev Usage")
    async def get_std_dev_usage(self, ingredient_id: int, days: int = 30) -> Decimal:
        """
        Calculate the standard deviation of ingredient usage over a given number of days.

        Args:
            ingredient_id (int): ID of the ingredient.
            days (int, optional): Number of days to analyze. Defaults to 30.

        Returns:
            Decimal: Standard deviation of usage rounded to two decimal places.
        """
        usage_data = await self.inventory_usage_log_repo.get_daily_usage(
            ingredient_id, days
        )
        if len(usage_data) >= 14:
            daily_totals = [float(usage) for _, usage in usage_data]
            logger.debug(
                f"[INV STATS] StdDev ingredient={ingredient_id} source=logs days={days} samples={len(daily_totals)}"
            )
        else:
            logger.debug(
                f"[INV STATS] StdDev Fallback ingredient={ingredient_id} log_samples={len(usage_data)} using=sales-derived"
            )
            usage_by_ingredient = await self._get_sales_derived_usage(days)
            ingredient_usage = usage_by_ingredient.get(ingredient_id, {})
            daily_totals = list(ingredient_usage.values())

        if len(daily_totals) < 2:
            logger.info(
                f"[INV STATS] StdDev ingredient={ingredient_id} insufficient_samples returning=0"
            )
            return Decimal("0")

        std_dev = Decimal(pstdev(daily_totals)).quantize(Decimal("0.01"))
        logger.debug(
            f"[INV STATS] StdDev ingredient={ingredient_id} value={std_dev}"
        )
        return std_dev

    @log_method("InventoryStats: Current Inventory")
    async def get_current_inventory(self, ingredient_id: int) -> tuple[Decimal, str]:
        """
        Retrieve the current inventory quantity and unit for a given ingredient.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            tuple[Decimal, str]: Quantity on hand and unit of measure.
        """
        inventory = await self.inventory_repo.get_inventory_by_ingredient(ingredient_id)
        if not inventory:
            logger.info(
                f"[INV STATS] CurrentInventory ingredient={ingredient_id} missing returning=0"
            )
            return Decimal("0.00"), ""
        qty = Decimal(inventory.quantity_on_hand or 0).quantize(Decimal("0.01"))
        unit = inventory.unit or ""
        logger.debug(
            f"[INV STATS] CurrentInventory ingredient={ingredient_id} qty={qty} unit={unit}"
        )
        return qty, unit

    def _lot_is_available(self, lot: Any) -> bool:
        return (
            getattr(getattr(lot, "status", None), "value", getattr(lot, "status", None))
            == "available"
        )

    async def _compute_lot_remaining(self, lot: Any) -> Decimal:
        usage_logs = await self.inventory_usage_log_repo.get_all_by_lot_id(lot.lot_id)
        used_quantity = Decimal("0.00")
        wasted_quantity = Decimal("0.00")
        added_quantity = Decimal("0.00")

        for log in usage_logs:
            qty = Decimal(str(log.used_quantity or 0))
            usage_type = getattr(log.usage_type, "value", log.usage_type)
            if usage_type in {"sale", "batch_production", "batch_output"}:
                used_quantity += qty
            elif usage_type in {"waste", "spoilage", "manual_adjustment"}:
                wasted_quantity += qty
            elif usage_type == "manual_addition":
                added_quantity += qty

        lot_qty = Decimal(str(lot.quantity or 0))
        return (lot_qty - used_quantity - wasted_quantity + added_quantity).quantize(
            Decimal("0.01")
        )

    @log_method("InventoryStats: Usable Inventory")
    async def get_usable_inventory(
        self,
        ingredient_id: int,
        usable_until_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        inventory = await self.inventory_repo.get_inventory_by_ingredient(ingredient_id)
        if not inventory:
            logger.info(
                "[INV STATS] UsableInventory ingredient=%s missing_inventory returning=0",
                ingredient_id,
            )
            return {
                "quantity": Decimal("0.00"),
                "unit": "",
                "total_quantity": Decimal("0.00"),
                "excluded_quantity": Decimal("0.00"),
                "source": "missing_assumed_zero",
                "fallback_used": True,
                "conversion_fallback": False,
                "lot_count": 0,
                "eligible_lot_count": 0,
                "usable_until_date": usable_until_date,
            }

        inventory_unit = inventory.unit or ""
        summary_quantity = Decimal(str(inventory.quantity_on_hand or 0)).quantize(
            Decimal("0.01")
        )
        lots = await self.inventory_lot_repo.get_lots_by_ingredient_id(ingredient_id)
        available_lots = [lot for lot in lots if self._lot_is_available(lot)]
        if not available_lots:
            logger.debug(
                "[INV STATS] UsableInventory ingredient=%s no_lots fallback_summary=%s",
                ingredient_id,
                summary_quantity,
            )
            return {
                "quantity": summary_quantity,
                "unit": inventory_unit,
                "total_quantity": summary_quantity,
                "excluded_quantity": Decimal("0.00"),
                "source": "inventory_summary",
                "fallback_used": True,
                "conversion_fallback": False,
                "lot_count": 0,
                "eligible_lot_count": 0,
                "usable_until_date": usable_until_date,
            }

        total_quantity = Decimal("0.00")
        usable_quantity = Decimal("0.00")
        excluded_quantity = Decimal("0.00")
        conversion_fallback = False
        eligible_lot_count = 0

        for lot in available_lots:
            remaining = await self._compute_lot_remaining(lot)
            if remaining <= 0:
                continue

            try:
                remaining_in_inventory_unit = Decimal(
                    str(convert_unit(float(remaining), lot.unit, inventory_unit))
                ).quantize(Decimal("0.01"))
            except Exception:
                remaining_in_inventory_unit = remaining
                conversion_fallback = True

            total_quantity += remaining_in_inventory_unit

            if (
                usable_until_date is not None
                and getattr(lot, "spoilage_expected_date", None) is not None
                and lot.spoilage_expected_date <= usable_until_date
            ):
                excluded_quantity += remaining_in_inventory_unit
                continue

            usable_quantity += remaining_in_inventory_unit
            eligible_lot_count += 1

        total_quantity = total_quantity.quantize(Decimal("0.01"))
        usable_quantity = usable_quantity.quantize(Decimal("0.01"))
        excluded_quantity = excluded_quantity.quantize(Decimal("0.01"))
        source = "usable_lot_projection" if usable_until_date is not None else "available_lots"
        logger.debug(
            "[INV STATS] UsableInventory ingredient=%s usable=%s total=%s excluded=%s usable_until=%s eligible_lots=%s total_lots=%s",
            ingredient_id,
            usable_quantity,
            total_quantity,
            excluded_quantity,
            usable_until_date,
            eligible_lot_count,
            len(available_lots),
        )
        return {
            "quantity": usable_quantity if usable_until_date is not None else total_quantity,
            "unit": inventory_unit,
            "total_quantity": total_quantity,
            "excluded_quantity": excluded_quantity,
            "source": source,
            "fallback_used": False,
            "conversion_fallback": conversion_fallback,
            "lot_count": len(available_lots),
            "eligible_lot_count": eligible_lot_count,
            "usable_until_date": usable_until_date,
        }

    @log_method("InventoryStats: Lead Time")
    async def get_lead_time_days(self, ingredient_id: int) -> int:
        """
        Get the lead time (in days) from the preferred or lowest-priority supplier.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            int: Number of lead time days.
        """
        supplier = await self.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier(
            ingredient_id
        )
        lead_time = (
            supplier.lead_time_days
            if supplier and supplier.lead_time_days is not None
            else 1
        )
        logger.debug(
            f"[INV STATS] LeadTime ingredient={ingredient_id} days={lead_time}"
        )
        return lead_time

    @log_method("InventoryStats: MOQ")
    async def get_moq(self, ingredient_id: int) -> Decimal:
        """
        Get the minimum order quantity (MOQ) from the preferred or lowest-priority supplier.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            Decimal: Minimum order quantity.
        """
        supplier = await self.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier(
            ingredient_id
        )
        moq = (
            Decimal(supplier.min_order_quantity)
            if supplier and supplier.min_order_quantity is not None
            else Decimal("1")
        )
        logger.debug(f"[INV STATS] MOQ ingredient={ingredient_id} moq={moq}")
        return moq

    @log_method("InventoryStats: Max Stock Level")
    async def get_max_stock_level(self, ingredient_id: int) -> Optional[Decimal]:
        """
        Get the maximum stock level defined for the ingredient, if available.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            Optional[Decimal]: Maximum stock level or None if undefined.
        """
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        if ingredient and ingredient.max_stock_level is not None:
            max_stock = Decimal(ingredient.max_stock_level)
            logger.debug(
                f"[INV STATS] MaxStock ingredient={ingredient_id} max={max_stock}"
            )
            return max_stock
        logger.debug(f"[INV STATS] MaxStock ingredient={ingredient_id} none_defined")
        return None

    @log_method("InventoryStats: Shelf Life")
    async def get_shelf_life_days(self, ingredient_id: int) -> int:
        """
        Retrieve the shelf life in days for the specified ingredient.

        Args:
            ingredient_id (int): ID of the ingredient.

        Returns:
            int: Shelf life in days, or default value (30) if not defined.
        """
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        shelf_life = (
            ingredient.shelf_life_days
            if ingredient and ingredient.shelf_life_days is not None
            else 30
        )
        logger.debug(
            f"[INV STATS] ShelfLife ingredient={ingredient_id} days={shelf_life}"
        )
        return shelf_life

    @log_method("InventoryStats: Total Usage Window")
    async def get_total_usage_last_n_days(
        self, ingredient_id: int, days: int = 90
    ) -> Decimal:
        """
        Compute the total usage of an ingredient over the last N days.

        Args:
            ingredient_id (int): ID of the ingredient.
            days (int, optional): Number of days to look back. Defaults to 90.

        Returns:
            Decimal: Total usage rounded to two decimal places.
        """
        usage_data = await self.inventory_usage_log_repo.get_daily_usage(
            ingredient_id, days
        )

        if usage_data:
            total = sum((Decimal(usage) for _, usage in usage_data), Decimal("0"))
            logger.debug(
                f"[INV STATS] TotalUsage ingredient={ingredient_id} source=logs samples={len(usage_data)} days={days}"
            )
        else:
            logger.debug(
                f"[INV STATS] TotalUsage Fallback ingredient={ingredient_id} using=sales-derived days={days}"
            )
            usage_by_ingredient = await self._get_sales_derived_usage(days)
            ingredient_usage = usage_by_ingredient.get(ingredient_id, {})
            total = sum((Decimal(value) for value in ingredient_usage.values()), Decimal("0"))

        total = total.quantize(Decimal("0.01"))
        logger.debug(
            f"[INV STATS] TotalUsage ingredient={ingredient_id} days={days} total={total}"
        )
        return total
