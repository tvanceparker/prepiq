# MCP Tool Matrix

| Tool | Entity | Service Path | Access | Tier | Guardrails | Side Effects |
| --- | --- | --- | --- | --- | --- | --- |
| `prepare_action_context` | Context only | `AssistantContextBuilder`, optional `AssistantRetriever` | Active authenticated user | Basic/Full | Advisory only, no mutation | None |
| `resolve_entities` | Entity lookup | `AssistantEntityResolver` | Active authenticated user | Basic/Full | Scoped fuzzy lookup; no mutation | None |
| `create_order` | Orders | `OrderService.create_order` | Active authenticated user | Basic/Full | Menu item, channel, total validation, idempotency | Creates order/items, kitchen broadcast |
| `update_order` | Orders | `OrderService.update_order` | Active authenticated user | Basic/Full | Open-order only, confirmation, idempotency | Replaces editable order fields/items |
| `change_order_status` | Orders | `OrderService.update_order_status`, `complete_order`, `cancel_order` | Active authenticated user | Basic/Full | Allowed transitions, confirmation | Status change; completion writes sales and may deduct inventory |
| `create_menu_item` | Menu item | `MenuService.create_menu_item` | Active authenticated user | Basic/Full | Recipe links require full tier, idempotency | Creates menu item and optional recipe links |
| `update_menu_item` | Menu item | `MenuService.update_menu_item` | Active authenticated user | Basic/Full | Existing item, recipe link validation | Updates item fields/links |
| `set_menu_item_active` | Menu item | `MenuService.update_menu_item` | Active authenticated user | Basic/Full | Confirmation, no hard delete | Activates/deactivates item |
| `create_recipe` | Recipe | `MenuService.update_recipe_with_ingredients` | Active authenticated user | Full | Component existence, unit, cycle checks | Creates recipe/components |
| `update_recipe` | Recipe | `MenuService.update_recipe_with_ingredients` | Active authenticated user | Full | Confirmation, component replacement checks | Updates recipe/components |
| `create_batch_recipe` | Batch recipe | `PrepService.create_batch_recipe` | Active authenticated user | Full | Component existence, unit, cycle checks | Creates batch recipe/components |
| `update_batch_recipe` | Batch recipe | `PrepService.update_batch_recipe` | Active authenticated user | Full | Confirmation, dependent unit checks | Updates batch recipe/components |
| `link_ingredient_supplier` | Ingredient supplier | `InventoryService.create_ingredient_supplier` | Active authenticated user | Full | Confirmation, ingredient/supplier scope, duplicate check | Creates supplier link |
| `update_ingredient_supplier` | Ingredient supplier | `InventoryService.update_ingredient_supplier` | Active authenticated user | Full | Confirmation, scoped link check | Updates supplier metadata |
| `import_sales_entries` | Sales | `DashboardService.upload_sales_entries` | Active authenticated user | Basic/Full | Confirmation, date/channel duplicate checks | Inserts or overwrites sales rows |
| `adjust_inventory_quantity` | Inventory | `InventoryService.handle_inventory_adjustment` | Active authenticated user | Full | Confirmation, lot/inventory/reason required | Writes usage log and updates quantity |
| `set_inventory_current_stock` | Inventory | `InventoryService.set_inventory_current_stock` | Active authenticated user | Full | Confirmation, reason required | Reconciles inventory and writes usage logs |
| `list_purchase_orders` | Purchase orders | `InventoryService.get_purchase_orders` | Active authenticated user | Full | Scoped filters only | None |
| `get_purchase_order` | Purchase orders | `InventoryService.get_purchase_order_detail` | Active authenticated user | Full | Scoped ID lookup | None |
| `list_ingredient_suppliers` | Ingredient suppliers | `InventoryService.get_ingredient_suppliers` | Active authenticated user | Full | Active ingredient check | None |
| `list_inventory_stock_levels` | Ingredients/inventory | `InventoryService.get_ingredients_with_stock_levels` | Active authenticated user | Full | Optional status filter; service uses `manage_alerts=False` internally | None |
| `get_purchase_order_suggestions` | Reorder suggestions | `InventoryService.generate_purchase_order_suggestions` | Active authenticated user | Full | Forecast contract returned; MCP calls with `manage_alerts=False` | None |
| `create_purchase_order` | Purchase orders | `InventoryService.create_purchase_order` | Active authenticated user | Full | Confirmation, idempotency, ingredient/supplier/unit validation | Creates draft/cart PO |
| `create_purchase_orders_from_suggestions` | Purchase orders | `InventoryService.create_purchase_orders_from_suggestions` | Active authenticated user | Full | Confirmation, idempotency, live suggestion revalidation | Creates draft/cart POs grouped by supplier |
| `add_purchase_order_item` | Purchase-order item | `InventoryService.add_item_to_purchase_order` | Active authenticated user | Full | Confirmation, cart-only, ingredient/supplier/unit validation | Adds draft PO item and recalculates total |
| `update_purchase_order_item` | Purchase-order item | `InventoryService.update_purchase_order_item` | Active authenticated user | Full | Confirmation, cart-only, no ingredient mutation | Updates draft PO item and recalculates total |
| `remove_purchase_order_item` | Purchase-order item | `InventoryService.remove_item_from_purchase_order` | Active authenticated user | Full | Confirmation, cart-only | Removes draft PO item and recalculates total |
| `change_purchase_order_status` | Purchase order | `InventoryService.update_purchase_order_status` | Active authenticated user | Full | Confirmation, allowed non-receipt transitions | Updates PO status, may refresh ETA on submit |
| `receive_purchase_order` | Purchase order receipt | `InventoryService.receive_purchase_order` | Active authenticated user | Full | Confirmation, submitted-order only, item receipt validation | Creates inventory lots, updates quantities, marks delivered |
