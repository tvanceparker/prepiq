from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ValidationError

from app.mcp_server.auth import MCPActorContext
from app.mcp_server.errors import MCPToolError, MCPValidationError, normalize_error
from app.mcp_server.executor import execute_mcp_action, execute_mcp_query
from app.mcp_server.registry import TOOL_SPECS
from app.mcp_server.schemas import (
    AddPurchaseOrderItemInput,
    AdjustInventoryQuantityInput,
    ChangePurchaseOrderStatusInput,
    CreateBatchRecipeInput,
    CreateMenuItemInput,
    CreatePurchaseOrderInput,
    CreatePurchaseOrdersFromSuggestionsInput,
    CreateRecipeInput,
    GetPurchaseOrderInput,
    GetPurchaseOrderSuggestionsInput,
    ImportSalesEntriesInput,
    ListIngredientSuppliersInput,
    ListInventoryStockLevelsInput,
    ListPurchaseOrdersInput,
    ListRecipeComponentOptionsInput,
    LinkIngredientSupplierInput,
    ReceivePurchaseOrderInput,
    RemovePurchaseOrderItemInput,
    ResolveEntitiesInput,
    SetInventoryCurrentStockInput,
    UpdateBatchRecipeInput,
    UpdateIngredientSupplierInput,
    UpdateMenuItemInput,
    UpdatePurchaseOrderItemInput,
    UpdateRecipeInput,
)
from app.services.helpers.assistant_action_state import AssistantPendingAction, assistant_action_state


@dataclass(frozen=True)
class AssistantToolSpec:
    name: str
    description: str
    input_model: type[BaseModel]
    adapter_name: str
    mode: Literal["query", "action"]
    parameters: dict[str, Any]


AUTO_INJECTED_FIELDS = {
    "idempotency_key",
    "dry_run",
    "confirmation_token",
    "operator_intent",
    "include_rag_context",
}


