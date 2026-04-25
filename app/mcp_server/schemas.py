from datetime import date
from decimal import Decimal
from typing import Annotated, Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class ActionInput(StrictModel):
    idempotency_key: Annotated[
        str,
        Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$"),
    ]
    dry_run: bool = False
    confirmation_token: Optional[str] = Field(default=None, max_length=2048)
    operator_intent: Optional[str] = Field(default=None, max_length=600)
    include_rag_context: bool = False


class RAGPreflightInput(StrictModel):
    query: Annotated[str, Field(min_length=3, max_length=1000)]
    target_tool: Optional[str] = Field(default=None, max_length=100)
    include_documents: bool = False


class QueryInput(StrictModel):
    operator_intent: Optional[str] = Field(default=None, max_length=600)
    include_rag_context: bool = False


ResolvableEntityType = Literal["menu_item", "ingredient", "recipe", "batch_recipe"]
RecipeComponentOptionType = Literal["ingredient", "batch", "recipe"]


class EntityResolutionRequest(StrictModel):
    entity_type: ResolvableEntityType
    query: Annotated[str, Field(min_length=1, max_length=200)]


class ResolveEntitiesInput(QueryInput):
    entities: Annotated[list[EntityResolutionRequest], Field(min_length=1, max_length=20)]


class ListRecipeComponentOptionsInput(QueryInput):
    component_types: list[RecipeComponentOptionType] = Field(
        default_factory=lambda: ["ingredient", "batch", "recipe"],
        min_length=1,
        max_length=3,
        description=(
            "Component option groups to return for recipe-building. Ingredient and "
            "batch options can be used in recipe or batch-recipe components; recipe "
            "options can only be nested inside recipes."
        ),
    )
    query: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional case-insensitive name/category/description filter.",
    )
    exclude_recipe_id: Optional[int] = Field(
        default=None,
        gt=0,
        description=(
            "Recipe id to exclude from nested recipe options when updating that recipe."
        ),
    )
    limit_per_type: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Maximum matching options to return for each requested component type.",
    )


class OrderModifierInput(StrictModel):
    mod_type: Literal["remove", "add", "replace", "modifier", "cooking_temp", "note"]
    reference_id: Optional[int] = None
    quantity: Annotated[Decimal, Field(gt=0)] = Decimal("1")
    note: Optional[str] = Field(default=None, max_length=255)


class OrderLineInput(StrictModel):
    menu_item_id: Annotated[int, Field(gt=0)]
    quantity: Annotated[Decimal, Field(gt=0)]
    unit_price: Annotated[Decimal, Field(ge=0)]
    instructions: Optional[str] = Field(default=None, max_length=255)
    modifiers: list[OrderModifierInput] = Field(default_factory=list)


class CreateOrderInput(ActionInput):
    external_id: Optional[str] = Field(default=None, max_length=255)
    sales_channel: Optional[str] = Field(default="in-house", max_length=50)
    items: Annotated[list[OrderLineInput], Field(min_length=1)]
    subtotal: Annotated[Decimal, Field(ge=0)]
    tax: Annotated[Decimal, Field(ge=0)] = Decimal("0")
    discount: Annotated[Decimal, Field(ge=0)] = Decimal("0")
    total: Annotated[Decimal, Field(ge=0)]


class UpdateOrderInput(ActionInput):
    order_id: Annotated[int, Field(gt=0)]
    external_id: Optional[str] = Field(default=None, max_length=255)
    sales_channel: Optional[str] = Field(default=None, max_length=50)
    status: Optional[Literal["pending", "preparing", "ready"]] = None
    items: Optional[Annotated[list[OrderLineInput], Field(min_length=1)]] = None
    subtotal: Optional[Annotated[Decimal, Field(ge=0)]] = None
    tax: Optional[Annotated[Decimal, Field(ge=0)]] = None
    discount: Optional[Annotated[Decimal, Field(ge=0)]] = None
    total: Optional[Annotated[Decimal, Field(ge=0)]] = None


class ChangeOrderStatusInput(ActionInput):
    order_id: Annotated[int, Field(gt=0)]
    status: Literal["pending", "preparing", "ready", "completed", "cancelled"]


class CreateMenuItemInput(ActionInput):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    price: Annotated[Decimal, Field(ge=0)]
    category: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = True
    recipes: list[Annotated[int, Field(gt=0)]] = Field(default_factory=list)


class UpdateMenuItemInput(ActionInput):
    menu_item_id: Annotated[int, Field(gt=0)]
    name: Optional[Annotated[str, Field(min_length=1, max_length=100)]] = None
    price: Optional[Annotated[Decimal, Field(ge=0)]] = None
    category: Optional[str] = Field(default=None, max_length=50)
    is_active: Optional[bool] = None
    recipes: Optional[list[Annotated[int, Field(gt=0)]]] = None


