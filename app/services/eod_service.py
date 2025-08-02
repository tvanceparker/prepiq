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
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.purchase_orders_repo import PurchaseOrderRepository
from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.services.forecasting_engine import ForecastingEngine
from app.services.inventory_stats_service import InventoryStatsService
from app.services.reorder_forecast_engine import ReorderForecastEngine
from app.services.forecasting_engine_basic import ForecastingEngineBasic
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.utils.unit_conversion import convert_unit, normalize_unit
from typing import List, Dict, Optional
import math
from decimal import Decimal
from datetime import date, datetime, timedelta
from collections import defaultdict
import logging
from app.utils.logger_helpers import log_method
from app.core.logging import logger 



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
        self.prep_schedule_repo = PrepScheduleRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.alert_repo = AlertRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.forecasting_engine = ForecastingEngine(db=db, restaurant_id=restaurant_id)
        self.reorder_engine = ReorderForecastEngine(db=db, restaurant_id=restaurant_id)
        self.inventory_stats = InventoryStatsService(db=db, restaurant_id=restaurant_id)
        print(f'init end of day')

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
        self, usage_summary: List[dict]
    ) -> dict:
        """
        Deduct inventory quantities based on the aggregated sales summary.
        For batches, find inventory_id via inventory lots linked to batch_recipe_id,
        decrement only inventory quantities, NOT lots.
        Log usage with both inventory_id and batch_recipe_id.
        need to do something about if theres no inventory what does it do then
        """
        deducted_items = []
        updated_inventories = []

        for usage in usage_summary:
            qty = usage["quantity"]
            unit = usage["unit"]

            if usage["source"] == "sale" and "ingredient_id" in usage:
                ingredient_id = usage["ingredient_id"]
                inventory_entry = await self.inventory_repo.get_inventory_by_ingredient(
                    ingredient_id
                )
                if not inventory_entry:
                    raise ValueError(
                        f"No inventory found for ingredient {ingredient_id}"
                    )

                from_unit = unit
                to_unit = inventory_entry.unit
                if normalize_unit(from_unit) != normalize_unit(to_unit):
                    qty = convert_unit(qty, from_unit, to_unit)

                updated_inv = await self.inventory_repo.decrement_quantity(
                    inventory_id=inventory_entry.inventory_id,
                    amount=qty,
                )
                updated_inventories.append(updated_inv)

                await self.inventory_usage_log_repo.create(
                    {
                        "restaurant_id": self.restaurant_id,
                        "inventory_id": inventory_entry.inventory_id,
                        "ingredient_id": ingredient_id,
                        "used_quantity": qty,
                        "unit": to_unit,
                        "usage_type": "sale",
                        "reference_type": "sale",
                        "reference_id": None,
                        "used_date": datetime.utcnow(),
                    }
                )

                deducted_items.append(
                    {
                        "ingredient_id": ingredient_id,
                        "quantity_deducted": float(qty),
                        "unit": to_unit,
                        "source": "sale",
                    }
                )

            elif usage["source"] == "batch" and "batch_recipe_id" in usage:
                batch_recipe_id = usage["batch_recipe_id"]
                total_needed = qty

                # Fetch lots for the batch_recipe_id to get related inventory_ids
                lots = await self.inventory_lot_repo.get_all_by_batch_recipe_id(
                    batch_recipe_id
                )
                if not lots:
                    raise ValueError(
                        f"No inventory lots found for batch recipe {batch_recipe_id}"
                    )

                # Group by inventory_id because batch_recipe_id can link to multiple lots/inventory items
                inventory_qty_map = {}

                for lot in lots:
                    inv_id = lot.inventory_id
                    if inv_id not in inventory_qty_map:
                        inventory_qty_map[inv_id] = 0
                    inventory_qty_map[
                        inv_id
                    ] += lot.quantity  # sum of lot quantities per inventory

                # Now find the total inventory available for those inventory_ids
                inventories = await self.inventory_repo.get_all_by_ids(
                    list(inventory_qty_map.keys())
                )
                if not inventories:
                    raise ValueError(
                        f"No inventories found for batch recipe {batch_recipe_id}"
                    )

                # For unit conversion, pick the first inventory unit to convert total_needed to it
                first_inventory = inventories[0]
                from_unit = unit
                to_unit = first_inventory.unit
                if normalize_unit(from_unit) != normalize_unit(to_unit):
                    total_needed = convert_unit(total_needed, from_unit, to_unit)

                # Deduct total_needed from inventories proportionally or fully from first inventory if possible
                remaining = total_needed

                for inventory_entry in inventories:
                    if remaining <= 0:
                        break

                    inv_qty = inventory_entry.quantity_on_hand
                    deduct_qty = Decimal(min(inv_qty, remaining))

                    if deduct_qty <= 0:
                        continue
                    lots = await self.inventory_lot_repo.get_by_inventory_id(inventory_entry.inventory_id)
                    lots = sorted(lots, key=lambda x: x.delivery_date)

                    updated_inv = await self.inventory_repo.decrement_quantity(
                        inventory_id=inventory_entry.inventory_id,
                        amount=deduct_qty,
                    )
                    updated_inventories.append(updated_inv)

                    await self.inventory_usage_log_repo.create(
                        {
                            "restaurant_id": self.restaurant_id,
                            "inventory_id": inventory_entry.inventory_id,
                            "ingredient_id": None,
                            "used_quantity": deduct_qty,
                            "unit": to_unit,
                            "usage_type": "sale",
                            "reference_type": "batch",
                            "reference_id": batch_recipe_id,
                            "used_date": datetime.utcnow(),
                        }
                    )

                    deducted_items.append(
                        {
                            "batch_recipe_id": batch_recipe_id,
                            "inventory_id": inventory_entry.inventory_id,
                            "quantity_deducted": float(deduct_qty),
                            "unit": to_unit,
                            "source": "batch",
                        }
                    )

                    remaining -= deduct_qty

                if remaining > 0:
                    raise ValueError(
                        f"Insufficient inventory quantity for batch recipe {batch_recipe_id}"
                    )

            else:
                raise ValueError(f"Unknown usage entry or missing keys: {usage}")

        return {
            "message": "Inventory successfully deducted for sales.",
            "deducted_items": deducted_items,
            "updated_inventories_count": len(updated_inventories),
        }

    async def auto_deduct_spoilage(self) -> None:
        """Automatic deduction of spoilage, not sure whether to use a exponential or linear model for this."""

    async def generate_forecast(self) -> None:
        """Forecast menu item sales and compute ingredient demand for each based on lead time and shelf life."""

        await self.forecasting_engine.initialize()
        ingredient_forecast = await self.forecasting_engine.run_forecasting_pipeline(
            horizon_days=30, reorder_horizon_days=30
        )

        return ingredient_forecast

    async def generate_suggested_purchase_orders(self, ingredient_forecast) -> None:
        print(f"\n=== Generating suggested purchase orders ===")
        purchase_orders = []

        ingredient_ids = set(ingredient_forecast.keys())
        print(f"[INFO] Ingredient IDs to process: {ingredient_ids}")

        for ingredient_id in ingredient_ids:
            print(f"\n--- Processing Ingredient {ingredient_id} ---")

            suppliers = await self.ingredient_supplier_repo.get_all_by_ingredient_id(
                ingredient_id
            )
            if not suppliers:
                print(f"[WARN] No suppliers found for ingredient {ingredient_id}")
                continue

            preferred_suppliers = [s for s in suppliers if s.preferred]
            if preferred_suppliers:
                supplier = min(
                    preferred_suppliers, key=lambda s: s.supplier_priority or 0
                )
            else:
                supplier = min(
                    suppliers, key=lambda s: s.supplier_priority or float("inf")
                )

            ingredient_supplier_id = supplier.ingredient_supplier_id
            supplier_id = supplier.supplier_id
            lead_time = supplier.lead_time_days or 0
            supplier_unit = supplier.unit
            min_order_quantity = supplier.min_order_quantity or 0
            pack_size = supplier.pack_size or 1
            quantity_per_pack_item = supplier.quantity_per_pack_item or 1

            inventory = await self.inventory_repo.get_inventory_by_ingredient(
                ingredient_id
            )
            if inventory:
                shelf_life = inventory.shelf_life_days or 0
                inventory_unit = inventory.unit
            else:
                shelf_life = supplier.shelf_life_days or 0
                inventory_unit = None

            reorder_days = lead_time + shelf_life
            print(
                f"[INFO] Lead time: {lead_time}, Shelf life: {shelf_life}, Reorder days: {reorder_days}"
            )

            if reorder_days <= 0:
                print(f"[ERROR] Invalid reorder_days for ingredient {ingredient_id}")
                continue

            today = date.today()
            lead_window = [today + timedelta(days=i) for i in range(lead_time)]
            shelf_window = [
                today + timedelta(days=i) for i in range(lead_time, reorder_days)
            ]

            daily_forecast = ingredient_forecast[ingredient_id].get(
                "daily_breakdown", []
            )
            unit = ingredient_forecast[ingredient_id].get("unit", "?")

            print(f"[DEBUG] Unit: {unit}")
            print(f"[DEBUG] Lead window: {lead_window}")
            print(f"[DEBUG] Shelf window: {shelf_window}")
            print(f"[DEBUG] Daily forecast: {daily_forecast}")

            lead_demand = sum(qty for day, qty in daily_forecast if day in lead_window)
            shelf_demand = sum(
                qty for day, qty in daily_forecast if day in shelf_window
            )
            total_demand = lead_demand + shelf_demand

            print(
                f"[RESULT] Lead demand: {lead_demand}, Shelf demand: {shelf_demand}, Total demand: {total_demand}"
            )

            reorder_qty = await self.reorder_engine.suggest_reorder_quantity(
                ingredient_id=ingredient_id,
                lead_demand=lead_demand,
                shelf_demand=shelf_demand,
                total_demand=total_demand,
                unit=unit,
                lead_time=lead_time,
            )

            print(f"[INFO] Suggested reorder quantity: {reorder_qty}")

            if reorder_qty <= 0:
                print(
                    f"[SKIP] Reorder quantity is 0 or less for ingredient {ingredient_id}"
                )
                continue

            try:
                converted_qty = convert_unit(
                    reorder_qty, from_unit=inventory_unit, to_unit=supplier_unit
                )
                print(
                    f"[INFO] Converted quantity from {inventory_unit} to {supplier_unit}: {converted_qty}"
                )
            except Exception as e:
                print(
                    f"[ERROR] Unit conversion failed for ingredient {ingredient_id}: {e}"
                )
                continue

            quantity_per_pack = pack_size * quantity_per_pack_item
            if quantity_per_pack <= 0:
                print(
                    f"[ERROR] Invalid pack configuration for ingredient {ingredient_id}"
                )
                continue

            packs_to_order = math.ceil(converted_qty / quantity_per_pack)
            total_quantity_ordered = packs_to_order * quantity_per_pack

            print(
                f"[INFO] Suggested packs: {packs_to_order}, Total quantity ordered: {total_quantity_ordered}"
            )

            purchase_orders.append(
                {
                    "ingredient_id": ingredient_id,
                    "ingredient_supplier_id": ingredient_supplier_id,
                    "supplier_id": supplier_id,
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
                    "min_order_quantity": min_order_quantity,
                }
            )

        print(f"\n=== Purchase Order Suggestions ===")
        for po in purchase_orders:
            print(po)

        self.purchase_order_suggestions = purchase_orders
        return purchase_orders

    async def write_purchase_orders_to_db(self) -> None:
        """Writes purchase orders to DB, grouped by supplier, including total prices."""
        if not self.purchase_order_suggestions:
            print("No purchase order suggestions to write.")
            return

        orders_by_supplier = defaultdict(list)
        for suggestion in self.purchase_order_suggestions:
            supplier_id = suggestion["supplier_id"]
            orders_by_supplier[supplier_id].append(suggestion)

        for supplier_id, items in orders_by_supplier.items():
            lead_time = items[0]["lead_time_days"] or 0
            order_date = date.today()
            expected_delivery_date = order_date + timedelta(days=lead_time)

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
                }
            )

            order_id = order.order_id
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
        
        print("Purchase orders written successfully.")

    from datetime import date, timedelta

    async def evaluate_forecast_accuracy(self) -> None:
        """
        Evaluate forecast accuracy for yesterday by comparing forecasted vs actual sales.
        Write results to daily_forecast_accuracy.
        """
        #! This function still needs to be worked on and tested
        yesterday = date.today() - timedelta(days=1)

        # Step 1: Get actual sales and forecasted sales
        actuals = await self.sales_repo.get_by_date(yesterday)
        forecasts = await self.forecasting_engine.get_forecast_for_date(yesterday)

        # Step 2: Match actuals and forecasts by (restaurant_id, menu_item_id)
        for key, predicted_quantity in forecasts.items():
            restaurant_id, menu_item_id = key
            actual_quantity = actuals.get(key, 0)

            # Step 3: Calculate error metrics
            forecast_error = predicted_quantity - actual_quantity
            error_percentage = (
                round((forecast_error / predicted_quantity) * 100, 2)
                if predicted_quantity else 0.0
            )

            # Step 4: Get breakdown_id for this forecasted record
            breakdown_id = await self.forecast_repo.get_breakdown_id(
                restaurant_id=restaurant_id,
                menu_item_id=menu_item_id,
                forecast_date=yesterday,
            )

            if breakdown_id is None:
                # Optionally log or raise error
                print(f"⚠️ No breakdown found for {restaurant_id}-{menu_item_id} on {yesterday}")
                continue

            # Step 5: Write to daily_forecast_accuracy table
            await self.forecast_accuracy_repo.insert_daily_accuracy(
                breakdown_id=breakdown_id,
                restaurant_id=restaurant_id,
                menu_item_id=menu_item_id,
                forecast_date=yesterday,
                predicted_quantity=predicted_quantity,
                actual_quantity=actual_quantity,
                forecast_error=forecast_error,
                error_percentage=error_percentage,
            )

        print(f"✅ Forecast accuracy evaluated for {yesterday}")

    @log_method("Finalize End Of Day Summary")
    async def finalize_end_of_day_summary(self, date: date, commit: bool = True) -> None:
        try:
            logger.info(f"[EOD] Running finalize_end_of_day_summary for {date} ({self.subscription_tier})")
            # Step 2: Tier-Based Flow
            if self.subscription_tier == 'basic':
                try:
                    logger.info("[EOD] Initializing Basic Forecasting Engine...")
                    self.basic_forecasting_engine = ForecastingEngineBasic(self.db, self.restaurant_id)
                    await self.basic_forecasting_engine.run(date)
                except Exception as e:
                    logger.error(f"[EOD] Error: {e}", exc_info=True)

            elif self.subscription_tier == 'master':
                # your master flow...
                pass

            else:
                raise ValueError(f"Unknown subscription tier: {self.subscription_tier}")

            logger.info(f"[EOD] Summary finalized successfully for {date}")

        except Exception as e:
            logger.error(f"[EOD] Failed to finalize EOD summary for {date}: {e}", exc_info=True)
            raise
    @log_method("Check if Sales data exists")
    async def check_sales_data_exists(self, date: date) -> int:
        """Check if any sales data exists for given date."""
        return await self.sales_repo.sales_exist_for_dates([date])
    
    async def write_forecast_to_db(self,forecast_results):
        pass
