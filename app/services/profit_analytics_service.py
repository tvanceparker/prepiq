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
