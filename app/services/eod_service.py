# app/services/eod_service.py


from app.repositories.sales_repo import SalesRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.batch_recipe_ingredients_repo import (
    BatchRecipeIngredientRepository,
)
from app.repositories.prep_schedule_repo import PrepScheduleRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.alerts_repo import AlertRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.orders_repo import OrdersRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.purchase_orders_repo import PurchaseOrderRepository
from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
from app.repositories.supplier_repo import SupplierRepository
from app.repositories.eod_purchase_order_suggestion_repo import (
    EODPurchaseOrderSuggestionRepository,
)
from app.repositories.ingredients_repo import IngredientRepository
from app.services.forecasting_engine import ForecastingEngine, convert_forecast_dict_to_list
from app.services.inventory_stats_service import InventoryStatsService
from app.services.reorder_forecast_engine import ReorderForecastEngine
from app.services.forecasting_engine_basic import ForecastingEngineBasic
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.utils.unit_conversion import convert_unit, normalize_unit
from app.services.utils.inventory_deduction_helper import InventoryDeductionHelper
from typing import List, Dict, Optional, Any
import math
from decimal import Decimal
from datetime import date, datetime, timedelta
from collections import defaultdict
import logging
import contextlib
from app.utils.logger_helpers import log_method
from app.core.logging import logger 
from app.db.models.inventory_lot_orm import LotStatus