class SetMenuItemActiveInput(ActionInput):
    menu_item_id: Annotated[int, Field(gt=0)]
    is_active: bool


RecipeComponentType = Literal["ingredient", "batch", "recipe"]
BatchComponentType = Literal["ingredient", "batch"]


class RecipeComponentInput(StrictModel):
    reference_id: Annotated[
        int,
        Field(
            gt=0,
            description=(
                "Live restaurant-scoped component id. Use ingredient_id when "
                "ingredient_type is ingredient, batch_recipe_id when it is batch, "
                "and recipe_id when it is recipe. Resolve names with resolve_entities first."
            ),
        ),
    ]
    ingredient_type: RecipeComponentType = Field(
        default="ingredient",
        description=(
            "Component kind passed to MenuService recipe ingredients. "
            "Allowed values: ingredient, batch, or recipe."
        ),
    )
    quantity_used: Annotated[
        Decimal,
        Field(gt=0, description="Amount of the referenced component used in this recipe."),
    ]
    unit: Annotated[
        str,
        Field(
            min_length=1,
            max_length=20,
            description=(
                "Unit for quantity_used. It must be compatible with the referenced "
                "ingredient unit, batch yield_unit, or nested recipe unit."
            ),
        ),
    ]


class CreateRecipeInput(ActionInput):
    name: Annotated[
        str,
        Field(min_length=1, max_length=100, description="Recipe display name."),
    ]
    description: Optional[str] = Field(
        default=None,
        description="Optional recipe notes or prep description. Omit when unknown.",
    )
    ingredients: list[RecipeComponentInput] = Field(
        default_factory=list,
        description=(
            "Complete component list passed to MenuService.update_recipe_with_ingredients. "
            "Each entry maps to reference_id, ingredient_type, quantity_used, and unit."
        ),
    )


class UpdateRecipeInput(CreateRecipeInput):
    recipe_id: Annotated[
        int,
        Field(
            gt=0,
            description=(
                "Existing recipe_id to update. Use resolve_entities before calling this "
                "when the operator gives a recipe name."
            ),
        ),
    ]


class BatchComponentInput(StrictModel):
    reference_id: Annotated[
        int,
        Field(
            gt=0,
            description=(
                "Live restaurant-scoped component id. Use ingredient_id when "
                "ingredient_type is ingredient, or batch_recipe_id when it is batch. "
                "Resolve names with resolve_entities first."
            ),
        ),
    ]
    ingredient_type: BatchComponentType = Field(
        default="ingredient",
        description="Batch recipe component kind. Allowed values: ingredient or batch.",
    )
    quantity_used: Annotated[
        Decimal,
        Field(gt=0, description="Amount of the referenced component used in this batch."),
    ]
    unit: Annotated[
        str,
        Field(
            min_length=1,
            max_length=20,
            description=(
                "Unit for quantity_used. It must be compatible with the referenced "
                "ingredient unit or nested batch yield_unit."
            ),
        ),
    ]


class CreateBatchRecipeInput(ActionInput):
    name: Annotated[str, Field(min_length=1, max_length=100)]
    description: Optional[str] = None
    yield_quantity: Annotated[Decimal, Field(gt=0)]
    yield_unit: Annotated[str, Field(min_length=1, max_length=20)]
    estimated_prep_time_minutes: Optional[Annotated[int, Field(ge=0)]] = None
    shelf_life_days: Optional[Annotated[int, Field(ge=0)]] = None
    ingredients: list[BatchComponentInput] = Field(default_factory=list)


class UpdateBatchRecipeInput(ActionInput):
    batch_recipe_id: Annotated[int, Field(gt=0)]
    name: Optional[Annotated[str, Field(min_length=1, max_length=100)]] = None
    description: Optional[str] = None
    yield_quantity: Optional[Annotated[Decimal, Field(gt=0)]] = None
    yield_unit: Optional[Annotated[str, Field(min_length=1, max_length=20)]] = None
    estimated_prep_time_minutes: Optional[Annotated[int, Field(ge=0)]] = None
    shelf_life_days: Optional[Annotated[int, Field(ge=0)]] = None
    ingredients: Optional[list[BatchComponentInput]] = None


WeekdayCode = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
OrderScheduleType = Literal["ad_hoc", "fixed_days_of_week", "every_n_days"]
CadenceSource = Literal["manual", "inferred", "default"]


