# app/schemas/menu_dto.py
"""
Consolidated DTOs for the Menu section (menu items, recipes, ingredients, links, and suppliers).
All related Pydantic models are defined here to align with the route filename `menu_routes.py`.
"""

from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from typing import Optional, List, Literal
from decimal import Decimal


RecipeComponentType = Literal["ingredient", "batch", "recipe"]
LifecycleAction = Literal["archive"]

# --- Menu items ---
class MenuItemBase(BaseModel):
    restaurant_id: int
    name: str
    price: float
    category: Optional[str] = None
    is_active: Optional[bool] = True


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(MenuItemBase):
    pass


class MenuItem(MenuItemBase):
    menu_item_id: int

    model_config = ConfigDict(from_attributes=True)


class MenuItemUpdateRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    recipes: Optional[List[int]] = None

    model_config = ConfigDict(from_attributes=True)

# --- Recipes ---
class RecipeBase(BaseModel):
    restaurant_id: int
    name: str
    description: Optional[str] = None


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(RecipeBase):
    pass


class RecipeCostingRequest(BaseModel):
    recipe_id: int
    selling_price: float
    desired_margin: float


class Recipe(RecipeBase):
    recipe_id: int

    model_config = ConfigDict(from_attributes=True)


# --- Recipe ingredients ---
class RecipeIngredientBase(BaseModel):
    recipe_id: int
    restaurant_id: int
    ingredient_id: Optional[int] = None
    quantity_used: float
    unit: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RecipeIngredientCreate(RecipeIngredientBase):
    pass


class RecipeIngredientUpdate(RecipeIngredientBase):
    pass


class RecipeIngredientInput(BaseModel):
    ingredient_id: Optional[int] = None
    reference_id: Optional[int] = None
    ingredient_type: Optional[RecipeComponentType] = Field(
        default=None,
        validation_alias=AliasChoices("ingredient_type", "type"),
        serialization_alias="ingredient_type",
    )
    quantity_used: Decimal = Field(
        validation_alias=AliasChoices("quantity_used", "quantity"),
        serialization_alias="quantity_used",
    )
    unit: str

    model_config = ConfigDict(populate_by_name=True)


class RecipeUpsertRequest(BaseModel):
    name: str
    description: Optional[str] = None
    ingredients: List[RecipeIngredientInput]

    model_config = ConfigDict(populate_by_name=True)


class RecipeWithIngredientsDTO(BaseModel):
    recipe: RecipeCreate
    ingredients: List[RecipeIngredientCreate]


class RecipeUsageMenuItemReferenceDTO(BaseModel):
    menu_item_id: int
    menu_item_name: str
    is_active: bool


class RecipeUsageRecipeReferenceDTO(BaseModel):
    recipe_id: int
    recipe_name: str
    is_active: bool


class RecipeUsageDTO(BaseModel):
    menu_items: List[RecipeUsageMenuItemReferenceDTO]
    nested_in_recipes: List[RecipeUsageRecipeReferenceDTO]
    menu_item_count: int
    nested_recipe_count: int


class RecipeArchiveResponseDTO(BaseModel):
    message: str
    archived: bool
    lifecycle_action: Optional[LifecycleAction] = None
    usage: RecipeUsageDTO


class RecipeIngredient(RecipeIngredientBase):
    recipe_ingredient_id: int

    model_config = ConfigDict(from_attributes=True)

# --- Menu item -> recipe links ---
class MenuItemRecipeBase(BaseModel):
    menu_item_id: int
    recipe_id: int
    restaurant_id: int


class MenuItemRecipeCreate(MenuItemRecipeBase):
    menu_item_id: int
    recipe_id: int
    restaurant_id: int


class MenuItemRecipeUpdate(MenuItemRecipeBase):
    pass


class MenuItemRecipe(MenuItemRecipeBase):
    menu_item_id: int
    recipe_id: int
    model_config = ConfigDict(from_attributes=True)

# --- Ingredients and suppliers ---
class IngredientBase(BaseModel):
    restaurant_id: int
    name: str
    unit: str
    category: Optional[str] = None
    is_active: Optional[bool] = True


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(IngredientBase):
    ingredient_id: Optional[int] = None


class Ingredient(IngredientBase):
    ingredient_id: int

    model_config = ConfigDict(from_attributes=True)


class IngredientSupplierBase(BaseModel):
    ingredient_id: int
    supplier_id: int
    cost_per_unit: float
    lead_time_days: int
    spoilage_rate: Optional[float] = None
    shelf_life_days: Optional[int] = None
    preferred: Optional[bool] = False
    contract_start_date: Optional[str] = None
    contract_end_date: Optional[str] = None
    min_order_quantity: Optional[int] = None
    supplier_priority: Optional[int] = None
    pack_size: Optional[int] = None
    quantity_per_pack_item: Optional[float] = None
    is_active: Optional[bool] = True


class IngredientSupplierCreate(IngredientSupplierBase):
    pass


class IngredientSupplierUpdate(IngredientSupplierBase):
    pass


class IngredientSupplier(IngredientSupplierBase):
    ingredient_id: int
    supplier_id: int
    model_config = ConfigDict(from_attributes=True)

class MenuItemBatchUsageBase(BaseModel):
    menu_item_id: int
    batch_recipe_id: int
    restaurant_id: int
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None

class MenuItemBatchUsageCreate(MenuItemBatchUsageBase):
    pass

class MenuItemBatchUsageUpdate(BaseModel):
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None

class MenuItemBatchUsage(MenuItemBatchUsageBase):
    model_config = ConfigDict(from_attributes=True)

__all__ = [
    # Menu items
    "MenuItemBase",
    "MenuItemCreate",
    "MenuItemUpdate",
    "MenuItem",
    "MenuItemUpdateRequest",
    # Recipes
    "RecipeBase",
    "RecipeCreate",
    "RecipeUpdate",
    "Recipe",
    "RecipeCostingRequest",
    # Recipe ingredients
    "RecipeIngredientBase",
    "RecipeIngredientCreate",
    "RecipeIngredientUpdate",
    "RecipeIngredient",
    "RecipeIngredientInput",
    "RecipeUpsertRequest",
    "RecipeWithIngredientsDTO",
    "RecipeArchiveResponseDTO",
    # Links
    "MenuItemRecipeBase",
    "MenuItemRecipeCreate",
    "MenuItemRecipeUpdate",
    "MenuItemRecipe",
    # Ingredients
    "IngredientBase",
    "IngredientCreate",
    "IngredientUpdate",
    "Ingredient",
    # Ingredient suppliers
    "IngredientSupplierBase",
    "IngredientSupplierCreate",
    "IngredientSupplierUpdate",
    "IngredientSupplier",
    # Menu item batch usage
    "MenuItemBatchUsageBase",
    "MenuItemBatchUsageCreate",
    "MenuItemBatchUsageUpdate",
    "MenuItemBatchUsage",
]