class EODService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str = None, employee_id = None):
        """Runs all end-of-day tasks in order: sales aggregation, spoilage, forecasting, reordering, and logging."""
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.menu_item_repo = MenuItemRepository(db, restaurant_id)
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)
        self.batch_recipe_ingredients_repo = BatchRecipeIngredientRepository(
            db, restaurant_id
        )
        self.ingredient_supplier_repo = IngredientSupplierRepository(db, restaurant_id)
        self.purchase_order_repo = PurchaseOrderRepository(db, restaurant_id)
        self.purchase_order_item_repo = PurchaseOrderItemRepository(db, restaurant_id)
        self.supplier_repo = SupplierRepository(db, restaurant_id)
        self.prep_schedule_repo = PrepScheduleRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.alert_repo = AlertRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.order_repo = OrdersRepository(db, restaurant_id)
        self.inventory_helper = InventoryDeductionHelper(
            db=db,
            restaurant_id=restaurant_id,
            subscription_tier=subscription_tier,
            employee_id=employee_id,
        )
        self.forecasting_engine = ForecastingEngine(
            db=db, restaurant_id=restaurant_id, subscription_tier=subscription_tier
        )
        self.reorder_engine = ReorderForecastEngine(
            db=db, restaurant_id=restaurant_id, subscription_tier=subscription_tier
        )
        self.inventory_stats = InventoryStatsService(
            db=db, restaurant_id=restaurant_id, subscription_tier=subscription_tier
        )
        logger.debug('[EOD] init service restaurant=%s tier=%s', self.restaurant_id, self.subscription_tier)
        from app.repositories.eod_run_ledger_repo import EODRunLedgerRepository
        self.ledger_repo = EODRunLedgerRepository(db, restaurant_id)
        self.po_suggestion_repo = EODPurchaseOrderSuggestionRepository(db, restaurant_id)
        self._purchase_order_suggestions = []
        self.purchase_order_suggestions = []

    def _set_purchase_order_suggestions(self, suggestions: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        synced_suggestions = list(suggestions or [])
        self._purchase_order_suggestions = synced_suggestions
        self.purchase_order_suggestions = synced_suggestions
        return synced_suggestions

    async def _persist_purchase_order_suggestions(
        self,
        run_date: date,
        suggestions: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        synced_suggestions = self._set_purchase_order_suggestions(suggestions)
        await self.po_suggestion_repo.replace_for_run_date(run_date, synced_suggestions)
        logger.info(
            "[EOD] Persisted purchase order suggestions run_date=%s count=%s",
            run_date,
            len(synced_suggestions),
        )
        return synced_suggestions

    async def _load_persisted_purchase_order_suggestions(
        self,
        run_date: date,
    ) -> List[Dict[str, Any]]:
        persisted_rows = await self.po_suggestion_repo.list_by_run_date(run_date)
        suggestions = [
            {
                "ingredient_id": row.ingredient_id,
                "ingredient_supplier_id": row.ingredient_supplier_id,
                "supplier_id": row.supplier_id,
                "lead_demand": float(row.lead_demand),
                "shelf_demand": float(row.shelf_demand),
                "forecast_unit": row.forecast_unit,
                "converted_quantity_needed": float(row.converted_quantity_needed),
                "suggested_packs_to_order": row.suggested_packs_to_order,
                "total_quantity_ordered": float(row.total_quantity_ordered),
                "supplier_unit": row.supplier_unit,
                "inventory_unit": row.inventory_unit,
                "lead_time_days": row.lead_time_days,
                "shelf_life_days": row.shelf_life_days,
                "pack_size": row.pack_size,
                "quantity_per_pack_item": float(row.quantity_per_pack_item),
                "min_order_quantity": float(row.min_order_quantity),
            }
            for row in persisted_rows
        ]
        if suggestions:
            logger.info(
                "[EOD] Loaded persisted purchase order suggestions run_date=%s count=%s",
                run_date,
                len(suggestions),
            )
        return self._set_purchase_order_suggestions(suggestions)

    async def _recover_ingredient_forecast_from_breakdowns(
        self,
        run_date: date,
        reorder_horizon_days: int,
    ) -> Dict[int, Dict[str, Any]]:
        horizon_days = max(int(reorder_horizon_days or 1), 1)
        end_date = run_date + timedelta(days=horizon_days)

        breakdown_rows = (
            await self.forecasting_engine.forecast_breakdown_repo.get_latest_by_date_range(
                start_date=run_date,
                end_date=end_date,
            )
        )
        if not breakdown_rows:
            logger.warning(
                "[EOD] No persisted forecast breakdowns available for recovery date=%s end_date=%s",
                run_date,
                end_date,
            )
            return {}

        menu_item_forecast: Dict[int, Dict[str, Any]] = {}
        for row in breakdown_rows:
            entry = menu_item_forecast.setdefault(
                row.menu_item_id,
                {"daily_breakdown": []},
            )
            entry["daily_breakdown"].append(
                (row.forecast_date, Decimal(str(row.forecasted_quantity or 0)))
            )

        for entry in menu_item_forecast.values():
            entry["daily_breakdown"].sort(key=lambda item: item[0])

        batch_breakdown = await self.forecasting_engine.generate_batch_recipe_breakdown(
            menu_item_forecast
        )
        ingredient_breakdown = await self.forecasting_engine.generate_ingredient_breakdown(
            convert_forecast_dict_to_list(menu_item_forecast),
            batch_breakdown,
        )

        recovered_forecast: Dict[int, Dict[str, Any]] = defaultdict(
            lambda: {
                "total_quantity": Decimal(0),
                "unit": None,
                "daily_breakdown": [],
            }
        )
        cutoff_date = run_date + timedelta(days=horizon_days)

        for entry in ingredient_breakdown:
            forecast_date = entry["forecast_date"]
            if forecast_date > cutoff_date:
                continue

            ingredient_id = entry["ingredient_id"]
            quantity = Decimal(str(entry["quantity"]))
            recovered_forecast[ingredient_id]["total_quantity"] += quantity
            recovered_forecast[ingredient_id]["daily_breakdown"].append(
                (forecast_date, quantity)
            )
            if not recovered_forecast[ingredient_id]["unit"]:
                recovered_forecast[ingredient_id]["unit"] = entry.get("unit") or "count"

        for data in recovered_forecast.values():
            data["daily_breakdown"].sort(key=lambda item: item[0])

        recovered_count = len(recovered_forecast)
        logger.info(
            "[EOD] Recovered ingredient forecast from persisted breakdowns date=%s ingredients=%s",
            run_date,
            recovered_count,
        )
        return dict(recovered_forecast)

    async def _is_real_time_deduction_enabled(self) -> bool:
        if not self.subscription_tier or self.subscription_tier not in ("pro", "master"):
            return False
        return await self.inventory_helper.is_real_time_enabled()

    # ------------------------- Internal Stage Helpers -------------------------
    async def _stage_sales_deduction(self, run_date, ledger) -> int:
        if ledger.sales_deducted:
            logger.debug('[EOD] Skip sales_deduction already complete date=%s', run_date)
            return 0
        if await self._is_real_time_deduction_enabled():
            logger.info(
                '[EOD] Skipping sales deduction for %s (real-time inventory deductions enabled)',
                run_date,
            )
            await self.ledger_repo.mark_stage_complete(ledger, 'sales_deducted', 0)
            return 0
        t0 = datetime.utcnow()
        usage_summary = await self.aggregate_daily_sales(run_date)
        helper_result = None
        if usage_summary:
            helper_result = await self.deduct_ingredients_from_inventory(usage_summary, run_date)
        has_failures = bool(helper_result.get("failures")) if isinstance(helper_result, dict) else False
        if not has_failures:
            await self.order_repo.mark_completed_orders_deducted_for_date(run_date)
        await self.ledger_repo.mark_stage_complete(ledger, 'sales_deducted', int((datetime.utcnow()-t0).total_seconds()*1000))
        return len(usage_summary or [])

    async def _stage_spoilage(self, run_date, ledger):
        # simple placeholder spoilage stage does not have its own flag; folded into sales_deduction timing if needed.
        await self.auto_deduct_spoilage(run_date)

    async def _stage_forecast(self, run_date, ledger, forecast_horizon_days, reorder_horizon_days) -> Dict[int, dict]:
        if ledger.forecast_completed:
            logger.debug('[EOD] Skip forecast already complete date=%s', run_date)
            return {}
        t0 = datetime.utcnow()
        ingredient_forecast = await self.generate_forecast(
            run_date, forecast_horizon_days, reorder_horizon_days
        )
        # Record accuracy (daily + rolling) using forecasting engine advanced methods
        try:
            await self.forecasting_engine.evaluate_and_record_daily_forecast_accuracy(run_date)
            await self.forecasting_engine.evaluate_and_record_accuracy(run_date)
        except Exception as e:
            logger.warning('[EOD] Forecast accuracy evaluation failed date=%s error=%s', run_date, e)
        await self.ledger_repo.mark_stage_complete(ledger, 'forecast_completed', int((datetime.utcnow()-t0).total_seconds()*1000))
        return ingredient_forecast

    async def _stage_reorder(
        self,
        run_date: date,
        ledger,
        ingredient_forecast,
        reorder_horizon_days: int,
    ) -> int:
        if ledger.reorder_completed:
            logger.debug('[EOD] Skip reorder already complete')
            return 0
        if not ingredient_forecast and ledger.forecast_completed:
            ingredient_forecast = await self._recover_ingredient_forecast_from_breakdowns(
                run_date,
                reorder_horizon_days,
            )
        if not ingredient_forecast:
            logger.info('[EOD] No ingredient forecast; skip reorder stage')
            await self.ledger_repo.mark_stage_complete(ledger, 'reorder_completed', 0)
            return 0
        t0 = datetime.utcnow()
        await self.reorder_engine.classify_all_ingredients()
        suggestions = await self.generate_suggested_purchase_orders(
            ingredient_forecast,
            run_date=run_date,
        )
        await self._persist_purchase_order_suggestions(run_date, suggestions)
        await self.ledger_repo.mark_stage_complete(ledger, 'reorder_completed', int((datetime.utcnow()-t0).total_seconds()*1000))
        return len(suggestions or [])

    async def _stage_po_write(self, ledger, run_date: date, reorder_horizon_days: int) -> int:
        if ledger.po_written:
            logger.debug('[EOD] Skip po_write already complete')
            return 0
        if not self._purchase_order_suggestions and ledger.reorder_completed:
            await self._load_persisted_purchase_order_suggestions(run_date)
        if not self._purchase_order_suggestions and ledger.reorder_completed:
            ingredient_forecast = await self._recover_ingredient_forecast_from_breakdowns(
                run_date,
                reorder_horizon_days,
            )
            if ingredient_forecast:
                suggestions = await self.generate_suggested_purchase_orders(
                    ingredient_forecast,
                    run_date=run_date,
                )
                await self._persist_purchase_order_suggestions(run_date, suggestions)
        if not self._purchase_order_suggestions:
            logger.info('[EOD] No PO suggestions to write')
            await self.ledger_repo.mark_stage_complete(ledger, 'po_written', 0)
            return 0
        t0 = datetime.utcnow()
        await self.write_purchase_orders_to_db(run_date=run_date)
        await self.ledger_repo.mark_stage_complete(ledger, 'po_written', int((datetime.utcnow()-t0).total_seconds()*1000))
        return len(self._purchase_order_suggestions)

    def _build_eod_auto_po_note(self, run_date: date, supplier_id: int) -> str:
        marker = f"[EOD_AUTO run_date={run_date.isoformat()} supplier_id={supplier_id}]"
        return f"{marker} Auto-generated by EOD for {run_date.isoformat()}."

    async def process_batch_recipe_production(self, date: date) -> None:
        # Find all preps that were scheduled but not completed
        scheduled_preps = await self.prep_schedule_repo.get_scheduled_by_date(date)

        for prep in scheduled_preps:
            if prep.status != "completed":
                alert_data = {
                    "restaurant_id": self.restaurant_id,
                    "employee_id": None,
                    "role": "system",
                    "alert_type": "prep_incomplete",
                    "message": f"Batch prep for recipe {prep.batch_recipe_id} scheduled on {date} was not completed.",
                    "status": "Active",
                    "is_acknowledged": False,
                }
                await self.alert_repo.create(alert_data)

    async def aggregate_daily_sales(self, date: date) -> List[dict]:
        """
        Aggregate actual sales for a given date, and convert to a usage summary:
        - Deduct batch recipe quantities (as produced inventory items)
        - Deduct ingredients used directly in menu item recipes
        This summary is used for inventory deduction.
        """

        # Step 1: Get actual sales from POS
        sales_data = await self.sales_repo.get_by_date(date)
        if not sales_data:
            return []

        usage_summary = []
        ingredient_totals = defaultdict(Decimal)
        batch_recipe_totals = defaultdict(Decimal)
        ingredient_units = {}

        for sale in sales_data:
            menu_item_id = sale.menu_item_id
            quantity_sold = Decimal(sale.quantity_sold)

            # Get all recipes linked to this menu item
            menu_item_recipes = await self.menu_item_recipe_repo.get_by_menu_item(
                menu_item_id
            )
            for mir in menu_item_recipes:
                recipe_id = mir.recipe_id

                # Get all ingredients for the recipe
                recipe_ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(
                    recipe_id
                )

                for ri in recipe_ingredients:
                    used_qty = Decimal(ri.quantity_used or 0) * quantity_sold

                    if ri.ingredient_type == "ingredient":
                        ingredient_id = ri.reference_id
                        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
                        unit = ingredient.unit or "count"

                        ingredient_totals[(ingredient_id, unit)] += used_qty
                        ingredient_units[ingredient_id] = unit

                    elif ri.ingredient_type == "batch":
                        batch_recipe_id = ri.reference_id
                        batch_recipe_totals[
                            batch_recipe_id
                        ] += used_qty  # in "count" unless specified

        # Step 2: Add ingredient usage to usage_summary
        for (ingredient_id, unit), total_qty in ingredient_totals.items():
            usage_summary.append(
                {
                    "ingredient_id": ingredient_id,
                    "forecast_date": date,
                    "quantity": round(total_qty, 2),
                    "unit": unit,
                    "source": "sale",
                }
            )

        # Step 3: Add batch recipe usage to usage_summary
        for batch_recipe_id, total_qty in batch_recipe_totals.items():
            batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
            unit = batch_recipe.yield_unit or "count"

            usage_summary.append(
                {
                    "batch_recipe_id": batch_recipe_id,
                    "forecast_date": date,
                    "quantity": round(total_qty, 2),
                    "unit": unit,
                    "source": "batch",
                }
            )

        # print(f"[{date}] usage summary: {usage_summary}")
        return usage_summary

    async def deduct_ingredients_from_inventory(
        self, usage_summary: List[dict], run_date: date
    ) -> dict:
        if not usage_summary:
            return {
                "message": "No inventory deductions required.",
                "deducted_items": [],
                "updated_inventories_count": 0,
                "failures": [],
            }

        reference_id = int(run_date.strftime("%Y%m%d"))

        helper_result = await self.inventory_helper.deduct_usage_summary(
            usage_summary,
            reference_type="eod_sales",
            reference_id=reference_id,
        )

        failures = helper_result.get("failures") if isinstance(helper_result, dict) else None
        if failures:
            logger.warning(
                "[EOD] Inventory deduction completed with %s failures", len(failures)
            )

        deducted_items = helper_result.get("deducted_items", []) if isinstance(helper_result, dict) else []
        return {
            "message": "Inventory successfully deducted for sales.",
            "deducted_items": deducted_items,
            "updated_inventories_count": len(deducted_items),
            "failures": failures or [],
        }

    async def auto_deduct_spoilage(self, target_date: date) -> None:
        """Automatically write off remaining quantity from expired available lots."""

        expired_lots = await self.inventory_lot_repo.get_expired_available_lots(target_date)
        if not expired_lots:
            logger.info(
                "[EOD] No expired lots to write off for %s (restaurant=%s)",
                target_date,
                self.restaurant_id,
            )
            return

        spoilage_reference_id = int(target_date.strftime("%Y%m%d"))
        processed_count = 0

        for lot in expired_lots:
            already_logged = await self.inventory_usage_log_repo.has_usage_type_for_lot(
                lot.lot_id,
                "spoilage",
            )
            if already_logged:
                if lot.status != LotStatus.expired:
                    await self.inventory_lot_repo.update(
                        lot.lot_id,
                        {"status": LotStatus.expired},
                    )
                logger.info(
                    "[EOD] Skipping spoilage write-off for lot=%s (already logged)",
                    lot.lot_id,
                )
                continue

            remaining_quantity = await self._compute_lot_remaining(lot)
            if remaining_quantity <= 0:
                if lot.status != LotStatus.expired:
                    await self.inventory_lot_repo.update(
                        lot.lot_id,
                        {"status": LotStatus.expired},
                    )
                continue

            inventory = await self.inventory_repo.get_by_id(lot.inventory_id)
            if not inventory:
                logger.warning(
                    "[EOD] Skipping spoilage write-off for lot=%s inventory missing",
                    lot.lot_id,
                )
                continue

            ingredient_id = lot.ingredient_id or inventory.ingredient_id
            if not ingredient_id:
                logger.warning(
                    "[EOD] Skipping spoilage write-off for lot=%s no ingredient_id",
                    lot.lot_id,
                )
                continue

            try:
                await self.inventory_repo.decrement_quantity(
                    inventory_id=lot.inventory_id,
                    amount=remaining_quantity,
                )
            except ValueError as exc:
                logger.warning(
                    "[EOD] Spoilage write-off failed lot=%s error=%s",
                    lot.lot_id,
                    exc,
                )
                continue

            await self.inventory_usage_log_repo.create(
                {
                    "restaurant_id": self.restaurant_id,
                    "inventory_id": lot.inventory_id,
                    "ingredient_id": ingredient_id,
                    "lot_id": lot.lot_id,
                    "used_quantity": remaining_quantity,
                    "unit": lot.unit,
                    "usage_type": "spoilage",
                    "reference_type": "lot",
                    "reference_id": lot.lot_id,
                    "used_date": datetime.utcnow(),
                    "notes": f"Auto-expired during EOD for {target_date.isoformat()}",
                }
            )
            await self.inventory_lot_repo.update(
                lot.lot_id,
                {"status": LotStatus.expired},
            )
            processed_count += 1

        logger.info(
            "[EOD] Auto-deducted spoilage for %s expired lots on %s (restaurant=%s)",
            processed_count,
            target_date,
            self.restaurant_id,
        )

    async def _compute_lot_remaining(self, lot) -> Decimal:
        """Compute remaining quantity for a lot from usage logs."""
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
        return lot_qty - used_quantity - wasted_quantity + added_quantity

    async def generate_forecast(
        self,
        forecast_date: date,
        forecast_horizon_days: int = 30,
        reorder_horizon_days: int = 30,
    ) -> Dict[int, dict]:
        """Forecast menu item sales and compute ingredient demand for reorder planning."""

        forecast_horizon_days = max(int(forecast_horizon_days or 1), 1)
        reorder_horizon_days = max(int(reorder_horizon_days or 1), 1)

        # We want to get the restaurant settings from the database which will have their preferred forecasting length needs to be implemented in settings and database too

        await self.forecasting_engine.initialize()
        ingredient_forecast = await self.forecasting_engine.run_forecasting_pipeline(
            forecast_date=forecast_date,
            horizon_days=forecast_horizon_days,
            reorder_horizon_days=reorder_horizon_days,
        )

        return ingredient_forecast

    async def generate_suggested_purchase_orders(
        self,
        ingredient_forecast,
        run_date: Optional[date] = None,
    ) -> None:
        logger.info("[EOD] Generating suggested purchase orders")
        purchase_orders = []
        effective_run_date = run_date or date.today()

        ingredient_ids = set(ingredient_forecast.keys())
        logger.debug(f"[EOD] Ingredient IDs to process: {ingredient_ids}")

        for ingredient_id in ingredient_ids:
            logger.debug(f"[EOD] Processing ingredient={ingredient_id}")

            suppliers = await self.ingredient_supplier_repo.get_all_by_ingredient_id(
                ingredient_id
            )
            if not suppliers:
                logger.warning(f"[EOD] No suppliers found ingredient={ingredient_id}")
                continue

            supplier_selection = await self.reorder_engine.choose_supplier_option(suppliers)
            if not supplier_selection:
                continue

            supplier = supplier_selection["supplier"]

            ingredient_supplier_id = supplier.ingredient_supplier_id
            supplier_id = supplier.supplier_id
            lead_time = supplier.lead_time_days or 0
            supplier_unit = supplier.unit
            min_order_quantity = Decimal(str(supplier.min_order_quantity or 0)).quantize(
                Decimal("0.01")
            )
            pack_size = supplier.pack_size or 1
            quantity_per_pack_item = Decimal(str(supplier.quantity_per_pack_item or 1)).quantize(
                Decimal("0.01")
            )

            inventory = await self.inventory_repo.get_inventory_by_ingredient(
                ingredient_id
            )
            if inventory:
                if inventory.shelf_life_days is not None:
                    shelf_life = inventory.shelf_life_days
                    shelf_life_source = "inventory"
                elif supplier.shelf_life_days is not None:
                    shelf_life = supplier.shelf_life_days
                    shelf_life_source = "supplier"
                else:
                    shelf_life = 0
                    shelf_life_source = "missing_assumed_zero"
                inventory_unit = inventory.unit
                current_stock = Decimal(str(inventory.quantity_on_hand or 0)).quantize(
                    Decimal("0.01")
                )
                inventory_source = "inventory_summary"
            else:
                shelf_life = supplier.shelf_life_days or 0
                inventory_unit = supplier_unit
                current_stock = Decimal("0.00")
                shelf_life_source = (
                    "supplier"
                    if supplier.shelf_life_days is not None
                    else "missing_assumed_zero"
                )
                inventory_source = "missing_assumed_zero"

            reorder_days = lead_time + shelf_life
            logger.debug(
                f"[EOD] LeadTime ingredient={ingredient_id} lead={lead_time} shelf_life={shelf_life} reorder_days={reorder_days}"
            )

            if reorder_days <= 0:
                print(f"[ERROR] Invalid reorder_days for ingredient {ingredient_id}")
                continue

            lead_window = [effective_run_date + timedelta(days=i) for i in range(lead_time)]
            shelf_window = [
                effective_run_date + timedelta(days=i) for i in range(lead_time, reorder_days)
            ]

            daily_forecast = ingredient_forecast[ingredient_id].get(
                "daily_breakdown", []
            )
            unit = ingredient_forecast[ingredient_id].get("unit", "?")

            logger.debug(f"[EOD] ForecastWindows ingredient={ingredient_id} unit={unit} lead_window={lead_window} shelf_window={shelf_window}")

            lead_demand = sum(qty for day, qty in daily_forecast if day in lead_window)
            shelf_demand = sum(
                qty for day, qty in daily_forecast if day in shelf_window
            )
            total_demand = lead_demand + shelf_demand

            logger.debug(
                f"[EOD] Demand ingredient={ingredient_id} lead={lead_demand} shelf={shelf_demand} total={total_demand}"
            )

            decision = await self.reorder_engine.build_reorder_decision(
                ingredient_id=ingredient_id,
                lead_demand=lead_demand,
                shelf_demand=shelf_demand,
                total_demand=total_demand,
                unit=unit,
                lead_time=lead_time,
                current_stock=current_stock,
                current_unit=inventory_unit or supplier_unit,
                moq=min_order_quantity,
                manage_alerts=True,
            )

            logger.debug(
                f"[EOD] Suggested reorder qty ingredient={ingredient_id} qty={decision['final_quantity']}"
            )

            if not decision["should_reorder"]:
                logger.debug(f"[EOD] Skip PO generation ingredient={ingredient_id} qty<=0")
                continue

            unit_conversion_fallback = False
            try:
                converted_qty = Decimal(
                    str(
                        convert_unit(
                            float(decision["final_quantity"]),
                            from_unit=inventory_unit,
                            to_unit=supplier_unit,
                        )
                    )
                ).quantize(Decimal("0.01"))
                logger.debug(
                    f"[EOD] Conversion ingredient={ingredient_id} {inventory_unit}->{supplier_unit} qty={converted_qty}"
                )
            except Exception as e:
                logger.warning(f"[EOD] Unit conversion failed ingredient={ingredient_id} error={e}")
                converted_qty = decision["final_quantity"]
                unit_conversion_fallback = True

            quantity_per_pack = (
                Decimal(str(pack_size or 1)) * quantity_per_pack_item
            ).quantize(Decimal("0.01"))
            if quantity_per_pack <= 0:
                logger.warning(f"[EOD] Invalid pack config ingredient={ingredient_id}")
                continue

            packs_to_order = math.ceil(converted_qty / quantity_per_pack)
            total_quantity_ordered = (Decimal(packs_to_order) * quantity_per_pack).quantize(
                Decimal("0.01")
            )

            logger.debug(
                f"[EOD] Packs ingredient={ingredient_id} packs={packs_to_order} total_qty={total_quantity_ordered}"
            )

            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            ingredient_name = ingredient.name if ingredient else f"Ingredient {ingredient_id}"
            supplier_obj = await self.supplier_repo.get_by_id(supplier_id)
            supplier_name = supplier_obj.name if supplier_obj else f"Supplier {supplier_id}"

            explanation = self.reorder_engine.build_explanation_payload(
                decision=decision,
                supplier_selection=supplier_selection,
                supplier_name=supplier_name,
                inventory_unit=inventory_unit,
                supplier_unit=supplier_unit,
                converted_quantity_needed=converted_qty,
                pack_size=pack_size,
                quantity_per_pack_item=quantity_per_pack_item,
                packs_to_order=packs_to_order,
                total_quantity_ordered=total_quantity_ordered,
                assumption_flags={
                    "inventory_source": inventory_source,
                    "lead_time_source": (
                        "supplier" if supplier.lead_time_days is not None else "missing_assumed_zero"
                    ),
                    "moq_source": (
                        "supplier" if supplier.min_order_quantity is not None else "missing_assumed_zero"
                    ),
                    "shelf_life_source": shelf_life_source,
                    "unit_conversion_fallback": unit_conversion_fallback,
                    "pricing_missing": supplier.cost_per_unit is None,
                },
            )

            purchase_orders.append(
                {
                    "ingredient_id": ingredient_id,
                    "ingredient_name": ingredient_name,
                    "ingredient_supplier_id": ingredient_supplier_id,
                    "supplier_id": supplier_id,
                    "supplier_name": supplier_name,
                    "lead_demand": float(lead_demand),
                    "shelf_demand": float(shelf_demand),
                    "forecast_unit": inventory_unit,
                    "converted_quantity_needed": float(converted_qty),
                    "suggested_packs_to_order": packs_to_order,
                    "total_quantity_ordered": float(total_quantity_ordered),
                    "supplier_unit": supplier_unit,
                    "inventory_unit": inventory_unit,
                    "lead_time_days": lead_time,
                    "shelf_life_days": shelf_life,
                    "pack_size": pack_size,
                    "quantity_per_pack_item": float(quantity_per_pack_item),
                    "min_order_quantity": float(min_order_quantity),
                    "current_stock": float(decision["current_stock"]),
                    "raw_quantity_needed": float(converted_qty),
                    "quantity_to_order": float(total_quantity_ordered),
                    "packs_to_order": packs_to_order,
                    "unit": supplier_unit,
                    "unit_price": float(supplier.cost_per_unit or 0),
                    "line_total": float(total_quantity_ordered) * float(supplier.cost_per_unit or 0),
                    "explanation": explanation,
                }
            )

        logger.info(f"[EOD] Generated {len(purchase_orders)} purchase order suggestions")

        if run_date is not None:
            await self._persist_purchase_order_suggestions(run_date, purchase_orders)
        else:
            self._set_purchase_order_suggestions(purchase_orders)
        return purchase_orders

    async def write_purchase_orders_to_db(self, run_date: Optional[date] = None) -> None:
        """Writes purchase orders to DB, grouped by supplier, including total prices."""
        if not self.purchase_order_suggestions:
            logger.info("[EOD] No purchase order suggestions to write")
            return

        effective_run_date = run_date or date.today()

        orders_by_supplier = defaultdict(list)
        for suggestion in self.purchase_order_suggestions:
            supplier_id = suggestion["supplier_id"]
            orders_by_supplier[supplier_id].append(suggestion)

        for supplier_id, items in orders_by_supplier.items():
            existing_order = await self.purchase_order_repo.get_existing_eod_auto_order(
                supplier_id=supplier_id,
                run_date=effective_run_date,
            )
            if existing_order:
                logger.info(
                    "[EOD] Skipping PO create for supplier=%s run_date=%s existing_order=%s",
                    supplier_id,
                    effective_run_date,
                    existing_order.order_id,
                )
                await self.po_suggestion_repo.mark_written_for_supplier(
                    effective_run_date,
                    supplier_id,
                    existing_order.order_id,
                )
                continue

            lead_time = items[0]["lead_time_days"] or 0
            order_date = effective_run_date
            expected_delivery_date = order_date + timedelta(days=lead_time)
            notes = self._build_eod_auto_po_note(effective_run_date, supplier_id)

            total_order_price = Decimal("0.00")

            # Step 1: Create the order (temporarily, total price is 0)
            order = await self.purchase_order_repo.create(
                {
                    "restaurant_id": self.restaurant_id,
                    "supplier_id": supplier_id,
                    "order_date": order_date,
                    "expected_delivery_date": expected_delivery_date,
                    "status": "pending",
                    "total_order_price": total_order_price,  # placeholder
                    "notes": notes,
                }
            )

            order_id = order.order_id
            await self.po_suggestion_repo.mark_written_for_supplier(
                effective_run_date,
                supplier_id,
                order_id,
            )
            # Step 2: Create order items and calculate total price
            for item in items:
                ingredient_id = item["ingredient_id"]
                ingredient_supplier_id = item["ingredient_supplier_id"]
                quantity_ordered = Decimal(item["total_quantity_ordered"])
                unit = item["supplier_unit"]

                unit_price = await self.ingredient_supplier_repo.get_price_per_unit(
                    ingredient_supplier_id=item["ingredient_supplier_id"]
                )

                total_item_price = quantity_ordered * Decimal(unit_price)
                total_order_price += total_item_price

                await self.purchase_order_item_repo.create(
                    {
                        "restaurant_id": self.restaurant_id,
                        "order_id": order_id,
                        "ingredient_id": ingredient_id,
                        "ingredient_supplier_id": ingredient_supplier_id,
                        "quantity_ordered": quantity_ordered,
                        "unit": unit,
                        "unit_price": Decimal(unit_price),
                        "total_item_price": total_item_price,
                    }
                )

            # Step 3: Update order with final total
            await self.purchase_order_repo.update(
                order_id,
                {"total_order_price": total_order_price}
            )
        
        logger.info("[EOD] Purchase orders written successfully")

    from datetime import date, timedelta


    @log_method("Finalize End Of Day Summary")
    async def finalize_end_of_day_summary(
        self,
        date: date,
        commit: bool = True,
        force: bool = False,
        trigger_source: str = "system",
        forecast_horizon_days: int = 30,
        reorder_horizon_days: int = 30,
    ) -> Dict[str, int]:
        try:
            normalized_trigger_source = (trigger_source or "system").lower()
            if force and normalized_trigger_source != "manual":
                raise ValueError("Force reruns are only allowed for manual EOD triggers.")

            logger.info(
                "[EOD] Running finalize_end_of_day_summary for %s (tier=%s source=%s force=%s)",
                date,
                self.subscription_tier,
                normalized_trigger_source,
                force,
            )
            ledger = await self.ledger_repo.get_or_create(run_date=date)
            if force:
                logger.info(
                    "[EOD] Force rerun enabled; resetting ledger for date=%s source=%s",
                    date,
                    normalized_trigger_source,
                )
                await self.ledger_repo.reset(ledger)
            await self.ledger_repo.mark_running(ledger)

            usage_count = 0
            forecast_count = 0
            po_suggestions = 0
            po_written = 0

            if self.subscription_tier == 'basic':
                logger.info('[EOD] Basic tier run - minimal processing')
                try:
                    self.basic_forecasting_engine = ForecastingEngineBasic(self.db, self.restaurant_id)
                    await self.basic_forecasting_engine.run(date)
                except Exception as e:
                    logger.error('[EOD] Basic engine failure error=%s', e, exc_info=True)
            elif self.subscription_tier == 'master' or self.subscription_tier == 'pro':
                # Sales & deduction
                usage_count = await self._stage_sales_deduction(date, ledger)
                await self._stage_spoilage(date, ledger)
                if commit:
                    await self.db.commit()

                # Forecast
                ingredient_forecast = await self._stage_forecast(date, ledger, forecast_horizon_days, reorder_horizon_days)
                forecast_count = len(ingredient_forecast or {})
                if commit:
                    await self.db.commit()

                # Reorder suggestions
                po_suggestions = await self._stage_reorder(
                    date,
                    ledger,
                    ingredient_forecast,
                    reorder_horizon_days,
                )
                if commit:
                    await self.db.commit()

                # Write POs
                po_written = await self._stage_po_write(
                    ledger,
                    date,
                    reorder_horizon_days,
                )
                if commit:
                    await self.db.commit()
            else:
                raise ValueError(f'Unknown subscription tier: {self.subscription_tier}')

            # Finalize ledger
            await self.ledger_repo.finalize(ledger)
            if commit:
                await self.db.commit()

            logger.info('[EOD] Summary finalized successfully date=%s usage=%s forecasted=%s posuggest=%s powritten=%s',
                        date, usage_count, forecast_count, po_suggestions, po_written)
            return {
                'usage_summary_count': usage_count,
                'forecasted_ingredients': forecast_count,
                'purchase_orders_created': po_written,
            }

        except Exception as e:
            logger.error(f"[EOD] Failed to finalize EOD summary for {date}: {e}", exc_info=True)
            if commit and hasattr(self.db, "rollback"):
                with contextlib.suppress(Exception):
                    await self.db.rollback()
            raise
    @log_method("Check if Sales data exists")
    async def check_sales_data_exists(self, date: date) -> int:
        """Check if any sales data exists for given date."""
        return await self.sales_repo.sales_exist_for_dates([date])
    
    # Legacy placeholder removed; forecasting engine handles its own persistence.
