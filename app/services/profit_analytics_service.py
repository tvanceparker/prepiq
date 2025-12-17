# app/services/profit_analytics_service.py

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.ingredients_orm import Ingredient
from app.db.models.purchase_order_items_orm import PurchaseOrderItem
from app.db.models.purchase_orders_orm import PurchaseOrder
from app.db.models.supplier_orm import Supplier
from app.db.models.ingredient_supplier_orm import IngredientSupplier
from app.db.models.menu_item_recipes_orm import MenuItemRecipe
from app.db.models.menu_items_orm import MenuItem
from app.db.models.recipe_ingredients_orm import RecipeIngredient, IngredientType
from app.db.models.batch_recipe_ingredients_orm import BatchRecipeIngredient
from app.db.models.menu_item_batch_usage_orm import MenuItemBatchUsage
from app.repositories.batch_recipe_ingredients_repo import (
    BatchRecipeIngredientRepository,
)
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.menu_item_batch_usage_repo import MenuItemBatchUsageRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
from app.repositories.purchase_orders_repo import PurchaseOrderRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.sales_repo import SalesRepository
from app.repositories.supplier_repo import SupplierRepository
from app.schemas.profit_analytics_dto import (
    CostGranularity,
    IngredientCostTrendPoint,
    IngredientCostTrendSeries,
    IngredientCostTrendsResponse,
    DishProfitabilityResponse,
    DishProfitabilityItem,
)