class IngredientSupplierPayload(StrictModel):
    ingredient_id: Annotated[int, Field(gt=0)]
    supplier_id: Annotated[int, Field(gt=0)]
    cost_per_unit: Annotated[Decimal, Field(ge=0)]
    lead_time_days: Annotated[int, Field(ge=0)]
    unit: Annotated[str, Field(min_length=1, max_length=20)]
    review_period_days: Optional[Annotated[int, Field(ge=0)]] = None
    order_schedule_type: Optional[OrderScheduleType] = None
    allowed_order_days: Optional[list[WeekdayCode]] = None
    allowed_delivery_days: Optional[list[WeekdayCode]] = None
    cadence_source: Optional[CadenceSource] = None
    cadence_confidence_score: Optional[Annotated[Decimal, Field(ge=0, le=1)]] = None
    shelf_life_days: Optional[Annotated[int, Field(ge=0)]] = None
    preferred: bool = False
    min_order_quantity: Optional[Annotated[int, Field(ge=0)]] = None
    supplier_priority: Optional[Annotated[int, Field(ge=0)]] = None
    pack_size: Optional[Annotated[int, Field(gt=0)]] = None
    quantity_per_pack_item: Optional[Annotated[Decimal, Field(gt=0)]] = None


class LinkIngredientSupplierInput(ActionInput, IngredientSupplierPayload):
    pass


class UpdateIngredientSupplierInput(ActionInput):
    ingredient_supplier_id: Annotated[int, Field(gt=0)]
    cost_per_unit: Optional[Annotated[Decimal, Field(ge=0)]] = None
    lead_time_days: Optional[Annotated[int, Field(ge=0)]] = None
    unit: Optional[Annotated[str, Field(min_length=1, max_length=20)]] = None
    review_period_days: Optional[Annotated[int, Field(ge=0)]] = None
    order_schedule_type: Optional[OrderScheduleType] = None
    allowed_order_days: Optional[list[WeekdayCode]] = None
    allowed_delivery_days: Optional[list[WeekdayCode]] = None
    cadence_source: Optional[CadenceSource] = None
    cadence_confidence_score: Optional[Annotated[Decimal, Field(ge=0, le=1)]] = None
    shelf_life_days: Optional[Annotated[int, Field(ge=0)]] = None
    preferred: Optional[bool] = None
    min_order_quantity: Optional[Annotated[int, Field(ge=0)]] = None
    supplier_priority: Optional[Annotated[int, Field(ge=0)]] = None
    pack_size: Optional[Annotated[int, Field(gt=0)]] = None
    quantity_per_pack_item: Optional[Annotated[Decimal, Field(gt=0)]] = None
    is_active: Optional[bool] = None


class SalesEntryInput(StrictModel):
    menu_item_id: Annotated[int, Field(gt=0)]
    quantity_sold: Annotated[int, Field(gt=0)]
    sales_channel: Optional[str] = Field(default=None, max_length=50)


class ImportSalesEntriesInput(ActionInput):
    sale_date: date
    entries: Annotated[list[SalesEntryInput], Field(min_length=1)]
    overwrite: bool = False


class AdjustInventoryQuantityInput(ActionInput):
    inventory_id: Annotated[int, Field(gt=0)]
    lot_id: Annotated[int, Field(gt=0)]
    adjustment_quantity: Annotated[Decimal, Field(gt=0)]
    usage_type: Literal["waste", "spoilage", "manual_adjustment", "manual_addition"]
    reference_id: Optional[int] = None
    reason: Annotated[str, Field(min_length=3, max_length=120)]
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("notes")
    @classmethod
    def reason_or_note_is_meaningful(cls, value: Optional[str]) -> Optional[str]:
        return value


class SetInventoryCurrentStockInput(ActionInput):
    inventory_id: Annotated[int, Field(gt=0)]
    counted_quantity: Annotated[Decimal, Field(ge=0)]
    lot_id: Optional[Annotated[int, Field(gt=0)]] = None
    reason: Annotated[str, Field(min_length=3, max_length=120)]
    notes: Optional[str] = Field(default=None, max_length=500)


PurchaseOrderStatus = Literal[
    "cart",
    "pending",
    "confirmed",
    "in_transit",
    "delivered",
    "cancelled",
]
PurchaseOrderMutableStatus = Literal["pending", "confirmed", "in_transit", "cancelled"]


class PurchaseOrderItemInput(StrictModel):
    ingredient_id: Annotated[int, Field(gt=0)]
    ingredient_supplier_id: Optional[Annotated[int, Field(gt=0)]] = None
    quantity_ordered: Annotated[Decimal, Field(gt=0)]
    unit: Annotated[str, Field(min_length=1, max_length=20)]
    unit_price: Annotated[Decimal, Field(ge=0)]
    notes: Optional[str] = Field(default=None, max_length=500)


