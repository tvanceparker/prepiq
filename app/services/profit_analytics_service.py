# app/services/profit_analytics_service.py

from app.repositories.batch_recipe_ingredients_repo import (
    BatchRecipeIngredientRepository,
)
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.menu_item_batch_usage_repo import MenuItemBatchUsageRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.sales_repo import SalesRepository
from app.repositories.supplier_repo import SupplierRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict


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