class ProfitAnalyticsService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id= restaurant_id
        self.employee_id = employee_id
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.batch_recipe_ingredient_repo = BatchRecipeIngredientRepository(
            db, restaurant_id
        )
        self.ingredient_supplier = IngredientSupplierRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.menu_item_batch_usage_repo = MenuItemBatchUsageRepository(
            db, restaurant_id
        )
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.menu_item_repo = MenuItemRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)
        self.supplier_repo = SupplierRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.purchase_orders_repo = PurchaseOrderRepository(db, restaurant_id)
        self.purchase_order_items_repo = PurchaseOrderItemRepository(db, restaurant_id)

    async def get_sales(self):
        return await self.sales_repo.get_all()

    async def get_ingredient_cost_trends(
        self,
        start_date: date,
        end_date: date,
        granularity: CostGranularity = "weekly",
        ingredient_ids: Optional[List[int]] = None,
        supplier_ids: Optional[List[int]] = None,
    ) -> IngredientCostTrendsResponse:
        if start_date > end_date:
            raise ValueError("start_date must be on or before end_date")

        bucket_expr = func.coalesce(
            PurchaseOrder.actual_delivery_date, PurchaseOrder.order_date
        )

        query = (
            select(
                PurchaseOrderItem.ingredient_id,
                Ingredient.name.label("ingredient_name"),
                PurchaseOrderItem.ingredient_supplier_id,
                Supplier.supplier_id,
                Supplier.name.label("supplier_name"),
                PurchaseOrderItem.unit,
                PurchaseOrderItem.quantity_ordered,
                PurchaseOrderItem.unit_price,
                PurchaseOrderItem.total_item_price,
                bucket_expr.label("bucket_date"),
            )
            .join(PurchaseOrder, PurchaseOrder.order_id == PurchaseOrderItem.order_id)
            .join(Ingredient, Ingredient.ingredient_id == PurchaseOrderItem.ingredient_id)
            .join(Supplier, Supplier.supplier_id == PurchaseOrder.supplier_id)
            .where(PurchaseOrderItem.restaurant_id == self.restaurant_id)
            .where(PurchaseOrder.restaurant_id == self.restaurant_id)
            .where(bucket_expr >= start_date)
            .where(bucket_expr <= end_date)
        )

        if ingredient_ids:
            query = query.where(PurchaseOrderItem.ingredient_id.in_(ingredient_ids))
        if supplier_ids:
            query = query.where(Supplier.supplier_id.in_(supplier_ids))

        rows = await self.db.execute(query)
        results = rows.all()

        series_map: Dict[int, IngredientCostTrendSeries] = {}
        point_accumulator: Dict[int, Dict[date, Dict[str, float]]] = defaultdict(
            lambda: defaultdict(lambda: {"cost": 0.0, "qty": 0.0})
        )

        for row in results:
            data = row._mapping
            bucket_date = data.get("bucket_date")
            if bucket_date is None:
                continue

            bucket_start = self._normalize_bucket(bucket_date, granularity)
            quantity = float(data.get("quantity_ordered") or 0)

            total_item_price = data.get("total_item_price")
            if isinstance(total_item_price, Decimal):
                total_item_price = float(total_item_price)
            if total_item_price is None:
                unit_price = data.get("unit_price") or 0
                if isinstance(unit_price, Decimal):
                    unit_price = float(unit_price)
                total_item_price = unit_price * quantity

            cost = float(total_item_price or 0)

            ingredient_id = data.get("ingredient_id")
            if ingredient_id not in series_map:
                series_map[ingredient_id] = IngredientCostTrendSeries(
                    ingredient_id=ingredient_id,
                    ingredient_name=data.get("ingredient_name"),
                    supplier_id=data.get("supplier_id"),
                    supplier_name=data.get("supplier_name"),
                    unit=data.get("unit"),
                    points=[],
                    total_cost=0.0,
                    total_quantity=0.0,
                    avg_unit_price=None,
                )

            point_data = point_accumulator[ingredient_id][bucket_start]
            point_data["cost"] += cost
            point_data["qty"] += quantity
            series_map[ingredient_id].total_cost += cost
            series_map[ingredient_id].total_quantity = (series_map[ingredient_id].total_quantity or 0) + quantity

        for ingredient_id, buckets in point_accumulator.items():
            series = series_map[ingredient_id]
            for bucket_start, agg in sorted(buckets.items(), key=lambda item: item[0]):
                avg_price = None
                if agg["qty"]:
                    avg_price = agg["cost"] / agg["qty"]
                series.points.append(
                    IngredientCostTrendPoint(
                        bucket_start=bucket_start,
                        total_cost=round(agg["cost"], 2),
                        total_quantity=round(agg["qty"], 4) if agg["qty"] else None,
                        avg_unit_price=round(avg_price, 4) if avg_price is not None else None,
                    )
                )

            if series.total_quantity:
                series.avg_unit_price = series.total_cost / series.total_quantity

        series_list = sorted(series_map.values(), key=lambda s: s.total_cost, reverse=True)
        overall_total = sum(s.total_cost for s in series_list)

        return IngredientCostTrendsResponse(
            granularity=granularity,
            start_date=start_date,
            end_date=end_date,
            total_cost=round(overall_total, 2),
            series=series_list,
        )

    def _normalize_bucket(self, bucket_date: date, granularity: CostGranularity) -> date:
        if granularity == "daily":
            return bucket_date
        if granularity != "weekly":
            raise ValueError("granularity must be 'daily' or 'weekly'")
        return bucket_date - timedelta(days=bucket_date.weekday())

    async def get_dish_profitability(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> DishProfitabilityResponse:
        # Latest PO cost per ingredient (actual_delivery_date preferred over order_date)
        bucket_date = func.coalesce(
            PurchaseOrder.actual_delivery_date, PurchaseOrder.order_date
        )
        po_ranked = (
            select(
                PurchaseOrderItem.ingredient_id.label("ingredient_id"),
                PurchaseOrderItem.unit_price.label("unit_price"),
                PurchaseOrderItem.total_item_price.label("total_item_price"),
                PurchaseOrderItem.quantity_ordered.label("quantity_ordered"),
                func.row_number()
                .over(
                    partition_by=PurchaseOrderItem.ingredient_id,
                    order_by=bucket_date.desc(),
                )
                .label("rnk"),
            )
            .join(PurchaseOrder, PurchaseOrder.order_id == PurchaseOrderItem.order_id)
            .where(PurchaseOrderItem.restaurant_id == self.restaurant_id)
            .where(PurchaseOrder.restaurant_id == self.restaurant_id)
            .subquery()
        )

        latest_cost_rows = await self.db.execute(
            select(
                po_ranked.c.ingredient_id,
                po_ranked.c.unit_price,
                po_ranked.c.total_item_price,
                po_ranked.c.quantity_ordered,
            ).where(po_ranked.c.rnk == 1)
        )
        latest_cost_map: Dict[int, float] = {}
        for row in latest_cost_rows:
            m = row._mapping
            qty = float(m.get("quantity_ordered") or 0) or 0.0
            unit_price = m.get("unit_price")
            total_price = m.get("total_item_price")
            unit_price_val = None
            if unit_price is not None:
                unit_price_val = float(unit_price)
            elif total_price is not None and qty:
                unit_price_val = float(total_price) / qty
            if unit_price_val is not None:
                latest_cost_map[m["ingredient_id"]] = unit_price_val

        # Fallback: preferred/lowest supplier cost
        supplier_rows = await self.db.execute(
            select(
                IngredientSupplier.ingredient_id,
                IngredientSupplier.cost_per_unit,
                IngredientSupplier.preferred,
                IngredientSupplier.supplier_priority,
            ).where(IngredientSupplier.restaurant_id == self.restaurant_id)
        )
        supplier_cost_map: Dict[int, float] = {}
        for row in supplier_rows:
            m = row._mapping
            ing_id = m["ingredient_id"]
            cost = float(m["cost_per_unit"])
            preferred = bool(m.get("preferred"))
            priority = m.get("supplier_priority") or 0
            existing = supplier_cost_map.get(ing_id)
            if existing is None or preferred:
                supplier_cost_map[ing_id] = cost
            elif priority < 0:
                supplier_cost_map[ing_id] = cost

        def ingredient_cost(ingredient_id: int) -> float:
            if ingredient_id in latest_cost_map:
                return latest_cost_map[ingredient_id]
            if ingredient_id in supplier_cost_map:
                return supplier_cost_map[ingredient_id]
            return 0.0

        # Batch recipe costs aggregated once
        batch_rows = await self.db.execute(
            select(
                BatchRecipeIngredient.batch_recipe_id,
                BatchRecipeIngredient.ingredient_id,
                BatchRecipeIngredient.quantity_used,
            ).where(BatchRecipeIngredient.restaurant_id == self.restaurant_id)
        )
        batch_costs: Dict[int, float] = defaultdict(float)
        for row in batch_rows:
            m = row._mapping
            qty = float(m.get("quantity_used") or 0)
            cost = ingredient_cost(m["ingredient_id"]) * qty
            batch_costs[m["batch_recipe_id"]] += cost

        # Recipe ingredients
        recipe_rows = await self.db.execute(
            select(
                RecipeIngredient.recipe_id,
                RecipeIngredient.reference_id,
                RecipeIngredient.ingredient_type,
                RecipeIngredient.quantity_used,
            ).where(RecipeIngredient.restaurant_id == self.restaurant_id)
        )
        recipe_map: Dict[int, List[RecipeIngredient]] = defaultdict(list)
        for row in recipe_rows:
            recipe_map[row._mapping["recipe_id"]].append(row)

        # Menu item -> recipes
        menu_item_recipe_rows = await self.db.execute(
            select(
                MenuItemRecipe.menu_item_id,
                MenuItemRecipe.recipe_id,
            ).where(MenuItemRecipe.restaurant_id == self.restaurant_id)
        )
        item_recipes: Dict[int, List[int]] = defaultdict(list)
        for row in menu_item_recipe_rows:
            m = row._mapping
            item_recipes[m["menu_item_id"]].append(m["recipe_id"])

        # Menu item batch usage
        batch_usage_rows = await self.db.execute(
            select(
                MenuItemBatchUsage.menu_item_id,
                MenuItemBatchUsage.batch_recipe_id,
                MenuItemBatchUsage.quantity_used,
            ).where(MenuItemBatchUsage.restaurant_id == self.restaurant_id)
        )
        item_batches: Dict[int, List[Dict[str, float]]] = defaultdict(list)
        for row in batch_usage_rows:
            m = row._mapping
            item_batches[m["menu_item_id"]].append(
                {
                    "batch_recipe_id": m["batch_recipe_id"],
                    "quantity_used": float(m.get("quantity_used") or 0),
                }
            )

        # Menu items
        menu_items_rows = await self.db.execute(
            select(
                MenuItem.menu_item_id,
                MenuItem.name,
                MenuItem.category,
                MenuItem.price,
            ).where(MenuItem.restaurant_id == self.restaurant_id)
        )

        items: List[DishProfitabilityItem] = []
        for row in menu_items_rows:
            m = row._mapping
            price = float(m.get("price") or 0)
            ingredient_cost_total = 0.0
            batch_cost_total = 0.0

            # Recipes
            for recipe_id in item_recipes.get(m["menu_item_id"], []):
                for rec_row in recipe_map.get(recipe_id, []):
                    rm = rec_row._mapping
                    qty = float(rm.get("quantity_used") or 0)
                    if rm.get("ingredient_type") == IngredientType.ingredient:
                        ingredient_cost_total += ingredient_cost(rm.get("reference_id")) * qty
                    elif rm.get("ingredient_type") == IngredientType.batch:
                        batch_cost_total += batch_costs.get(rm.get("reference_id"), 0.0) * qty

            # Direct batch usage on menu item
            for batch_use in item_batches.get(m["menu_item_id"], []):
                batch_cost_total += batch_costs.get(batch_use["batch_recipe_id"], 0.0) * batch_use[
                    "quantity_used"
                ]

            total_food_cost = ingredient_cost_total + batch_cost_total
            gross_margin = price - total_food_cost
            food_cost_pct = (total_food_cost / price * 100) if price else 0.0

            items.append(
                DishProfitabilityItem(
                    menu_item_id=m["menu_item_id"],
                    name=m["name"],
                    category=m.get("category"),
                    price=round(price, 2),
                    ingredient_cost=round(ingredient_cost_total, 2),
                    batch_cost=round(batch_cost_total, 2),
                    total_food_cost=round(total_food_cost, 2),
                    gross_margin=round(gross_margin, 2),
                    food_cost_pct=round(food_cost_pct, 2),
                )
            )

        average_margin = 0.0
        average_food_cost_pct = 0.0
        if items:
            average_margin = sum(i.gross_margin for i in items) / len(items)
            average_food_cost_pct = sum(i.food_cost_pct for i in items) / len(items)

        return DishProfitabilityResponse(
            start_date=start_date,
            end_date=end_date,
            average_margin=round(average_margin, 2),
            average_food_cost_pct=round(average_food_cost_pct, 2),
            total_items=len(items),
            items=items,
        )