class AssistantToolExecutor:
    def __init__(
        self,
        db,
        restaurant_id: int,
        subscription_tier: str,
        employee_id: int,
        operator_intent: str,
        *,
        raw_token: str | None = None,
        conversation_id: str | None = None,
    ):
        self.db = db
        self.raw_token = raw_token
        self.conversation_id = conversation_id
        self.operator_intent = operator_intent
        self.actor = MCPActorContext(
            username=f"assistant-{employee_id}",
            restaurant_id=restaurant_id,
            subscription_tier=subscription_tier,
            employee_id=employee_id,
            name="PrepIQ Assistant",
            role_id=None,
        )
        self.pending_action: AssistantPendingAction | None = None
        self.specs = self._build_specs()

    def get_openai_tools(self) -> list[dict[str, Any]]:
        return [
            {
                "type": "function",
                "function": {
                    "name": spec.name,
                    "description": spec.description,
                    "parameters": spec.parameters,
                },
            }
            for spec in self.specs.values()
        ]

    async def execute_tool(self, name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
        spec = self.specs.get(name)
        if not spec:
            return self._result_error(
                name,
                MCPToolError("unknown_tool", f"Assistant tool {name!r} is not available."),
            )

        try:
            if spec.mode == "action":
                return await self._execute_action_tool(spec, arguments)
            return await self._execute_query_tool(spec, arguments)
        except Exception as exc:
            return self._result_error(name, normalize_error(exc))

    async def execute_pending_action(self, pending_action: AssistantPendingAction) -> dict[str, Any]:
        spec = self.specs.get(pending_action.tool_name)
        if not spec or spec.mode != "action":
            return self._result_error(
                pending_action.tool_name,
                MCPToolError("unknown_tool", f"Assistant action {pending_action.tool_name!r} is not available."),
            )

        payload = self._build_payload(
            spec,
            {
                **pending_action.arguments,
                "idempotency_key": pending_action.idempotency_key,
                "dry_run": False,
                "confirmation_token": pending_action.confirmation_token,
                "operator_intent": pending_action.operator_intent,
                "include_rag_context": False,
            },
        )
        tool_spec = TOOL_SPECS[spec.name]
        return await execute_mcp_action(
            tool_spec,
            payload,
            lambda adapters: getattr(adapters, spec.adapter_name)(payload),
            raw_token=self.raw_token,
        )

    def _build_specs(self) -> dict[str, AssistantToolSpec]:
        return {
            "resolve_entities": self._spec(
                name="resolve_entities",
                description="Resolve menu item, ingredient, recipe, or batch recipe names into live restaurant-scoped matches before answering.",
                input_model=ResolveEntitiesInput,
                adapter_name="resolve_entities",
                mode="query",
            ),
            "list_recipe_component_options": self._spec(
                name="list_recipe_component_options",
                description=(
                    "List active ingredient, batch recipe, and recipe component options "
                    "with live reference_id values and source units. Use this before "
                    "creating or updating recipes or batch recipes so payloads use valid "
                    "restaurant-scoped ids and compatible units."
                ),
                input_model=ListRecipeComponentOptionsInput,
                adapter_name="list_recipe_component_options",
                mode="query",
            ),
            "list_purchase_orders": self._spec(
                name="list_purchase_orders",
                description="List restaurant purchase orders, optionally filtered by status or supplier.",
                input_model=ListPurchaseOrdersInput,
                adapter_name="list_purchase_orders",
                mode="query",
            ),
            "get_purchase_order": self._spec(
                name="get_purchase_order",
                description="Get one restaurant purchase order with its detailed items and review context.",
                input_model=GetPurchaseOrderInput,
                adapter_name="get_purchase_order",
                mode="query",
            ),
            "list_ingredient_suppliers": self._spec(
                name="list_ingredient_suppliers",
                description="List configured suppliers for one ingredient by ingredient id.",
                input_model=ListIngredientSuppliersInput,
                adapter_name="list_ingredient_suppliers",
                mode="query",
            ),
            "list_inventory_stock_levels": self._spec(
                name="list_inventory_stock_levels",
                description="List current ingredient stock watch levels, optionally filtered by stock status.",
                input_model=ListInventoryStockLevelsInput,
                adapter_name="list_inventory_stock_levels",
                mode="query",
            ),
            "get_purchase_order_suggestions": self._spec(
                name="get_purchase_order_suggestions",
                description="Get live reorder-backed purchase-order suggestions grouped by supplier.",
                input_model=GetPurchaseOrderSuggestionsInput,
                adapter_name="get_purchase_order_suggestions",
                mode="query",
            ),
            "create_menu_item": self._spec(
                name="create_menu_item",
                description="Create a new menu item with name, price, category, active state, and optional linked recipes.",
                input_model=CreateMenuItemInput,
                adapter_name="create_menu_item",
                mode="action",
            ),
            "update_menu_item": self._spec(
                name="update_menu_item",
                description="Update an existing menu item, including name, price, category, active state, or linked recipes.",
                input_model=UpdateMenuItemInput,
                adapter_name="update_menu_item",
                mode="action",
            ),
            "create_recipe": self._spec(
                name="create_recipe",
                description=(
                    "Create a new recipe through MenuService.update_recipe_with_ingredients. "
                    "Use resolve_entities first for ingredient, recipe, or batch names. "
                    "The ingredients array is the full component list: reference_id is "
                    "ingredient_id, batch_recipe_id, or recipe_id based on ingredient_type; "
                    "quantity_used and unit must match compatible live restaurant units."
                ),
                input_model=CreateRecipeInput,
                adapter_name="create_recipe",
                mode="action",
            ),
            "update_recipe": self._spec(
                name="update_recipe",
                description=(
                    "Replace an existing recipe's name, description, and full component "
                    "list through MenuService.update_recipe_with_ingredients. Use "
                    "resolve_entities first for the recipe and component names. This is "
                    "a confirmation-gated replacement, so include every component that "
                    "should remain after the update."
                ),
                input_model=UpdateRecipeInput,
                adapter_name="update_recipe",
                mode="action",
            ),
            "create_batch_recipe": self._spec(
                name="create_batch_recipe",
                description=(
                    "Create a batch recipe through PrepService. Use resolve_entities "
                    "first for ingredient or batch component names. Components use "
                    "reference_id plus ingredient_type, quantity_used, and unit; "
                    "yield_quantity and yield_unit describe the produced batch output."
                ),
                input_model=CreateBatchRecipeInput,
                adapter_name="create_batch_recipe",
                mode="action",
            ),
            "update_batch_recipe": self._spec(
                name="update_batch_recipe",
                description=(
                    "Update an existing batch recipe. If ingredients is provided, it "
                    "replaces the full component list, so include every component that "
                    "should remain. Use resolve_entities first for batch and component names."
                ),
                input_model=UpdateBatchRecipeInput,
                adapter_name="update_batch_recipe",
                mode="action",
            ),
            "link_ingredient_supplier": self._spec(
                name="link_ingredient_supplier",
                description="Link an ingredient to a supplier with full ordering, costing, cadence, and pack metadata.",
                input_model=LinkIngredientSupplierInput,
                adapter_name="link_ingredient_supplier",
                mode="action",
            ),
            "update_ingredient_supplier": self._spec(
                name="update_ingredient_supplier",
                description="Update an existing ingredient-supplier link with new pricing, cadence, or pack data.",
                input_model=UpdateIngredientSupplierInput,
                adapter_name="update_ingredient_supplier",
                mode="action",
            ),
            "import_sales_entries": self._spec(
                name="import_sales_entries",
                description="Import structured sales entries for a given date and optional sales channels.",
                input_model=ImportSalesEntriesInput,
                adapter_name="import_sales_entries",
                mode="action",
            ),
            "adjust_inventory_quantity": self._spec(
                name="adjust_inventory_quantity",
                description="Adjust one inventory lot for waste, spoilage, manual correction, or manual addition.",
                input_model=AdjustInventoryQuantityInput,
                adapter_name="adjust_inventory_quantity",
                mode="action",
            ),
            "set_inventory_current_stock": self._spec(
                name="set_inventory_current_stock",
                description="Reconcile an inventory record to a new physically counted stock quantity.",
                input_model=SetInventoryCurrentStockInput,
                adapter_name="set_inventory_current_stock",
                mode="action",
            ),
            "create_purchase_order": self._spec(
                name="create_purchase_order",
                description="Create a purchase order from supplier-linked ingredient items.",
                input_model=CreatePurchaseOrderInput,
                adapter_name="create_purchase_order",
                mode="action",
            ),
            "create_purchase_orders_from_suggestions": self._spec(
                name="create_purchase_orders_from_suggestions",
                description="Create draft purchase orders from live reorder suggestions.",
                input_model=CreatePurchaseOrdersFromSuggestionsInput,
                adapter_name="create_purchase_orders_from_suggestions",
                mode="action",
            ),
            "add_purchase_order_item": self._spec(
                name="add_purchase_order_item",
                description="Add one ingredient line item to a draft purchase order.",
                input_model=AddPurchaseOrderItemInput,
                adapter_name="add_purchase_order_item",
                mode="action",
            ),
            "update_purchase_order_item": self._spec(
                name="update_purchase_order_item",
                description="Update quantity, unit price, unit, or supplier link for one draft purchase-order item.",
                input_model=UpdatePurchaseOrderItemInput,
                adapter_name="update_purchase_order_item",
                mode="action",
            ),
            "remove_purchase_order_item": self._spec(
                name="remove_purchase_order_item",
                description="Remove one line item from a draft purchase order.",
                input_model=RemovePurchaseOrderItemInput,
                adapter_name="remove_purchase_order_item",
                mode="action",
            ),
            "change_purchase_order_status": self._spec(
                name="change_purchase_order_status",
                description="Change the status of an existing purchase order.",
                input_model=ChangePurchaseOrderStatusInput,
                adapter_name="change_purchase_order_status",
                mode="action",
            ),
            "receive_purchase_order": self._spec(
                name="receive_purchase_order",
                description="Receive a submitted purchase order and post the received quantities into inventory.",
                input_model=ReceivePurchaseOrderInput,
                adapter_name="receive_purchase_order",
                mode="action",
            ),
        }

    def _spec(
        self,
        *,
        name: str,
        description: str,
        input_model: type[BaseModel],
        adapter_name: str,
        mode: Literal["query", "action"],
    ) -> AssistantToolSpec:
        return AssistantToolSpec(
            name=name,
            description=description,
            input_model=input_model,
            adapter_name=adapter_name,
            mode=mode,
            parameters=self._build_parameters_schema(input_model),
        )

    def _build_parameters_schema(self, input_model: type[BaseModel]) -> dict[str, Any]:
        schema = input_model.model_json_schema()
        properties = dict(schema.get("properties") or {})
        required = list(schema.get("required") or [])
        for field_name in AUTO_INJECTED_FIELDS:
            properties.pop(field_name, None)
            required = [item for item in required if item != field_name]
        schema["properties"] = properties
        if required:
            schema["required"] = required
        else:
            schema.pop("required", None)
        return schema

    async def _execute_query_tool(self, spec: AssistantToolSpec, arguments: dict[str, Any] | None) -> dict[str, Any]:
        payload = self._build_payload(spec, arguments or {})
        tool_spec = TOOL_SPECS[spec.name]
        return await execute_mcp_query(
            tool_spec,
            payload,
            lambda adapters: getattr(adapters, spec.adapter_name)(payload),
            raw_token=self.raw_token,
        )

    async def _execute_action_tool(self, spec: AssistantToolSpec, arguments: dict[str, Any] | None) -> dict[str, Any]:
        tool_spec = TOOL_SPECS[spec.name]
        payload_data = dict(arguments or {})
        payload_data.setdefault("idempotency_key", self._make_idempotency_key(spec.name))
        payload_data["dry_run"] = tool_spec.confirmation_required
        payload = self._build_payload(spec, payload_data)

        result = await execute_mcp_action(
            tool_spec,
            payload,
            lambda adapters: getattr(adapters, spec.adapter_name)(payload),
            raw_token=self.raw_token,
        )
        if result.get("requires_confirmation"):
            return self._store_pending_action(spec.name, payload, result)
        return result

    def _build_payload(self, spec: AssistantToolSpec, payload_data: dict[str, Any]) -> BaseModel:
        if "operator_intent" in spec.input_model.model_fields and "operator_intent" not in payload_data:
            payload_data["operator_intent"] = self.operator_intent
        if "include_rag_context" in spec.input_model.model_fields and "include_rag_context" not in payload_data:
            payload_data["include_rag_context"] = False
        try:
            return spec.input_model(**payload_data)
        except ValidationError as exc:
            message = exc.errors()[0].get("msg", "Invalid tool arguments.") if exc.errors() else "Invalid tool arguments."
            raise MCPValidationError(message) from exc

    def _store_pending_action(self, tool_name: str, payload: BaseModel, result: dict[str, Any]) -> dict[str, Any]:
        confirmation_token = result.get("confirmation_token")
        if not confirmation_token or not self.conversation_id:
            sanitized = dict(result)
            sanitized["confirmation_token"] = None
            return sanitized

        preview = result.get("data") if isinstance(result.get("data"), dict) else None
        business_arguments = payload.model_dump(
            mode="json",
            exclude=AUTO_INJECTED_FIELDS,
            exclude_none=True,
        )
        self.pending_action = assistant_action_state.save(
            restaurant_id=self.actor.restaurant_id,
            employee_id=self.actor.employee_id,
            conversation_id=self.conversation_id,
            tool_name=tool_name,
            idempotency_key=getattr(payload, "idempotency_key"),
            confirmation_token=confirmation_token,
            arguments=business_arguments,
            audit_id=result.get("audit_id"),
            operator_intent=self.operator_intent,
            preview=preview,
        )
        sanitized = dict(result)
        sanitized["confirmation_token"] = None
        sanitized["pending_action"] = self.pending_action.to_public_dict()
        return sanitized

    def _make_idempotency_key(self, tool_name: str) -> str:
        conversation_key = (self.conversation_id or "session").replace(" ", "-")[:32]
        return f"assistant:{conversation_key}:{tool_name}:{uuid4().hex[:12]}"

    @staticmethod
    def _result_error(name: str, error: MCPToolError) -> dict[str, Any]:
        return {
            "ok": False,
            "tool": name,
            "status": "failed",
            "data": None,
            "error": {
                "code": error.code,
                "message": error.message,
                "retryable": error.retryable,
            },
        }
