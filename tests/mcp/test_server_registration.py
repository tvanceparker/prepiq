import pytest

from app.mcp_server.server import create_mcp_server


@pytest.mark.asyncio
async def test_mcp_server_registers_expected_tools_with_strict_payload_schema():
    tools = await create_mcp_server().list_tools()
    names = {tool.name for tool in tools}

    assert {
        "prepare_action_context",
        "resolve_entities",
        "create_order",
        "update_order",
        "change_order_status",
        "create_menu_item",
        "update_menu_item",
        "set_menu_item_active",
        "create_recipe",
        "update_recipe",
        "create_batch_recipe",
        "update_batch_recipe",
        "link_ingredient_supplier",
        "update_ingredient_supplier",
        "import_sales_entries",
        "adjust_inventory_quantity",
        "set_inventory_current_stock",
        "list_purchase_orders",
        "get_purchase_order",
        "list_ingredient_suppliers",
        "list_inventory_stock_levels",
        "get_purchase_order_suggestions",
        "create_purchase_order",
        "create_purchase_orders_from_suggestions",
        "add_purchase_order_item",
        "update_purchase_order_item",
        "remove_purchase_order_item",
        "change_purchase_order_status",
        "receive_purchase_order",
    }.issubset(names)

    create_order = next(tool for tool in tools if tool.name == "create_order")
    payload_ref = create_order.inputSchema["properties"]["payload"]["$ref"]
    payload_name = payload_ref.split("/")[-1]
    assert create_order.inputSchema["$defs"][payload_name]["additionalProperties"] is False
