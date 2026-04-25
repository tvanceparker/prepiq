from mcp.server.fastmcp import FastMCP

from app.mcp_server.executor import execute_mcp_action, execute_mcp_query, execute_rag_preflight
from app.mcp_server.registry import TOOL_SPECS
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
    ListRecipeComponentOptionsInput,
    RAGPreflightInput,
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


def register_tools(mcp: FastMCP) -> None:
    @mcp.tool(
        description=(
            "Retrieve advisory PrepIQ context for planning an action. "
            "This never authorizes or executes mutations."
        )
    )
    async def prepare_action_context(payload: RAGPreflightInput) -> dict:
        return await execute_rag_preflight(payload)

    @mcp.tool(
        description=(
            "Resolve menu item, ingredient, recipe, or batch recipe names to scoped live IDs. "
            "Use this before mutation tools when the operator gives names instead of IDs."
        )
    )
    async def resolve_entities(payload: ResolveEntitiesInput) -> dict:
        return await execute_mcp_query(
            TOOL_SPECS["resolve_entities"],
            payload,
            lambda adapters: adapters.resolve_entities(payload),
        )

    @mcp.tool(
        description=(
            "List active ingredient, batch recipe, and recipe component options with "
            "live ids and source units for recipe-building tools."
        )
    )
    async def list_recipe_component_options(
        payload: ListRecipeComponentOptionsInput,
    ) -> dict:
        return await execute_mcp_query(
            TOOL_SPECS["list_recipe_component_options"],
            payload,
            lambda adapters: adapters.list_recipe_component_options(payload),
        )

    @mcp.tool(description="Create a scoped PrepIQ order through OrderService.")
    async def create_order(payload: CreateOrderInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["create_order"],
            payload,
            lambda adapters: adapters.create_order(payload),
        )

    @mcp.tool(description="Update editable fields or line items on an open PrepIQ order.")
    async def update_order(payload: UpdateOrderInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["update_order"],
            payload,
            lambda adapters: adapters.update_order(payload),
        )

    @mcp.tool(description="Move an order through an allowed status transition.")
    async def change_order_status(payload: ChangeOrderStatusInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["change_order_status"],
            payload,
            lambda adapters: adapters.change_order_status(payload),
        )

    @mcp.tool(description="Create a menu item without bypassing MenuService.")
    async def create_menu_item(payload: CreateMenuItemInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["create_menu_item"],
            payload,
            lambda adapters: adapters.create_menu_item(payload),
        )

    @mcp.tool(description="Update menu item fields or recipe links.")
    async def update_menu_item(payload: UpdateMenuItemInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["update_menu_item"],
            payload,
            lambda adapters: adapters.update_menu_item(payload),
        )

    @mcp.tool(description="Activate or deactivate a menu item; no hard delete is exposed.")
    async def set_menu_item_active(payload: SetMenuItemActiveInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["set_menu_item_active"],
            payload,
            lambda adapters: adapters.set_menu_item_active(payload),
        )

    @mcp.tool(
        description=(
            "Create a full-tier recipe through MenuService.update_recipe_with_ingredients. "
            "Use live ids: ingredient_id for ingredient components, batch_recipe_id for "
            "batch components, and recipe_id for nested recipe components."
        )
    )
    async def create_recipe(payload: CreateRecipeInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["create_recipe"],
            payload,
            lambda adapters: adapters.create_recipe(payload),
        )

    @mcp.tool(
        description=(
            "Replace/update a full-tier recipe and its full component list. Use live ids "
            "and include every component that should remain after the update."
        )
    )
    async def update_recipe(payload: UpdateRecipeInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["update_recipe"],
            payload,
            lambda adapters: adapters.update_recipe(payload),
        )

    @mcp.tool(
        description=(
            "Create a full-tier batch recipe through PrepService. Components use live "
            "ingredient_id or batch_recipe_id values plus quantity_used and unit."
        )
    )
    async def create_batch_recipe(payload: CreateBatchRecipeInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["create_batch_recipe"],
            payload,
            lambda adapters: adapters.create_batch_recipe(payload),
        )

    @mcp.tool(
        description=(
            "Replace/update a full-tier batch recipe. If components are supplied, they "
            "replace the full component list."
        )
    )
    async def update_batch_recipe(payload: UpdateBatchRecipeInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["update_batch_recipe"],
            payload,
            lambda adapters: adapters.update_batch_recipe(payload),
        )

    @mcp.tool(description="Link an ingredient to a supplier/vendor with purchasing metadata.")
    async def link_ingredient_supplier(payload: LinkIngredientSupplierInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["link_ingredient_supplier"],
            payload,
            lambda adapters: adapters.link_ingredient_supplier(payload),
        )

    @mcp.tool(description="Update a scoped ingredient-supplier relationship.")
    async def update_ingredient_supplier(payload: UpdateIngredientSupplierInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["update_ingredient_supplier"],
            payload,
            lambda adapters: adapters.update_ingredient_supplier(payload),
        )

    @mcp.tool(description="Import manual sales entries through DashboardService.")
    async def import_sales_entries(payload: ImportSalesEntriesInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["import_sales_entries"],
            payload,
            lambda adapters: adapters.import_sales_entries(payload),
        )

    @mcp.tool(description="Apply a reasoned inventory quantity adjustment.")
    async def adjust_inventory_quantity(payload: AdjustInventoryQuantityInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["adjust_inventory_quantity"],
            payload,
            lambda adapters: adapters.adjust_inventory_quantity(payload),
        )

    @mcp.tool(description="Reconcile an inventory item to a counted on-hand quantity.")
    async def set_inventory_current_stock(payload: SetInventoryCurrentStockInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["set_inventory_current_stock"],
            payload,
            lambda adapters: adapters.set_inventory_current_stock(payload),
        )

    @mcp.tool(description="List scoped purchase orders with optional status or supplier filters.")
    async def list_purchase_orders(payload: ListPurchaseOrdersInput) -> dict:
        return await execute_mcp_query(
            TOOL_SPECS["list_purchase_orders"],
            payload,
            lambda adapters: adapters.list_purchase_orders(payload),
        )

    @mcp.tool(description="Get one scoped purchase order with items and review context.")
    async def get_purchase_order(payload: GetPurchaseOrderInput) -> dict:
        return await execute_mcp_query(
            TOOL_SPECS["get_purchase_order"],
            payload,
            lambda adapters: adapters.get_purchase_order(payload),
        )

    @mcp.tool(description="List configured suppliers for one ingredient.")
    async def list_ingredient_suppliers(payload: ListIngredientSuppliersInput) -> dict:
        return await execute_mcp_query(
            TOOL_SPECS["list_ingredient_suppliers"],
            payload,
            lambda adapters: adapters.list_ingredient_suppliers(payload),
        )

    @mcp.tool(description="List inventory stock watch levels for purchasing lookup.")
    async def list_inventory_stock_levels(payload: ListInventoryStockLevelsInput) -> dict:
        return await execute_mcp_query(
            TOOL_SPECS["list_inventory_stock_levels"],
            payload,
            lambda adapters: adapters.list_inventory_stock_levels(payload),
        )

    @mcp.tool(description="Retrieve reorder-backed purchase-order suggestions grouped by supplier.")
    async def get_purchase_order_suggestions(payload: GetPurchaseOrderSuggestionsInput) -> dict:
        return await execute_mcp_query(
            TOOL_SPECS["get_purchase_order_suggestions"],
            payload,
            lambda adapters: adapters.get_purchase_order_suggestions(payload),
        )

    @mcp.tool(description="Create a draft/cart purchase order through InventoryService.")
    async def create_purchase_order(payload: CreatePurchaseOrderInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["create_purchase_order"],
            payload,
            lambda adapters: adapters.create_purchase_order(payload),
        )

    @mcp.tool(description="Create draft/cart purchase orders from live validated reorder suggestions.")
    async def create_purchase_orders_from_suggestions(
        payload: CreatePurchaseOrdersFromSuggestionsInput,
    ) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["create_purchase_orders_from_suggestions"],
            payload,
            lambda adapters: adapters.create_purchase_orders_from_suggestions(payload),
        )

    @mcp.tool(description="Add an item to a draft/cart purchase order.")
    async def add_purchase_order_item(payload: AddPurchaseOrderItemInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["add_purchase_order_item"],
            payload,
            lambda adapters: adapters.add_purchase_order_item(payload),
        )

    @mcp.tool(description="Update an item on a draft/cart purchase order.")
    async def update_purchase_order_item(payload: UpdatePurchaseOrderItemInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["update_purchase_order_item"],
            payload,
            lambda adapters: adapters.update_purchase_order_item(payload),
        )

    @mcp.tool(description="Remove an item from a draft/cart purchase order.")
    async def remove_purchase_order_item(payload: RemovePurchaseOrderItemInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["remove_purchase_order_item"],
            payload,
            lambda adapters: adapters.remove_purchase_order_item(payload),
        )

    @mcp.tool(description="Move a purchase order through allowed non-receipt statuses.")
    async def change_purchase_order_status(payload: ChangePurchaseOrderStatusInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["change_purchase_order_status"],
            payload,
            lambda adapters: adapters.change_purchase_order_status(payload),
        )

    @mcp.tool(description="Receive a submitted purchase order into inventory lots.")
    async def receive_purchase_order(payload: ReceivePurchaseOrderInput) -> dict:
        return await execute_mcp_action(
            TOOL_SPECS["receive_purchase_order"],
            payload,
            lambda adapters: adapters.receive_purchase_order(payload),
        )
