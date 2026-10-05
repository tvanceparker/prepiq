# app/services/inventory_stats_service.py

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
import math
from statistics import mean, pstdev
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.inventory_repo import InventoryRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.services.reorder.lot_projection import ReorderLotProjectionHelper
from app.services.forecasting_engine import ForecastingEngine
from app.services.utils.unit_conversion import convert_unit
from app.services.utils.inventory_consumption import remaining_quantity
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
        self.reorder_lot_projection = ReorderLotProjectionHelper()
        self._sales_derived_usage_cache: Dict[int, Dict[int, Dict[date, Decimal]]] = {}

    @staticmethod
    def _normalize_quantity(value: Any) -> Decimal:
        if value is None:
            return Decimal("0.00")
        return Decimal(str(value)).quantize(Decimal("0.000001"))

    def _build_usable_inventory_payload(
        self,
        *,
        quantity: Any,
        unit: str,
        total_quantity: Any,
        excluded_quantity: Any,
        source: str,
        fallback_used: bool,
        conversion_fallback: bool,
        lot_count: int,
        eligible_lot_count: int,
        projected_waste_quantity: Any = None,
        lot_projection_summary: Optional[List[Dict[str, Any]]] = None,
        lot_consumption_trace: Optional[List[Dict[str, Any]]] = None,
        fefo_applied: bool = False,
        usable_until_date: Optional[date] = None,
        projection_start_date: Optional[date] = None,
        projection_end_date: Optional[date] = None,
        unmet_demand_quantity: Any = None,
        projected_remaining_quantity: Any = None,
        projected_consumed_quantity: Any = None,
        reconciliation_required: bool = False,
    ) -> Dict[str, Any]:
        return {
            "reconciliation_required": reconciliation_required,
            "quantity": self._normalize_quantity(quantity),
            "unit": unit or "",
            "total_quantity": self._normalize_quantity(total_quantity),
            "excluded_quantity": self._normalize_quantity(excluded_quantity),
            "source": source,
            "fallback_used": fallback_used,
            "conversion_fallback": conversion_fallback,
            "lot_count": lot_count,
            "eligible_lot_count": eligible_lot_count,
            "projected_waste_quantity": self._normalize_quantity(
                projected_waste_quantity
                if projected_waste_quantity is not None
                else excluded_quantity
            ),
            "lot_projection_summary": lot_projection_summary or [],
            "lot_consumption_trace": lot_consumption_trace or [],
            "fefo_applied": fefo_applied,
            "usable_until_date": usable_until_date,
            "projection_start_date": projection_start_date,
            "projection_end_date": projection_end_date,
            "unmet_demand_quantity": self._normalize_quantity(unmet_demand_quantity),
            "projected_remaining_quantity": self._normalize_quantity(
                projected_remaining_quantity
            ),
            "projected_consumed_quantity": self._normalize_quantity(
                projected_consumed_quantity
            ),
        }

    def _log_usable_inventory_path(
        self,
        *,
        ingredient_id: int,
        path: str,
        quantity: Any,
        total_quantity: Any,
        excluded_quantity: Any,
        usable_until_date: Optional[date],
        eligible_lot_count: int,
        lot_count: int,
        conversion_fallback: bool,
        fefo_applied: bool,
    ) -> None:
        logger.info(
            "[INV STATS] UsableInventory ingredient=%s path=%s usable=%s total=%s excluded=%s usable_until=%s eligible_lots=%s total_lots=%s conversion_fallback=%s fefo=%s",
            ingredient_id,
            path,
            self._normalize_quantity(quantity),
            self._normalize_quantity(total_quantity),
            self._normalize_quantity(excluded_quantity),
            usable_until_date,
            eligible_lot_count,
            lot_count,
            conversion_fallback,
            fefo_applied,
        )

    async def _get_sales_derived_usage(
        self, days: int
    ) -> Dict[int, Dict[date, Decimal]]:
        cache_key = (days, getattr(self, "as_of_date", None) or date.today())
        cached_usage = self._sales_derived_usage_cache.get(cache_key)
        if cached_usage is not None:
            logger.debug(
                "[INV STATS] SalesDerivedUsage cache_hit days=%s ingredients=%s",
                days,
                len(cached_usage),
            )
            return cached_usage

        self.forecasting_engine.forecast_origin = getattr(self, "as_of_date", None) or date.today()
        usage_by_ingredient = await self.forecasting_engine.derive_ingredient_usage_from_sales(
            days
        )
        self._sales_derived_usage_cache[cache_key] = usage_by_ingredient
        logger.debug(
            "[INV STATS] SalesDerivedUsage cache_fill days=%s ingredients=%s",
            days,
            len(usage_by_ingredient),
        )
        return usage_by_ingredient

    async def _daily_demand_series(self, ingredient_id, days):
        anchor = getattr(self, "as_of_date", None) or date.today()
        history = await self.inventory_usage_log_repo.get_daily_usage(ingredient_id, days, as_of_date=anchor)
        totals = {}
        for day, quantity in history:
            if isinstance(day, datetime):
                day = day.date()
            totals[day] = totals.get(day, Decimal("0")) + Decimal(str(quantity))
        observations = getattr(self, "observations", None)
        distinct_valid_days = sum(1 for day in totals if observations is None or observations.status(day) in {"complete", "closed"})
        source = "movement_consumption"
        if distinct_valid_days < min(14, days):
            derived = (await self._get_sales_derived_usage(days)).get(ingredient_id, {})
            if derived:
                source = "sales_equivalent_consumption"
                totals = {}
                for day, quantity in derived.items():
                    if isinstance(day, datetime):
                        day = day.date()
                    totals[day] = totals.get(day, Decimal("0")) + Decimal(str(quantity))
        observations = getattr(self, "observations", None)
        start = anchor - timedelta(days=days - 1)
        if observations is not None:
            self.demand_history_quality = {**observations.quality(start, anchor), "source": source}
            valid_days = [anchor - timedelta(days=offset) for offset in range(days)
                          if observations.status(anchor - timedelta(days=offset)) in {"complete", "closed"}]
            return [totals.get(day, Decimal("0")) for day in valid_days]
        self.demand_history_quality = {"review_required": True, "warnings": ["Zero-day completeness is unverified"],
                                       "zero_fill_assumed": True, "source": source}
        if not totals:
            return []
        # Statistics describe a full calendar window, not just movement days.
        return [totals.get(anchor - timedelta(days=offset), Decimal("0")) for offset in range(days)]

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
            Decimal: The average daily usage rounded to six decimal places.
        """
        daily_totals = await self._daily_demand_series(ingredient_id, days)

        if not daily_totals:
            logger.info(
                f"[INV STATS] AvgDaily ingredient={ingredient_id} no_usage_data returning=0"
            )
            return Decimal("0")

        avg_usage = Decimal(mean(daily_totals)).quantize(Decimal("0.000001"))
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
            Decimal: Standard deviation of usage rounded to six decimal places.
        """
        daily_totals = await self._daily_demand_series(ingredient_id, days)

        if len(daily_totals) < 2:
            logger.info(
                f"[INV STATS] StdDev ingredient={ingredient_id} insufficient_samples returning=0"
            )
            return Decimal("0")

        std_dev = Decimal(pstdev(daily_totals)).quantize(Decimal("0.000001"))
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
        qty = Decimal(inventory.quantity_on_hand or 0).quantize(Decimal("0.000001"))
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

    async def get_lot_remaining(self, lot: Any) -> Decimal:
        usage_logs = await self.inventory_usage_log_repo.get_all_by_lot_id(lot.lot_id)
        return remaining_quantity(lot, usage_logs).quantize(Decimal("0.000001"))

    @log_method("InventoryStats: Usable Inventory")
    async def get_usable_inventory(
        self,
        ingredient_id: int,
        usable_until_date: Optional[date] = None,
        *,
        daily_demand_points: Optional[List[Any]] = None,
        projection_start_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        inventory = await self.inventory_repo.get_inventory_by_ingredient(ingredient_id)
        projection_end_date = usable_until_date
        if not inventory:
            self._log_usable_inventory_path(
                ingredient_id=ingredient_id,
                path="missing_inventory",
                quantity=Decimal("0.00"),
                total_quantity=Decimal("0.00"),
                excluded_quantity=Decimal("0.00"),
                usable_until_date=usable_until_date,
                eligible_lot_count=0,
                lot_count=0,
                conversion_fallback=False,
                fefo_applied=False,
            )
            return self._build_usable_inventory_payload(
                quantity=Decimal("0.00"),
                unit="",
                total_quantity=Decimal("0.00"),
                excluded_quantity=Decimal("0.00"),
                source="missing_assumed_zero",
                fallback_used=True,
                conversion_fallback=False,
                lot_count=0,
                eligible_lot_count=0,
                projected_waste_quantity=Decimal("0.00"),
                lot_projection_summary=[],
                lot_consumption_trace=[],
                fefo_applied=False,
                usable_until_date=usable_until_date,
                projection_start_date=projection_start_date,
                projection_end_date=projection_end_date,
                unmet_demand_quantity=Decimal("0.00"),
                projected_remaining_quantity=Decimal("0.00"),
                projected_consumed_quantity=Decimal("0.00"),
            )

        inventory_unit = inventory.unit or ""
        summary_quantity = Decimal(str(inventory.quantity_on_hand or 0)).quantize(
            Decimal("0.000001")
        )
        lots = await self.inventory_lot_repo.get_lots_by_ingredient_id(ingredient_id)
        available_lots = [lot for lot in lots if self._lot_is_available(lot)]
        if not available_lots:
            known_lots = bool(lots)
            usable_fallback = Decimal("0") if known_lots else max(summary_quantity, Decimal("0"))
            self._log_usable_inventory_path(
                ingredient_id=ingredient_id,
                path="degraded_summary_fallback",
                quantity=usable_fallback,
                total_quantity=summary_quantity,
                excluded_quantity=summary_quantity if known_lots else Decimal("0"),
                usable_until_date=usable_until_date,
                eligible_lot_count=0,
                lot_count=0,
                conversion_fallback=False,
                fefo_applied=False,
            )
            return self._build_usable_inventory_payload(
                quantity=usable_fallback,
                unit=inventory_unit,
                total_quantity=summary_quantity,
                excluded_quantity=summary_quantity if known_lots else Decimal("0"),
                source="known_lots_unavailable" if known_lots else "inventory_summary",
                fallback_used=not known_lots,
                reconciliation_required=known_lots and summary_quantity > 0,
                conversion_fallback=False,
                lot_count=0,
                eligible_lot_count=0,
                projected_waste_quantity=Decimal("0.00"),
                lot_projection_summary=[],
                lot_consumption_trace=[],
                fefo_applied=False,
                usable_until_date=usable_until_date,
                projection_start_date=projection_start_date,
                projection_end_date=projection_end_date,
                unmet_demand_quantity=Decimal("0.00"),
                projected_remaining_quantity=Decimal("0.00"),
                projected_consumed_quantity=Decimal("0.00"),
            )

        total_quantity = Decimal("0.00")
        usable_quantity = Decimal("0.00")
        excluded_quantity = Decimal("0.00")
        conversion_fallback = False
        eligible_lot_count = 0
        prepared_lots: List[Dict[str, Any]] = []

        for lot in available_lots:
            remaining = await self.get_lot_remaining(lot)
            if remaining <= 0:
                continue

            try:
                remaining_in_inventory_unit = convert_unit(remaining, lot.unit, inventory_unit)
            except ValueError:
                conversion_fallback = True
                continue  # incompatible stock cannot count as usable

            prepared_lots.append(
                {
                    "lot_id": lot.lot_id,
                    "delivery_date": getattr(lot, "delivery_date", None),
                    "spoilage_expected_date": getattr(lot, "spoilage_expected_date", None),
                    "quantity": remaining_in_inventory_unit,
                }
            )
            total_quantity += remaining_in_inventory_unit

        reconciliation_required = conversion_fallback or total_quantity != summary_quantity
        # Lot history can overstate old unallocated deductions. Never promise more
        # stock than the summary, and surface the discrepancy for an audit.
        remaining_summary = max(summary_quantity, Decimal("0"))
        for lot in sorted(prepared_lots, key=self.reorder_lot_projection._sort_key):
            lot["quantity"] = min(lot["quantity"], remaining_summary)
            remaining_summary -= lot["quantity"]
        total_quantity = sum((lot["quantity"] for lot in prepared_lots), Decimal("0"))

        if (
            usable_until_date is not None
            and projection_start_date is not None
            and prepared_lots
            and daily_demand_points is not None
        ):
            projection = self.reorder_lot_projection.project_usable_inventory(
                lots=prepared_lots,
                projection_start_date=projection_start_date,
                projection_end_date=usable_until_date,
                daily_demand_points=daily_demand_points,
            )
            self._log_usable_inventory_path(
                ingredient_id=ingredient_id,
                path="projected_lot_simulation",
                quantity=projection["quantity"],
                total_quantity=projection["total_quantity"],
                excluded_quantity=projection["projected_waste_quantity"],
                usable_until_date=usable_until_date,
                eligible_lot_count=projection["eligible_lot_count"],
                lot_count=len(available_lots),
                conversion_fallback=conversion_fallback,
                fefo_applied=projection["fefo_applied"],
            )
            return self._build_usable_inventory_payload(
                quantity=projection["quantity"],
                unit=inventory_unit,
                total_quantity=projection["total_quantity"],
                excluded_quantity=projection["excluded_quantity"],
                source="usable_lot_projection",
                fallback_used=False,
                reconciliation_required=reconciliation_required,
                conversion_fallback=conversion_fallback,
                lot_count=len(available_lots),
                eligible_lot_count=projection["eligible_lot_count"],
                projected_waste_quantity=projection["projected_waste_quantity"],
                lot_projection_summary=projection["lot_projection_summary"],
                lot_consumption_trace=projection["lot_consumption_trace"],
                fefo_applied=projection["fefo_applied"],
                usable_until_date=usable_until_date,
                projection_start_date=projection["projection_start_date"],
                projection_end_date=projection["projection_end_date"],
                unmet_demand_quantity=projection["unmet_demand_quantity"],
                projected_remaining_quantity=projection["projected_remaining_quantity"],
                projected_consumed_quantity=projection["projected_consumed_quantity"],
            )

        for lot in prepared_lots:
            remaining_in_inventory_unit = Decimal(str(lot["quantity"])).quantize(
                Decimal("0.000001")
            )

            if (
                usable_until_date is not None
                and lot.get("spoilage_expected_date") is not None
                and lot["spoilage_expected_date"] < usable_until_date
            ):
                excluded_quantity += remaining_in_inventory_unit
                continue

            usable_quantity += remaining_in_inventory_unit
            eligible_lot_count += 1

        total_quantity = total_quantity.quantize(Decimal("0.000001"))
        usable_quantity = usable_quantity.quantize(Decimal("0.000001"))
        excluded_quantity = excluded_quantity.quantize(Decimal("0.000001"))
        fallback_source = (
            "degraded_summary_fallback"
            if usable_until_date is not None
            else "available_lots"
        )
        fallback_path = (
            "degraded_summary_fallback"
            if usable_until_date is not None
            else "available_lot_summary"
        )
        self._log_usable_inventory_path(
            ingredient_id=ingredient_id,
            path=fallback_path,
            quantity=usable_quantity if usable_until_date is not None else total_quantity,
            total_quantity=total_quantity,
            excluded_quantity=excluded_quantity,
            usable_until_date=usable_until_date,
            eligible_lot_count=eligible_lot_count,
            lot_count=len(available_lots),
            conversion_fallback=conversion_fallback,
            fefo_applied=False,
        )
        return self._build_usable_inventory_payload(
            quantity=usable_quantity if usable_until_date is not None else total_quantity,
            unit=inventory_unit,
            total_quantity=total_quantity,
            excluded_quantity=excluded_quantity,
            source=fallback_source,
            fallback_used=usable_until_date is not None,
            reconciliation_required=reconciliation_required,
            conversion_fallback=conversion_fallback,
            lot_count=len(available_lots),
            eligible_lot_count=eligible_lot_count,
            projected_waste_quantity=excluded_quantity,
            lot_projection_summary=[],
            lot_consumption_trace=[],
            fefo_applied=False,
            usable_until_date=usable_until_date,
            projection_start_date=projection_start_date,
            projection_end_date=projection_end_date,
            unmet_demand_quantity=Decimal("0.00"),
            projected_remaining_quantity=Decimal("0.00"),
            projected_consumed_quantity=Decimal("0.00"),
        )

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
            Decimal: Total usage rounded to six decimal places.
        """
        usage_data = await self.inventory_usage_log_repo.get_daily_usage(
            ingredient_id, days, as_of_date=getattr(self, "as_of_date", None) or date.today()
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

        total = total.quantize(Decimal("0.000001"))
        logger.debug(
            f"[INV STATS] TotalUsage ingredient={ingredient_id} days={days} total={total}"
        )
        return total
