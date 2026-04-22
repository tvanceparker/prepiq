from decimal import Decimal
from typing import Any, Iterable

from app.mcp_server.auth import MCPActorContext
from app.mcp_server.errors import MCPValidationError
from app.mcp_server.schemas import (
    AdjustInventoryQuantityInput,
    AddPurchaseOrderItemInput,
    ChangeOrderStatusInput,
    ChangePurchaseOrderStatusInput,
    CreateBatchRecipeInput,
    CreateMenuItemInput,
    CreateOrderInput,
    CreatePurchaseOrderInput,
    CreatePurchaseOrdersFromSuggestionsInput,
    CreateRecipeInput,
    GetPurchaseOrderInput,
    GetPurchaseOrderSuggestionsInput,
    ImportSalesEntriesInput,
    LinkIngredientSupplierInput,
    ListIngredientSuppliersInput,
    ListInventoryStockLevelsInput,
    ListPurchaseOrdersInput,
    PurchaseOrderItemInput,
    PurchaseOrderSuggestionInput,
    ReceivePurchaseOrderInput,
    RemovePurchaseOrderItemInput,
    ResolveEntitiesInput,
    SetInventoryCurrentStockInput,
    SetMenuItemActiveInput,
    UpdateBatchRecipeInput,
    UpdateIngredientSupplierInput,
    UpdateMenuItemInput,
    UpdateOrderInput,
    UpdatePurchaseOrderItemInput,
    UpdateRecipeInput,
)
from app.schemas.dashboard_dto import EodSalesEntriesIn, SalesEntryIn
from app.schemas.order_dto import OrderCreate, OrderUpdate
from app.services.dashboard_service import DashboardService
from app.services.helpers.assistant_entity_resolver import AssistantEntityResolver
from app.services.inventory_service import InventoryService
from app.services.menu_service import MenuService
from app.services.order_service import OrderService
from app.services.prep_service import PrepService
from app.services.utils.subscription_tiers import is_full_service_tier


def jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, dict):
        return {str(key): jsonable(inner) for key, inner in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [jsonable(inner) for inner in value]
    if hasattr(value, "__table__"):
        return {
            column.name: jsonable(getattr(value, column.name))
            for column in value.__table__.columns
        }
    return str(value)


def _exclude_action_fields(payload) -> dict:
    return payload.model_dump(
        exclude={
            "dry_run",
            "confirmation_token",
            "operator_intent",
            "include_rag_context",
        },
        exclude_none=True,
    )


def _as_order_item_dicts(items) -> list[dict]:
    return [
        {
            "menu_item_id": int(item.menu_item_id),
            "quantity": float(item.quantity),
            "unit_price": float(item.unit_price),
            "instructions": item.instructions,
            "modifiers": [
                {
                    "mod_type": mod.mod_type,
                    "reference_id": mod.reference_id,
                    "quantity": float(mod.quantity),
                    "note": mod.note,
                }
                for mod in item.modifiers
            ],
        }
        for item in items
    ]


def _validate_totals(items, subtotal, tax, discount, total) -> None:
    computed_subtotal = sum(item.quantity * item.unit_price for item in items)
    expected_total = computed_subtotal + Decimal(str(tax or 0)) - Decimal(str(discount or 0))
    if abs(computed_subtotal - Decimal(str(subtotal))) > Decimal("0.01"):
        raise MCPValidationError("Order subtotal does not match line-item totals.")
    if abs(expected_total - Decimal(str(total))) > Decimal("0.01"):
        raise MCPValidationError("Order total does not match subtotal, tax, and discount.")


def _purchase_order_item_to_dict(item: PurchaseOrderItemInput) -> dict:
    return {
        "ingredient_id": int(item.ingredient_id),
        "ingredient_supplier_id": item.ingredient_supplier_id,
        "quantity_ordered": float(item.quantity_ordered),
        "unit": item.unit,
        "unit_price": float(item.unit_price),
    }


def _purchase_order_suggestion_key(item: dict | PurchaseOrderSuggestionInput) -> tuple[int, int | None, int | None]:
    if hasattr(item, "model_dump"):
        item = item.model_dump(mode="json")
    return (
        int(item["ingredient_id"]),
        item.get("ingredient_supplier_id"),
        item.get("supplier_id"),
    )


def _decimal_close(left: Any, right: Any, *, tolerance: Decimal = Decimal("0.01")) -> bool:
    return abs(Decimal(str(left or 0)) - Decimal(str(right or 0))) <= tolerance


def _status_transition_allowed(current: str, requested: str) -> bool:
    allowed = {
        "cart": {"pending", "cancelled"},
        "pending": {"confirmed", "in_transit", "cancelled"},
        "confirmed": {"in_transit", "cancelled"},
        "in_transit": {"cancelled"},
        "delivered": set(),
        "cancelled": set(),
    }
    return requested in allowed.get(current, set())


class MCPServiceAdapters:
    def __init__(self, db, actor: MCPActorContext):
        self.db = db
        self.actor = actor

    def order_service(self) -> OrderService:
        return OrderService(
            self.db,
            self.actor.restaurant_id,
            self.actor.subscription_tier,
            self.actor.employee_id,
        )

    def menu_service(self) -> MenuService:
        return MenuService(
            self.db,
            self.actor.restaurant_id,
            self.actor.subscription_tier,
            self.actor.employee_id,
        )

    def prep_service(self) -> PrepService:
        return PrepService(
            self.db,
            self.actor.restaurant_id,
            self.actor.subscription_tier,
            self.actor.employee_id,
        )

    def dashboard_service(self) -> DashboardService:
        return DashboardService(
            self.db,
            self.actor.restaurant_id,
            self.actor.subscription_tier,
            self.actor.employee_id,
        )

    def inventory_service(self) -> InventoryService:
        return InventoryService(
            self.db,
            self.actor.restaurant_id,
            self.actor.subscription_tier,
            self.actor.employee_id,
        )

    async def resolve_entities(self, payload: ResolveEntitiesInput) -> dict:
        resolver = AssistantEntityResolver(self.db, self.actor.restaurant_id)
        results = []
        for entity in payload.entities:
            if entity.entity_type == "menu_item":
                resolution = await resolver.resolve_menu_item(entity.query)
            elif entity.entity_type == "ingredient":
                resolution = await resolver.resolve_ingredient(entity.query)
            elif entity.entity_type == "recipe":
                resolution = await resolver.resolve_recipe(entity.query)
            elif entity.entity_type == "batch_recipe":
                resolution = await resolver.resolve_batch_recipe(entity.query)
            else:  # pragma: no cover - Pydantic guards the literal.
                raise MCPValidationError(f"Unsupported entity type: {entity.entity_type}.")
            results.append({"query": entity.query, **resolution})
        return {
            "restaurant_id": self.actor.restaurant_id,
            "tenant_source": "authenticated_user",
            "results": jsonable(results),
        }

    async def _require_active_menu_items(self, service: OrderService, menu_item_ids: Iterable[int]) -> None:
        found = await service.menu_repo.get_by_ids(list(set(menu_item_ids)))
        found_by_id = {item.menu_item_id: item for item in found}
        missing = []
        inactive = []
        for menu_item_id in set(menu_item_ids):
            item = found_by_id.get(menu_item_id)
            if not item:
                missing.append(menu_item_id)
            elif not getattr(item, "is_active", True):
                inactive.append(menu_item_id)
        if missing:
            raise MCPValidationError(f"Menu item(s) not found: {missing}.")
        if inactive:
            raise MCPValidationError(f"Menu item(s) are inactive: {inactive}.")

    async def _require_sales_channel(self, service: OrderService, channel: str | None) -> None:
        if channel is None:
            return
        channels = await service.get_sales_channels()
        if channel not in channels:
            raise MCPValidationError(
                f"Sales channel '{channel}' is not configured for this restaurant."
            )

    async def _require_active_recipes(self, service: MenuService, recipe_ids: list[int]) -> None:
        if not recipe_ids:
            return
        if not is_full_service_tier(self.actor.subscription_tier):
            raise MCPValidationError("Recipe links require the full tier.")
        for recipe_id in recipe_ids:
            recipe = await service.recipe_repo.get_by_id(recipe_id)
            if not recipe or not getattr(recipe, "is_active", True):
                raise MCPValidationError(f"Recipe {recipe_id} was not found or is archived.")

    async def _require_purchase_order(self, service: InventoryService, order_id: int):
        purchase_order = await service.purchase_order_repo.get_by_id(order_id)
        if not purchase_order:
            raise MCPValidationError("Purchase order not found.")
        return purchase_order

    def _require_purchase_order_draft(self, purchase_order) -> None:
        if getattr(purchase_order, "status", None) != "cart":
            raise MCPValidationError("Only draft/cart purchase orders can be edited.")

    async def _validate_purchase_order_items(
        self,
        service: InventoryService,
        items: list[PurchaseOrderItemInput],
        *,
        supplier_id: int | None,
        existing_ingredient_id_by_item_id: dict[int, int] | None = None,
    ) -> dict:
        if supplier_id is not None:
            supplier = await service.supplier_repo.get_by_id(supplier_id)
            if not supplier or not getattr(supplier, "is_active", True):
                raise MCPValidationError("Supplier not found or inactive.")

        seen = set()
        warnings = []
        for item in items:
            ingredient = await service.ingredient_repo.get_by_id(item.ingredient_id)
            if not ingredient or not getattr(ingredient, "is_active", True):
                raise MCPValidationError(f"Ingredient {item.ingredient_id} was not found or is archived.")

            if existing_ingredient_id_by_item_id:
                expected_ingredient_id = existing_ingredient_id_by_item_id.get(getattr(item, "order_item_id", None))
                if expected_ingredient_id and expected_ingredient_id != item.ingredient_id:
                    raise MCPValidationError("Purchase-order item ingredient cannot be changed.")

            key = (item.ingredient_id, item.ingredient_supplier_id)
            if key in seen:
                raise MCPValidationError("Duplicate purchase-order item ingredient/supplier pair.")
            seen.add(key)

            if supplier_id is not None and item.ingredient_supplier_id is None:
                raise MCPValidationError(
                    "ingredient_supplier_id is required when creating or editing a supplier-specific purchase order."
                )

            if item.ingredient_supplier_id is None:
                warnings.append(
                    f"Ingredient {item.ingredient_id} has no supplier link; it cannot be received into inventory until linked."
                )
                continue

            if supplier_id is None:
                raise MCPValidationError(
                    "supplier_id is required when ingredient_supplier_id is provided."
                )

            link = await service.ingredient_supplier_repo.get_by_id(item.ingredient_supplier_id)
            if not link or not getattr(link, "is_active", True):
                raise MCPValidationError(f"Ingredient-supplier link {item.ingredient_supplier_id} was not found.")
            if getattr(link, "ingredient_id", None) != item.ingredient_id:
                raise MCPValidationError(
                    f"Ingredient-supplier link {item.ingredient_supplier_id} does not match ingredient {item.ingredient_id}."
                )
            if supplier_id is not None and getattr(link, "supplier_id", None) != supplier_id:
                raise MCPValidationError(
                    f"Ingredient-supplier link {item.ingredient_supplier_id} does not belong to supplier {supplier_id}."
                )
            link_unit = getattr(link, "unit", None)
            if link_unit and item.unit != link_unit:
                raise MCPValidationError(
                    f"Unit {item.unit!r} does not match supplier unit {link_unit!r} for ingredient {item.ingredient_id}."
                )
            link_price = getattr(link, "cost_per_unit", None)
            if link_price is not None and not _decimal_close(item.unit_price, link_price):
                warnings.append(
                    f"Unit price for ingredient {item.ingredient_id} differs from configured supplier cost."
                )

        return {"validated": ["ingredients", "supplier_links", "units"], "warnings": warnings}

    async def _validate_purchase_order_suggestions(
        self,
        service: InventoryService,
        payload: CreatePurchaseOrdersFromSuggestionsInput,
    ) -> dict:
        live = await service.generate_purchase_order_suggestions(
            horizon_days=payload.horizon_days,
            use_cached_forecast=payload.use_cached_forecast,
            manage_alerts=False,
        )
        if live.get("forecast_usage_action") == "block":
            raise MCPValidationError(live.get("forecast_usage_message") or "Forecast-driven ordering is unavailable.")

        live_items = live.get("all_items") or []
        live_by_key = {_purchase_order_suggestion_key(item): item for item in live_items}
        matched_items = []
        seen = set()
        for requested in payload.suggestions:
            key = _purchase_order_suggestion_key(requested)
            if key in seen:
                raise MCPValidationError("Duplicate purchase-order suggestion item.")
            seen.add(key)
            live_item = live_by_key.get(key)
            if not live_item:
                raise MCPValidationError(
                    "Purchase-order suggestion is not present in the current live recommendation set."
                )
            if requested.unit != live_item.get("unit"):
                raise MCPValidationError("Purchase-order suggestion unit no longer matches the live recommendation.")
            if not _decimal_close(requested.quantity_to_order, live_item.get("quantity_to_order")):
                raise MCPValidationError(
                    "Purchase-order suggestion quantity no longer matches the live recommendation."
                )
            if not _decimal_close(requested.unit_price, live_item.get("unit_price")):
                raise MCPValidationError(
                    "Purchase-order suggestion unit price no longer matches the live recommendation."
                )
            matched_items.append(live_item)

        return {
            "validated": ["live_reorder_suggestions", "forecast_contract"],
            "matched_count": len(matched_items),
            "forecast_usage_action": live.get("forecast_usage_action"),
            "forecast_status": live.get("forecast_status"),
            "suggestions": matched_items,
        }

    async def _validate_purchase_order_status(self, service: InventoryService, order_id: int, status: str) -> dict:
        purchase_order = await self._require_purchase_order(service, order_id)
        current = getattr(purchase_order, "status", None) or "pending"
        if not _status_transition_allowed(current, status):
            raise MCPValidationError(
                f"Purchase-order status transition {current!r} -> {status!r} is not allowed."
            )
        return {"validated": ["purchase_order", "status_transition"], "current_status": current}

    async def preflight(self, tool_name: str, payload) -> dict:
        if tool_name == "create_order":
            service = self.order_service()
            await self._require_sales_channel(service, payload.sales_channel)
            await self._require_active_menu_items(
                service,
                [item.menu_item_id for item in payload.items],
            )
            _validate_totals(payload.items, payload.subtotal, payload.tax, payload.discount, payload.total)
            return {"validated": ["sales_channel", "menu_items", "totals"]}

        if tool_name == "update_order":
            service = self.order_service()
            existing = await service.order_repo.get_by_id(payload.order_id)
            if not existing:
                raise MCPValidationError("Order not found.")
            if existing.order_status in {"completed", "cancelled"}:
                raise MCPValidationError("Completed or cancelled orders cannot be edited.")
            if payload.sales_channel is not None:
                await self._require_sales_channel(service, payload.sales_channel)
            if payload.items is not None:
                await self._require_active_menu_items(
                    service,
                    [item.menu_item_id for item in payload.items],
                )
            if payload.items and payload.subtotal is not None and payload.total is not None:
                _validate_totals(payload.items, payload.subtotal, payload.tax or 0, payload.discount or 0, payload.total)
            return {"validated": ["order", "status", "references"]}

        if tool_name == "change_order_status":
            service = self.order_service()
            order = await service.order_repo.get_by_id(payload.order_id)
            if not order:
                raise MCPValidationError("Order not found.")
            current = service._to_frontend_status(order.order_status)
            allowed = {
                "pending": {"preparing", "ready", "completed", "cancelled"},
                "preparing": {"ready", "completed", "cancelled"},
                "ready": {"completed", "cancelled"},
                "completed": set(),
                "cancelled": set(),
            }
            if payload.status not in allowed.get(current, set()):
                raise MCPValidationError(
                    f"Order status transition {current!r} -> {payload.status!r} is not allowed."
                )
            return {"validated": ["order", "status_transition"], "current_status": current}

        if tool_name in {"create_menu_item", "update_menu_item", "set_menu_item_active"}:
            service = self.menu_service()
            if hasattr(payload, "menu_item_id"):
                existing = await service.menu_repo.get_by_id(payload.menu_item_id)
                if not existing:
                    raise MCPValidationError("Menu item not found.")
            await self._require_active_recipes(service, getattr(payload, "recipes", None) or [])
            return {"validated": ["menu_item", "recipe_links"]}

        if tool_name in {"create_recipe", "update_recipe"}:
            service = self.menu_service()
            if tool_name == "update_recipe":
                recipe = await service.recipe_repo.get_by_id(payload.recipe_id)
                if not recipe or not getattr(recipe, "is_active", True):
                    raise MCPValidationError("Recipe not found or archived.")
            await service._validate_recipe_ingredients(
                [item.model_dump() for item in payload.ingredients],
                current_recipe_id=getattr(payload, "recipe_id", None),
            )
            return {"validated": ["recipe", "components", "units", "cycles"]}

        if tool_name in {"create_batch_recipe", "update_batch_recipe"}:
            service = self.prep_service()
            current_batch_id = getattr(payload, "batch_recipe_id", None)
            if tool_name == "update_batch_recipe":
                batch = await service.batch_recipe_repo.get_by_id(current_batch_id)
                if not batch or not getattr(batch, "is_active", True):
                    raise MCPValidationError("Batch recipe not found or archived.")
                if payload.yield_unit is not None and payload.yield_unit != getattr(batch, "yield_unit", None):
                    await service._validate_dependent_batch_reference_units(
                        current_batch_id,
                        payload.yield_unit,
                    )
            ingredients = getattr(payload, "ingredients", None)
            if ingredients is not None:
                await service._validate_batch_recipe_ingredients(
                    [item.model_dump() for item in ingredients],
                    current_batch_id=current_batch_id,
                )
            return {"validated": ["batch_recipe", "components", "units", "cycles"]}

        if tool_name == "link_ingredient_supplier":
            service = self.inventory_service()
            ingredient = await service.ingredient_repo.get_by_id(payload.ingredient_id)
            supplier = await service.supplier_repo.get_by_id(payload.supplier_id)
            if not ingredient or not getattr(ingredient, "is_active", True):
                raise MCPValidationError("Ingredient not found or archived.")
            if not supplier or not getattr(supplier, "is_active", True):
                raise MCPValidationError("Supplier not found or inactive.")
            existing = await service.ingredient_supplier_repo.get_by_ingredient_and_supplier_id(
                payload.ingredient_id,
                payload.supplier_id,
            )
            if existing:
                raise MCPValidationError("Ingredient is already linked to this supplier.")
            return {"validated": ["ingredient", "supplier", "unique_link"]}

        if tool_name == "update_ingredient_supplier":
            service = self.inventory_service()
            existing = await service.ingredient_supplier_repo.get_by_id(payload.ingredient_supplier_id)
            if not existing:
                raise MCPValidationError("Ingredient-supplier link not found.")
            return {"validated": ["ingredient_supplier_link"]}

        if tool_name == "import_sales_entries":
            service = self.dashboard_service()
            sale_date = payload.sale_date
            channels = set()
            seen = set()
            for entry in payload.entries:
                item = await service.menu_repo.get_by_id(entry.menu_item_id)
                if not item or getattr(item, "restaurant_id", None) != self.actor.restaurant_id:
                    raise MCPValidationError(f"Menu item {entry.menu_item_id} was not found.")
                channel = service._clean_sales_channel(entry.sales_channel)
                key = (entry.menu_item_id, channel)
                if key in seen:
                    raise MCPValidationError("Duplicate menu item/channel pair in sales import.")
                seen.add(key)
                channels.add(channel)
            if channels and not payload.overwrite:
                exists = await service.sales_repo.sales_exist_for_date_and_channels(
                    sale_date,
                    list(channels),
                )
                if exists:
                    raise MCPValidationError(
                        "Sales already exist for that date/channel. Use overwrite with confirmation to replace."
                    )
            return {"validated": ["sale_date", "menu_items", "duplicate_check"]}

        if tool_name == "adjust_inventory_quantity":
            service = self.inventory_service()
            inventory = await service.inventory_repo.get_by_id(payload.inventory_id)
            lot = await service.inventory_lot_repo.get_by_id(payload.lot_id)
            if not inventory:
                raise MCPValidationError("Inventory item not found.")
            if not lot or lot.inventory_id != payload.inventory_id:
                raise MCPValidationError("Lot not found for this inventory item.")
            return {"validated": ["inventory", "lot", "reason"]}

        if tool_name == "set_inventory_current_stock":
            service = self.inventory_service()
            inventory = await service.inventory_repo.get_by_id(payload.inventory_id)
            if not inventory:
                raise MCPValidationError("Inventory item not found.")
            if payload.lot_id:
                lot = await service.inventory_lot_repo.get_by_id(payload.lot_id)
                if not lot or lot.inventory_id != payload.inventory_id:
                    raise MCPValidationError("Lot not found for this inventory item.")
            return {"validated": ["inventory", "lot", "reason"]}

        if tool_name == "create_purchase_order":
            service = self.inventory_service()
            return await self._validate_purchase_order_items(
                service,
                payload.items,
                supplier_id=payload.supplier_id,
            )

        if tool_name == "create_purchase_orders_from_suggestions":
            service = self.inventory_service()
            return await self._validate_purchase_order_suggestions(service, payload)

        if tool_name == "add_purchase_order_item":
            service = self.inventory_service()
            purchase_order = await self._require_purchase_order(service, payload.order_id)
            self._require_purchase_order_draft(purchase_order)
            return await self._validate_purchase_order_items(
                service,
                [payload.item],
                supplier_id=getattr(purchase_order, "supplier_id", None),
            )

        if tool_name == "update_purchase_order_item":
            service = self.inventory_service()
            purchase_order = await self._require_purchase_order(service, payload.order_id)
            self._require_purchase_order_draft(purchase_order)
            item = await service.purchase_order_item_repo.get_by_id(payload.order_item_id)
            if not item or item.order_id != payload.order_id:
                raise MCPValidationError("Purchase-order item not found for this order.")
            item_payload = PurchaseOrderItemInput(
                ingredient_id=item.ingredient_id,
                ingredient_supplier_id=payload.ingredient_supplier_id or item.ingredient_supplier_id,
                quantity_ordered=payload.quantity_ordered or item.quantity_ordered,
                unit=payload.unit or item.unit,
                unit_price=payload.unit_price if payload.unit_price is not None else item.unit_price,
            )
            return await self._validate_purchase_order_items(
                service,
                [item_payload],
                supplier_id=getattr(purchase_order, "supplier_id", None),
            )

        if tool_name == "remove_purchase_order_item":
            service = self.inventory_service()
            purchase_order = await self._require_purchase_order(service, payload.order_id)
            self._require_purchase_order_draft(purchase_order)
            item = await service.purchase_order_item_repo.get_by_id(payload.order_item_id)
            if not item or item.order_id != payload.order_id:
                raise MCPValidationError("Purchase-order item not found for this order.")
            return {"validated": ["purchase_order", "draft_status", "item"]}

        if tool_name == "change_purchase_order_status":
            service = self.inventory_service()
            return await self._validate_purchase_order_status(
                service,
                payload.order_id,
                payload.status,
            )

        if tool_name == "receive_purchase_order":
            service = self.inventory_service()
            purchase_order = await self._require_purchase_order(service, payload.order_id)
            if getattr(purchase_order, "status", None) not in {"pending", "confirmed", "in_transit"}:
                raise MCPValidationError("Only submitted purchase orders can be received.")
            items = await service.purchase_order_item_repo.get_by_field("order_id", payload.order_id)
            if not items:
                raise MCPValidationError("Purchase order has no items to receive.")
            item_by_id = {item.order_item_id: item for item in items}
            for item in items:
                if not getattr(item, "ingredient_supplier_id", None):
                    raise MCPValidationError(
                        f"Purchase-order item {item.order_item_id} is missing ingredient_supplier_id required for receipt."
                    )
            for received_item in payload.received_items:
                item = item_by_id.get(received_item.order_item_id)
                if not item:
                    raise MCPValidationError("Received item is not part of this purchase order.")
            return {
                "validated": ["purchase_order", "receipt_items", "inventory_lot_links"],
                "item_count": len(items),
            }

        raise MCPValidationError(f"Unsupported MCP tool: {tool_name}.")

    async def create_order(self, payload: CreateOrderInput) -> dict:
        service = self.order_service()
        await self._require_sales_channel(service, payload.sales_channel)
        await self._require_active_menu_items(
            service,
            [item.menu_item_id for item in payload.items],
        )
        _validate_totals(payload.items, payload.subtotal, payload.tax, payload.discount, payload.total)
        await self.db.commit()
        order = OrderCreate(
            external_id=payload.external_id,
            sales_channel=payload.sales_channel,
            items=_as_order_item_dicts(payload.items),
            subtotal=float(payload.subtotal),
            tax=float(payload.tax),
            discount=float(payload.discount),
            total=float(payload.total),
        )
        return jsonable(await service.create_order(order))

    async def update_order(self, payload: UpdateOrderInput) -> dict:
        service = self.order_service()
        existing = await service.order_repo.get_by_id(payload.order_id)
        if not existing:
            raise MCPValidationError("Order not found.")
        if existing.order_status in {"completed", "cancelled"}:
            raise MCPValidationError("Completed or cancelled orders cannot be edited.")
        if payload.sales_channel is not None:
            await self._require_sales_channel(service, payload.sales_channel)
        if payload.items is not None:
            await self._require_active_menu_items(
                service,
                [item.menu_item_id for item in payload.items],
            )
        if payload.items and payload.subtotal is not None and payload.total is not None:
            _validate_totals(
                payload.items,
                payload.subtotal,
                payload.tax or 0,
                payload.discount or 0,
                payload.total,
            )
        await self.db.commit()
        update = OrderUpdate(
            external_id=payload.external_id,
            sales_channel=payload.sales_channel,
            status=payload.status,
            items=_as_order_item_dicts(payload.items) if payload.items is not None else None,
            subtotal=float(payload.subtotal) if payload.subtotal is not None else None,
            tax=float(payload.tax) if payload.tax is not None else None,
            discount=float(payload.discount) if payload.discount is not None else None,
            total=float(payload.total) if payload.total is not None else None,
        )
        return jsonable(await service.update_order(payload.order_id, update))

    async def change_order_status(self, payload: ChangeOrderStatusInput) -> dict:
        service = self.order_service()
        order = await service.order_repo.get_by_id(payload.order_id)
        if not order:
            raise MCPValidationError("Order not found.")
        current = service._to_frontend_status(order.order_status)
        allowed = {
            "pending": {"preparing", "ready", "completed", "cancelled"},
            "preparing": {"ready", "completed", "cancelled"},
            "ready": {"completed", "cancelled"},
            "completed": set(),
            "cancelled": set(),
        }
        if payload.status not in allowed.get(current, set()):
            raise MCPValidationError(
                f"Order status transition {current!r} -> {payload.status!r} is not allowed."
            )
        await self.db.commit()
        if payload.status == "completed":
            return jsonable(await service.complete_order(payload.order_id))
        if payload.status == "cancelled":
            return jsonable(await service.cancel_order(payload.order_id))
        return jsonable(await service.update_order_status(payload.order_id, payload.status))

    async def create_menu_item(self, payload: CreateMenuItemInput) -> dict:
        service = self.menu_service()
        await self._require_active_recipes(service, payload.recipes)
        data = {
            "name": payload.name,
            "price": float(payload.price),
            "category": payload.category,
            "is_active": payload.is_active,
            "recipes": payload.recipes,
        }
        await self.db.commit()
        return jsonable(await service.create_menu_item(data))

    async def update_menu_item(self, payload: UpdateMenuItemInput) -> dict:
        service = self.menu_service()
        existing = await service.menu_repo.get_by_id(payload.menu_item_id)
        if not existing:
            raise MCPValidationError("Menu item not found.")
        await self._require_active_recipes(service, payload.recipes or [])
        await self.db.commit()
        result = await service.update_menu_item(
            menu_item_id=payload.menu_item_id,
            restaurant_id=self.actor.restaurant_id,
            name=payload.name,
            price=float(payload.price) if payload.price is not None else None,
            category=payload.category,
            is_active=payload.is_active,
            recipes=payload.recipes,
        )
        if not result:
            raise MCPValidationError("Menu item not found.")
        return jsonable(result)

    async def set_menu_item_active(self, payload: SetMenuItemActiveInput) -> dict:
        update_payload = UpdateMenuItemInput(
            idempotency_key=payload.idempotency_key,
            menu_item_id=payload.menu_item_id,
            is_active=payload.is_active,
        )
        return await self.update_menu_item(update_payload)

    async def create_recipe(self, payload: CreateRecipeInput) -> dict:
        service = self.menu_service()
        data = _exclude_action_fields(payload)
        data["ingredients"] = [
            {
                "reference_id": item.reference_id,
                "ingredient_type": item.ingredient_type,
                "quantity_used": item.quantity_used,
                "unit": item.unit,
            }
            for item in payload.ingredients
        ]
        await self.db.commit()
        return jsonable(await service.update_recipe_with_ingredients(data))

    async def update_recipe(self, payload: UpdateRecipeInput) -> dict:
        service = self.menu_service()
        data = _exclude_action_fields(payload)
        data["recipe_id"] = payload.recipe_id
        data["ingredients"] = [
            {
                "reference_id": item.reference_id,
                "ingredient_type": item.ingredient_type,
                "quantity_used": item.quantity_used,
                "unit": item.unit,
            }
            for item in payload.ingredients
        ]
        await self.db.commit()
        return jsonable(await service.update_recipe_with_ingredients(data))

    async def create_batch_recipe(self, payload: CreateBatchRecipeInput) -> dict:
        service = self.prep_service()
        await self.db.commit()
        return jsonable(
            await service.create_batch_recipe(
                name=payload.name,
                description=payload.description,
                yield_quantity=payload.yield_quantity,
                yield_unit=payload.yield_unit,
                estimated_prep_time_minutes=payload.estimated_prep_time_minutes,
                shelf_life_days=payload.shelf_life_days,
                ingredients=[item.model_dump() for item in payload.ingredients],
            )
        )

    async def update_batch_recipe(self, payload: UpdateBatchRecipeInput) -> dict:
        service = self.prep_service()
        await self.db.commit()
        await service.update_batch_recipe(
            batch_recipe_id=payload.batch_recipe_id,
            name=payload.name,
            description=payload.description,
            yield_quantity=payload.yield_quantity,
            yield_unit=payload.yield_unit,
            estimated_prep_time_minutes=payload.estimated_prep_time_minutes,
            shelf_life_days=payload.shelf_life_days,
            ingredients=(
                [item.model_dump() for item in payload.ingredients]
                if payload.ingredients is not None
                else None
            ),
        )
        return {"batch_recipe_id": payload.batch_recipe_id, "status": "updated"}

    async def link_ingredient_supplier(self, payload: LinkIngredientSupplierInput) -> dict:
        service = self.inventory_service()
        ingredient = await service.ingredient_repo.get_by_id(payload.ingredient_id)
        supplier = await service.supplier_repo.get_by_id(payload.supplier_id)
        if not ingredient or not getattr(ingredient, "is_active", True):
            raise MCPValidationError("Ingredient not found or archived.")
        if not supplier or not getattr(supplier, "is_active", True):
            raise MCPValidationError("Supplier not found or inactive.")
        existing = await service.ingredient_supplier_repo.get_by_ingredient_and_supplier_id(
            payload.ingredient_id,
            payload.supplier_id,
        )
        if existing:
            raise MCPValidationError("Ingredient is already linked to this supplier.")
        data = _exclude_action_fields(payload)
        await self.db.commit()
        result = await service.create_ingredient_supplier(payload.supplier_id, data)
        if not result.get("success"):
            raise MCPValidationError(result.get("message") or "Supplier link failed.")
        return jsonable(result)

    async def update_ingredient_supplier(self, payload: UpdateIngredientSupplierInput) -> dict:
        service = self.inventory_service()
        existing = await service.ingredient_supplier_repo.get_by_id(payload.ingredient_supplier_id)
        if not existing:
            raise MCPValidationError("Ingredient-supplier link not found.")
        data = _exclude_action_fields(payload)
        data.pop("ingredient_supplier_id", None)
        await self.db.commit()
        result = await service.update_ingredient_supplier(payload.ingredient_supplier_id, data)
        if not result.get("success"):
            raise MCPValidationError(result.get("message") or "Supplier link update failed.")
        return jsonable(result)

    async def import_sales_entries(self, payload: ImportSalesEntriesInput) -> dict:
        service = self.dashboard_service()
        dto = EodSalesEntriesIn(
            sale_date=payload.sale_date.isoformat(),
            overwrite=payload.overwrite,
            entries=[
                SalesEntryIn(
                    menu_item_id=entry.menu_item_id,
                    quantity_sold=entry.quantity_sold,
                    sales_channel=entry.sales_channel,
                )
                for entry in payload.entries
            ],
        )
        await self.db.commit()
        return jsonable(await service.upload_sales_entries(dto))

    async def adjust_inventory_quantity(self, payload: AdjustInventoryQuantityInput) -> dict:
        service = self.inventory_service()
        inventory = await service.inventory_repo.get_by_id(payload.inventory_id)
        lot = await service.inventory_lot_repo.get_by_id(payload.lot_id)
        if not inventory:
            raise MCPValidationError("Inventory item not found.")
        if not lot or lot.inventory_id != payload.inventory_id:
            raise MCPValidationError("Lot not found for this inventory item.")
        notes = f"Reason: {payload.reason}."
        if payload.notes:
            notes = f"{notes} {payload.notes}"
        await self.db.commit()
        result = await service.handle_inventory_adjustment(
            inventory_id=payload.inventory_id,
            lot_id=payload.lot_id,
            adjustment_quantity=payload.adjustment_quantity,
            usage_type=payload.usage_type,
            reference_id=payload.reference_id,
            notes=notes,
        )
        if not result.get("success"):
            raise MCPValidationError(result.get("message") or "Inventory adjustment failed.")
        return jsonable(result)

    async def set_inventory_current_stock(self, payload: SetInventoryCurrentStockInput) -> dict:
        service = self.inventory_service()
        inventory = await service.inventory_repo.get_by_id(payload.inventory_id)
        if not inventory:
            raise MCPValidationError("Inventory item not found.")
        if payload.lot_id:
            lot = await service.inventory_lot_repo.get_by_id(payload.lot_id)
            if not lot or lot.inventory_id != payload.inventory_id:
                raise MCPValidationError("Lot not found for this inventory item.")
        await self.db.commit()
        result = await service.set_inventory_current_stock(
            inventory_id=payload.inventory_id,
            counted_quantity=payload.counted_quantity,
            lot_id=payload.lot_id,
            reason=payload.reason,
            notes=payload.notes or "",
        )
        if not result.get("success"):
            raise MCPValidationError(result.get("message") or "Inventory reconciliation failed.")
        return jsonable(result)

    async def list_purchase_orders(self, payload: ListPurchaseOrdersInput) -> list[dict]:
        service = self.inventory_service()
        return jsonable(
            await service.get_purchase_orders(
                status=payload.status,
                supplier_id=payload.supplier_id,
            )
        )

    async def get_purchase_order(self, payload: GetPurchaseOrderInput) -> dict:
        service = self.inventory_service()
        result = await service.get_purchase_order_detail(payload.order_id)
        if not result:
            raise MCPValidationError("Purchase order not found.")
        return jsonable(result)

    async def list_ingredient_suppliers(self, payload: ListIngredientSuppliersInput) -> list[dict]:
        service = self.inventory_service()
        ingredient = await service.ingredient_repo.get_by_id(payload.ingredient_id)
        if not ingredient or not getattr(ingredient, "is_active", True):
            raise MCPValidationError("Ingredient not found or archived.")
        return jsonable(await service.get_ingredient_suppliers(payload.ingredient_id))

    async def list_inventory_stock_levels(self, payload: ListInventoryStockLevelsInput) -> list[dict]:
        service = self.inventory_service()
        rows = await service.get_ingredients_with_stock_levels()
        if payload.status:
            rows = [row for row in rows if row.get("status") == payload.status]
        return jsonable(rows)

    async def get_purchase_order_suggestions(self, payload: GetPurchaseOrderSuggestionsInput) -> dict:
        service = self.inventory_service()
        return jsonable(
            await service.generate_purchase_order_suggestions(
                horizon_days=payload.horizon_days,
                use_cached_forecast=payload.use_cached_forecast,
                manage_alerts=False,
            )
        )

    async def create_purchase_order(self, payload: CreatePurchaseOrderInput) -> dict:
        service = self.inventory_service()
        await self._validate_purchase_order_items(
            service,
            payload.items,
            supplier_id=payload.supplier_id,
        )
        await self.db.commit()
        return jsonable(
            await service.create_purchase_order(
                supplier_id=payload.supplier_id,
                expected_delivery_date=payload.expected_delivery_date,
                items=[_purchase_order_item_to_dict(item) for item in payload.items],
                notes=payload.notes,
            )
        )

    async def create_purchase_orders_from_suggestions(
        self,
        payload: CreatePurchaseOrdersFromSuggestionsInput,
    ) -> list[dict]:
        service = self.inventory_service()
        validation = await self._validate_purchase_order_suggestions(service, payload)
        await self.db.commit()
        return jsonable(
            await service.create_purchase_orders_from_suggestions(
                suggestions=validation["suggestions"],
                notes=payload.notes,
            )
        )

    async def add_purchase_order_item(self, payload: AddPurchaseOrderItemInput) -> dict:
        service = self.inventory_service()
        purchase_order = await self._require_purchase_order(service, payload.order_id)
        self._require_purchase_order_draft(purchase_order)
        await self._validate_purchase_order_items(
            service,
            [payload.item],
            supplier_id=getattr(purchase_order, "supplier_id", None),
        )
        await self.db.commit()
        return jsonable(
            await service.add_item_to_purchase_order(
                payload.order_id,
                _purchase_order_item_to_dict(payload.item),
            )
        )

    async def update_purchase_order_item(self, payload: UpdatePurchaseOrderItemInput) -> dict:
        service = self.inventory_service()
        purchase_order = await self._require_purchase_order(service, payload.order_id)
        self._require_purchase_order_draft(purchase_order)
        item = await service.purchase_order_item_repo.get_by_id(payload.order_item_id)
        if not item or item.order_id != payload.order_id:
            raise MCPValidationError("Purchase-order item not found for this order.")
        item_payload = PurchaseOrderItemInput(
            ingredient_id=item.ingredient_id,
            ingredient_supplier_id=payload.ingredient_supplier_id or item.ingredient_supplier_id,
            quantity_ordered=payload.quantity_ordered or item.quantity_ordered,
            unit=payload.unit or item.unit,
            unit_price=payload.unit_price if payload.unit_price is not None else item.unit_price,
        )
        await self._validate_purchase_order_items(
            service,
            [item_payload],
            supplier_id=getattr(purchase_order, "supplier_id", None),
        )
        update_data = payload.model_dump(
            exclude={
                "idempotency_key",
                "dry_run",
                "confirmation_token",
                "operator_intent",
                "include_rag_context",
                "order_id",
                "order_item_id",
            },
            exclude_none=True,
        )
        await self.db.commit()
        result = await service.update_purchase_order_item(
            payload.order_id,
            payload.order_item_id,
            update_data,
        )
        if not result:
            raise MCPValidationError("Purchase-order item not found for this order.")
        return jsonable(result)

    async def remove_purchase_order_item(self, payload: RemovePurchaseOrderItemInput) -> dict:
        service = self.inventory_service()
        purchase_order = await self._require_purchase_order(service, payload.order_id)
        self._require_purchase_order_draft(purchase_order)
        await self.db.commit()
        return jsonable(
            await service.remove_item_from_purchase_order(
                payload.order_id,
                payload.order_item_id,
            )
        )

    async def change_purchase_order_status(self, payload: ChangePurchaseOrderStatusInput) -> dict:
        service = self.inventory_service()
        await self._validate_purchase_order_status(
            service,
            payload.order_id,
            payload.status,
        )
        await self.db.commit()
        return jsonable(await service.update_purchase_order_status(payload.order_id, payload.status))

    async def receive_purchase_order(self, payload: ReceivePurchaseOrderInput) -> dict:
        service = self.inventory_service()
        purchase_order = await self._require_purchase_order(service, payload.order_id)
        if getattr(purchase_order, "status", None) not in {"pending", "confirmed", "in_transit"}:
            raise MCPValidationError("Only submitted purchase orders can be received.")
        received_items = [
            {
                "order_item_id": item.order_item_id,
                "quantity_received": float(item.quantity_received),
            }
            for item in payload.received_items
        ]
        await self.db.commit()
        return jsonable(
            await service.receive_purchase_order(
                order_id=payload.order_id,
                actual_delivery_date=payload.actual_delivery_date,
                received_items=received_items,
            )
        )