class ListPurchaseOrdersInput(QueryInput):
    status: Optional[PurchaseOrderStatus] = None
    supplier_id: Optional[Annotated[int, Field(gt=0)]] = None


class GetPurchaseOrderInput(QueryInput):
    order_id: Annotated[int, Field(gt=0)]


class ListIngredientSuppliersInput(QueryInput):
    ingredient_id: Annotated[int, Field(gt=0)]


class ListInventoryStockLevelsInput(QueryInput):
    status: Optional[Literal["critical", "low", "warning", "ok", "unavailable"]] = None


class GetPurchaseOrderSuggestionsInput(QueryInput):
    horizon_days: Annotated[int, Field(ge=1, le=90)] = 7
    use_cached_forecast: bool = True


class CreatePurchaseOrderInput(ActionInput):
    supplier_id: Optional[Annotated[int, Field(gt=0)]] = None
    expected_delivery_date: Optional[date] = None
    items: Annotated[list[PurchaseOrderItemInput], Field(min_length=1)]
    notes: Optional[str] = Field(default=None, max_length=1000)


class PurchaseOrderSuggestionInput(StrictModel):
    ingredient_id: Annotated[int, Field(gt=0)]
    ingredient_name: Optional[str] = Field(default=None, max_length=200)
    ingredient_supplier_id: Optional[Annotated[int, Field(gt=0)]] = None
    supplier_id: Optional[Annotated[int, Field(gt=0)]] = None
    supplier_name: Optional[str] = Field(default=None, max_length=200)
    current_stock: Optional[Decimal] = None
    raw_quantity_needed: Optional[Decimal] = None
    quantity_to_order: Annotated[Decimal, Field(gt=0)]
    packs_to_order: Optional[Annotated[int, Field(ge=0)]] = None
    pack_size: Optional[Annotated[Decimal, Field(gt=0)]] = None
    quantity_per_pack_item: Optional[Annotated[Decimal, Field(gt=0)]] = None
    unit: Annotated[str, Field(min_length=1, max_length=20)]
    unit_price: Annotated[Decimal, Field(ge=0)]
    line_total: Optional[Decimal] = None
    lead_time_days: Optional[Annotated[int, Field(ge=0)]] = None
    min_order_quantity: Optional[Annotated[Decimal, Field(ge=0)]] = None
    lead_demand: Optional[Annotated[Decimal, Field(ge=0)]] = None
    shelf_demand: Optional[Annotated[Decimal, Field(ge=0)]] = None
    explanation: Optional[dict[str, Any]] = None


class CreatePurchaseOrdersFromSuggestionsInput(ActionInput):
    horizon_days: Annotated[int, Field(ge=1, le=90)] = 7
    use_cached_forecast: bool = True
    suggestions: Annotated[list[PurchaseOrderSuggestionInput], Field(min_length=1)]
    notes: Optional[str] = Field(default=None, max_length=1000)


class AddPurchaseOrderItemInput(ActionInput):
    order_id: Annotated[int, Field(gt=0)]
    item: PurchaseOrderItemInput


class UpdatePurchaseOrderItemInput(ActionInput):
    order_id: Annotated[int, Field(gt=0)]
    order_item_id: Annotated[int, Field(gt=0)]
    quantity_ordered: Optional[Annotated[Decimal, Field(gt=0)]] = None
    unit_price: Optional[Annotated[Decimal, Field(ge=0)]] = None
    unit: Optional[Annotated[str, Field(min_length=1, max_length=20)]] = None
    ingredient_supplier_id: Optional[Annotated[int, Field(gt=0)]] = None

    @model_validator(mode="after")
    def require_at_least_one_item_update(self):
        if not any(
            value is not None
            for value in (
                self.quantity_ordered,
                self.unit_price,
                self.unit,
                self.ingredient_supplier_id,
            )
        ):
            raise ValueError("At least one purchase-order item field must be provided.")
        return self


class RemovePurchaseOrderItemInput(ActionInput):
    order_id: Annotated[int, Field(gt=0)]
    order_item_id: Annotated[int, Field(gt=0)]


class ChangePurchaseOrderStatusInput(ActionInput):
    order_id: Annotated[int, Field(gt=0)]
    status: PurchaseOrderMutableStatus


class ReceivePurchaseOrderItemInput(StrictModel):
    order_item_id: Annotated[int, Field(gt=0)]
    quantity_received: Annotated[Decimal, Field(gt=0)]


class ReceivePurchaseOrderInput(ActionInput):
    order_id: Annotated[int, Field(gt=0)]
    actual_delivery_date: Optional[date] = None
    received_items: list[ReceivePurchaseOrderItemInput] = Field(default_factory=list)
