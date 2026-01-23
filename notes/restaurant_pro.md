# Restaurant 4 Blueprint — Pro Tier (Twin Falls, ID)

Full pro-tier tenant with batches, recipes, suppliers, inventory flows, and historical sales.

---

## Tenant Profile

| Column                   | Value                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| restaurant_id            | 4                                                                                                                                                                                                                                                                                                                                                   |
| name                     | Snake River Taqueria                                                                                                                                                                                                                                                                                                                                |
| phone                    | 208-555-4400                                                                                                                                                                                                                                                                                                                                        |
| email                    | info@snakerivertaq.test                                                                                                                                                                                                                                                                                                                             |
| address                  | 210 Falls Ave                                                                                                                                                                                                                                                                                                                                       |
| city                     | Twin Falls                                                                                                                                                                                                                                                                                                                                          |
| state                    | ID                                                                                                                                                                                                                                                                                                                                                  |
| zip_code                 | 83301                                                                                                                                                                                                                                                                                                                                               |
| latitude                 | 42.5885                                                                                                                                                                                                                                                                                                                                             |
| longitude                | -114.4602                                                                                                                                                                                                                                                                                                                                           |
| timezone                 | America/Boise                                                                                                                                                                                                                                                                                                                                       |
| subscription_tier        | pro                                                                                                                                                                                                                                                                                                                                                 |
| subscription_status      | active                                                                                                                                                                                                                                                                                                                                              |
| expiry_date              | 2027-06-25                                                                                                                                                                                                                                                                                                                                          |
| tax_rate                 | 6.00                                                                                                                                                                                                                                                                                                                                                |
| forecast_length          | 14                                                                                                                                                                                                                                                                                                                                                  |
| sales_channels           | `["in-house", "takeout", "doordash"]`                                                                                                                                                                                                                                                                                                               |
| hours_of_operation       | `{"sunday": {"open": "10:30", "close": "21:00"}, "monday": {"open": "10:30", "close": "21:00"}, "tuesday": {"open": "10:30", "close": "21:00"}, "wednesday": {"open": "10:30", "close": "21:00"}, "thursday": {"open": "10:30", "close": "21:00"}, "friday": {"open": "10:30", "close": "22:00"}, "saturday": {"open": "10:30", "close": "22:00"}}` |
| eod_run_when_closed      | true                                                                                                                                                                                                                                                                                                                                                |
| eod_run_after_close_mins | 60                                                                                                                                                                                                                                                                                                                                                  |
| has_pos_display          | true                                                                                                                                                                                                                                                                                                                                                |
| has_kitchen_display      | true                                                                                                                                                                                                                                                                                                                                                |
| default_ui_layout        | auto                                                                                                                                                                                                                                                                                                                                                |
| pos_mode                 | internal                                                                                                                                                                                                                                                                                                                                            |
| pos_provider             | (null)                                                                                                                                                                                                                                                                                                                                              |
| pos_connected            | false                                                                                                                                                                                                                                                                                                                                               |
| pos_sync_enabled         | true                                                                                                                                                                                                                                                                                                                                                |
| pos_sync_orders          | true                                                                                                                                                                                                                                                                                                                                                |
| pos_sync_payments        | true                                                                                                                                                                                                                                                                                                                                                |
| pos_sync_menu            | false                                                                                                                                                                                                                                                                                                                                               |
| cash_drawer_enabled      | false                                                                                                                                                                                                                                                                                                                                               |
| settings                 | `{}`                                                                                                                                                                                                                                                                                                                                                |

---

## Permissions (restaurant_id=4)

| permission_id | restaurant_id | name                   | description            |
| ------------- | ------------- | ---------------------- | ---------------------- |
| 401           | 4             | view_menu              | View menu items        |
| 402           | 4             | edit_menu              | Edit menu items        |
| 403           | 4             | view_orders            | View orders            |
| 404           | 4             | create_orders          | Create new orders      |
| 405           | 4             | manage_orders          | Manage order status    |
| 406           | 4             | view_inventory         | View inventory levels  |
| 407           | 4             | edit_inventory         | Edit inventory         |
| 408           | 4             | view_sales             | View sales reports     |
| 409           | 4             | view_employees         | View employee list     |
| 410           | 4             | manage_employees       | Manage employees       |
| 411           | 4             | view_settings          | View settings          |
| 412           | 4             | edit_settings          | Edit settings          |
| 413           | 4             | manage_suppliers       | Manage suppliers       |
| 414           | 4             | manage_purchase_orders | Manage purchase orders |
| 415           | 4             | view_prep              | View prep schedules    |
| 416           | 4             | manage_prep            | Manage prep schedules  |

---

## Roles (restaurant_id=4)

| role_id | restaurant_id | name       | description                    |
| ------- | ------------- | ---------- | ------------------------------ |
| 401     | 4             | Owner      | Full access to all features    |
| 402     | 4             | Shift Lead | Orders, inventory counts, prep |
| 403     | 4             | Line       | Order entry only               |

---

## Role Permissions (restaurant_id=4)

**Owner (role_id=401):** all permissions (401-416)

**Shift Lead (role_id=402):** 401, 403, 404, 405, 406, 407, 408, 415, 416

**Line (role_id=403):** 401, 403, 404, 405

---

## Employees (restaurant_id=4)

| employee_id | restaurant_id | name            | email                         | username     | login_code | password_cleartext | role_id | is_active |
| ----------- | ------------- | --------------- | ----------------------------- | ------------ | ---------- | ------------------ | ------- | --------- |
| 401         | 4             | Elena Rodriguez | elena@snakerivertaqueria.com  | elena_snake  | 2001       | Test!2345          | 401     | true      |
| 402         | 4             | Carlos Mendez   | carlos@snakerivertaqueria.com | carlos_snake | 2002       | Test!2345          | 402     | true      |
| 403         | 4             | Miguel Santos   | miguel@snakerivertaqueria.com | miguel_snake | 2003       | Test!2345          | 403     | true      |

### Employee Permissions Audit (DB snapshot 2026-01-22)

| employee_id | name            | username     | role_name  | permissions                                                                                                                                                                                                                                   |
| ----------- | --------------- | ------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 402         | Carlos Mendez   | carlos_snake | Shift Lead | create_orders, edit_inventory, manage_orders, manage_prep, view_inventory, view_menu, view_orders, view_prep, view_sales                                                                                                                      |
| 401         | Elena Rodriguez | elena_snake  | Owner      | create_orders, edit_inventory, edit_menu, edit_settings, manage_employees, manage_orders, manage_prep, manage_purchase_orders, manage_suppliers, view_employees, view_inventory, view_menu, view_orders, view_prep, view_sales, view_settings |
| 403         | Miguel Santos   | miguel_snake | Line       | create_orders, manage_orders, view_menu, view_orders                                                                                                                                                                                          |

> **Note:** Passwords use Argon2id. Shared hash for `Test!2345` is `$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo`.

---

## Suppliers (restaurant_id=4)

| supplier_id | restaurant_id | name               | type    | contact_phone | contact_email          | region | rating | is_active |
| ----------- | ------------- | ------------------ | ------- | ------------- | ---------------------- | ------ | ------ | --------- |
| 401         | 4             | Gem Valley Produce | produce | 208-555-3111  | orders@gemvalley.test  | ID     | 4.7    | true      |
| 402         | 4             | High Desert Meats  | meat    | 208-555-2888  | orders@highdesert.test | ID     | 4.6    | true      |
| 403         | 4             | Basin Dry Goods    | dry     | 208-555-4410  | orders@basingoods.test | UT     | 4.5    | true      |

---

## Ingredients (restaurant_id=4)

**COMPLETE LIST — All ingredients must exist before being referenced in recipes/batches**

| ingredient_id | restaurant_id | name           | unit | category | is_active |
| ------------- | ------------- | -------------- | ---- | -------- | --------- |
| 401           | 4             | Chicken Thigh  | lb   | Protein  | true      |
| 402           | 4             | Carne Asada    | lb   | Protein  | true      |
| 403           | 4             | Carnitas       | lb   | Protein  | true      |
| 404           | 4             | Corn Tortilla  | ea   | Base     | true      |
| 405           | 4             | Flour Tortilla | ea   | Base     | true      |
| 406           | 4             | Cilantro       | oz   | Produce  | true      |
| 407           | 4             | White Onion    | oz   | Produce  | true      |
| 408           | 4             | Queso Fresco   | oz   | Dairy    | true      |
| 409           | 4             | Lime Wedge     | ea   | Produce  | true      |
| 410           | 4             | Fry Oil        | oz   | Oil      | true      |
| 411           | 4             | Roma Tomato    | oz   | Produce  | true      |
| 412           | 4             | Jalapeño       | oz   | Produce  | true      |
| 413           | 4             | Salt           | oz   | Dry      | true      |
| 414           | 4             | Lime Juice     | oz   | Produce  | true      |
| 415           | 4             | Avocado        | ea   | Produce  | true      |
| 416           | 4             | Dried Chili    | oz   | Dry      | true      |
| 417           | 4             | Vinegar        | oz   | Pantry   | true      |
| 418           | 4             | Cumin          | oz   | Spice    | true      |
| 419           | 4             | Oregano        | oz   | Spice    | true      |
| 420           | 4             | Garlic         | oz   | Produce  | true      |
| 421           | 4             | Tortilla Chips | oz   | Base     | true      |

---

## Ingredient Supplier Mappings (restaurant_id=4)

| ingredient_supplier_id | restaurant_id | ingredient_id | supplier_id | cost_per_unit | lead_time_days | shelf_life_days | spoilage_rate | preferred | min_order_quantity | unit | pack_size | quantity_per_pack_item | supplier_priority | is_active |
| ---------------------- | ------------- | ------------- | ----------- | ------------- | -------------- | --------------- | ------------- | --------- | ------------------ | ---- | --------- | ---------------------- | ----------------- | --------- |
| 401                    | 4             | 401           | 402         | 4.25          | 2              | 5               | 0.08          | true      | 10                 | lb   | 10        | 1                      | 1                 | true      |
| 402                    | 4             | 402           | 402         | 8.50          | 2              | 4               | 0.10          | true      | 10                 | lb   | 10        | 1                      | 1                 | true      |
| 403                    | 4             | 403           | 402         | 6.75          | 2              | 5               | 0.08          | true      | 10                 | lb   | 10        | 1                      | 1                 | true      |
| 404                    | 4             | 404           | 403         | 0.08          | 3              | 14              | 0.02          | true      | 100                | ea   | 100       | 1                      | 1                 | true      |
| 405                    | 4             | 405           | 403         | 0.12          | 3              | 14              | 0.02          | true      | 100                | ea   | 100       | 1                      | 1                 | true      |
| 406                    | 4             | 406           | 401         | 0.15          | 2              | 5               | 0.15          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 407                    | 4             | 407           | 401         | 0.10          | 2              | 10              | 0.05          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 408                    | 4             | 408           | 401         | 0.25          | 2              | 21              | 0.03          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 409                    | 4             | 409           | 401         | 0.05          | 2              | 14              | 0.05          | true      | 50                 | ea   | 50        | 1                      | 1                 | true      |
| 410                    | 4             | 410           | 403         | 0.04          | 4              | 180             | 0.01          | true      | 128                | oz   | 128       | 1                      | 1                 | true      |
| 411                    | 4             | 411           | 401         | 0.08          | 2              | 7               | 0.10          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 412                    | 4             | 412           | 401         | 0.12          | 2              | 10              | 0.08          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 413                    | 4             | 413           | 403         | 0.02          | 4              | 365             | 0.00          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 414                    | 4             | 414           | 401         | 0.10          | 2              | 14              | 0.05          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 415                    | 4             | 415           | 401         | 0.75          | 2              | 4               | 0.15          | true      | 24                 | ea   | 24        | 1                      | 1                 | true      |
| 416                    | 4             | 416           | 403         | 0.30          | 4              | 180             | 0.01          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 417                    | 4             | 417           | 403         | 0.05          | 4              | 365             | 0.00          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 418                    | 4             | 418           | 403         | 0.40          | 4              | 365             | 0.00          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 419                    | 4             | 419           | 403         | 0.35          | 4              | 365             | 0.00          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 420                    | 4             | 420           | 401         | 0.15          | 2              | 21              | 0.05          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 421                    | 4             | 421           | 403         | 0.06          | 3              | 30              | 0.02          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |

---

## Batch Recipes (restaurant_id=4)

| batch_recipe_id | restaurant_id | name           | description                      | yield_quantity | yield_unit | shelf_life_days | estimated_prep_time_minutes |
| --------------- | ------------- | -------------- | -------------------------------- | -------------- | ---------- | --------------- | --------------------------- |
| 401             | 4             | Pico de Gallo  | Fresh tomato salsa               | 160            | oz         | 3               | 30                          |
| 402             | 4             | Guacamole      | Fresh avocado dip                | 120            | oz         | 2               | 20                          |
| 403             | 4             | Adobo Marinade | Chili-based marinade for chicken | 80             | oz         | 5               | 25                          |

---

## Batch Recipe Ingredients (restaurant_id=4)

Uses new schema with `ingredient_type` and `reference_id`:

| batch_recipe_ingredient_id | batch_recipe_id | restaurant_id | reference_id | ingredient_type | quantity_used | unit |
| -------------------------- | --------------- | ------------- | ------------ | --------------- | ------------- | ---- |
| 4001                       | 401             | 4             | 411          | ingredient      | 60            | oz   |
| 4002                       | 401             | 4             | 407          | ingredient      | 40            | oz   |
| 4003                       | 401             | 4             | 406          | ingredient      | 20            | oz   |
| 4004                       | 401             | 4             | 414          | ingredient      | 10            | oz   |
| 4005                       | 401             | 4             | 412          | ingredient      | 8             | oz   |
| 4006                       | 401             | 4             | 413          | ingredient      | 5             | oz   |
| 4007                       | 402             | 4             | 415          | ingredient      | 12            | ea   |
| 4008                       | 402             | 4             | 401          | batch           | 20            | oz   |
| 4009                       | 402             | 4             | 414          | ingredient      | 5             | oz   |
| 4010                       | 402             | 4             | 413          | ingredient      | 3             | oz   |
| 4011                       | 403             | 4             | 416          | ingredient      | 40            | oz   |
| 4012                       | 403             | 4             | 417          | ingredient      | 20            | oz   |
| 4013                       | 403             | 4             | 418          | ingredient      | 8             | oz   |
| 4014                       | 403             | 4             | 419          | ingredient      | 6             | oz   |
| 4015                       | 403             | 4             | 420          | ingredient      | 6             | oz   |

> **Note:** Guacamole (batch_recipe_id=402) uses Pico de Gallo (reference_id=401, ingredient_type='batch') as a nested batch ingredient.

---

## Recipes (restaurant_id=4)

| recipe_id | restaurant_id | name               | description                            |
| --------- | ------------- | ------------------ | -------------------------------------- |
| 401       | 4             | Carne Asada Taco   | Grilled steak taco with pico and queso |
| 402       | 4             | Pollo Adobado Taco | Adobo marinated chicken taco           |
| 403       | 4             | Carnitas Burrito   | Slow-cooked pork burrito               |
| 404       | 4             | Chips & Guac       | House chips with fresh guacamole       |

---

## Recipe Ingredients (restaurant_id=4)

| recipe_ingredient_id | recipe_id | restaurant_id | reference_id | ingredient_type | quantity_used | unit |
| -------------------- | --------- | ------------- | ------------ | --------------- | ------------- | ---- |
| 4101                 | 401       | 4             | 404          | ingredient      | 2             | ea   |
| 4102                 | 401       | 4             | 402          | ingredient      | 0.18          | lb   |
| 4103                 | 401       | 4             | 401          | batch           | 1.5           | oz   |
| 4104                 | 401       | 4             | 408          | ingredient      | 0.8           | oz   |
| 4105                 | 401       | 4             | 409          | ingredient      | 1             | ea   |
| 4106                 | 402       | 4             | 404          | ingredient      | 2             | ea   |
| 4107                 | 402       | 4             | 401          | ingredient      | 0.18          | lb   |
| 4108                 | 402       | 4             | 403          | batch           | 1.2           | oz   |
| 4109                 | 402       | 4             | 401          | batch           | 1             | oz   |
| 4110                 | 402       | 4             | 408          | ingredient      | 0.8           | oz   |
| 4111                 | 403       | 4             | 405          | ingredient      | 1             | ea   |
| 4112                 | 403       | 4             | 403          | ingredient      | 0.30          | lb   |
| 4113                 | 403       | 4             | 401          | batch           | 2             | oz   |
| 4114                 | 403       | 4             | 402          | batch           | 2             | oz   |
| 4115                 | 403       | 4             | 408          | ingredient      | 1.2           | oz   |
| 4116                 | 404       | 4             | 421          | ingredient      | 4             | oz   |
| 4117                 | 404       | 4             | 402          | batch           | 3             | oz   |

---

## Menu Items (restaurant_id=4)

| menu_item_id | restaurant_id | name               | price | category | is_active |
| ------------ | ------------- | ------------------ | ----- | -------- | --------- |
| 401          | 4             | Carne Asada Taco   | 4.75  | Tacos    | true      |
| 402          | 4             | Pollo Adobado Taco | 4.50  | Tacos    | true      |
| 403          | 4             | Carnitas Burrito   | 9.50  | Burritos | true      |
| 404          | 4             | Chips & Guac       | 6.00  | Snacks   | true      |

---

## Menu Item Recipes (restaurant_id=4)

| menu_item_id | recipe_id |
| ------------ | --------- |
| 401          | 401       |
| 402          | 402       |
| 403          | 403       |
| 404          | 404       |

---

## Menu Item Batch Usage (restaurant_id=4)

Direct batch consumption by menu items (optional, in addition to recipe linkage):

| menu_item_id | batch_recipe_id | quantity_used | unit |
| ------------ | --------------- | ------------- | ---- |
| 404          | 402             | 3.0           | oz   |

---

## Inventory (restaurant_id=4)

| inventory_id | restaurant_id | ingredient_id | batch_recipe_id | quantity_on_hand | min_stock_level | max_stock_level | unit |
| ------------ | ------------- | ------------- | --------------- | ---------------- | --------------- | --------------- | ---- |
| 401          | 4             | 401           | (null)          | 20.0             | 10.0            | 50.0            | lb   |
| 402          | 4             | 402           | (null)          | 15.0             | 8.0             | 40.0            | lb   |
| 403          | 4             | 403           | (null)          | 18.0             | 10.0            | 40.0            | lb   |
| 404          | 4             | 404           | (null)          | 200              | 100             | 500             | ea   |
| 405          | 4             | 405           | (null)          | 150              | 80              | 400             | ea   |
| 406          | 4             | 406           | (null)          | 64               | 32              | 128             | oz   |
| 407          | 4             | 407           | (null)          | 96               | 48              | 192             | oz   |
| 408          | 4             | 408           | (null)          | 64               | 32              | 128             | oz   |
| 409          | 4             | 409           | (null)          | 75               | 40              | 150             | ea   |
| 410          | 4             | 410           | (null)          | 256              | 128             | 512             | oz   |
| 411          | 4             | 411           | (null)          | 128              | 64              | 256             | oz   |
| 412          | 4             | 412           | (null)          | 48               | 24              | 96              | oz   |
| 413          | 4             | 413           | (null)          | 64               | 32              | 128             | oz   |
| 414          | 4             | 414           | (null)          | 48               | 24              | 96              | oz   |
| 415          | 4             | 415           | (null)          | 36               | 18              | 72              | ea   |
| 416          | 4             | 416           | (null)          | 48               | 24              | 96              | oz   |
| 417          | 4             | 417           | (null)          | 64               | 32              | 128             | oz   |
| 418          | 4             | 418           | (null)          | 24               | 12              | 48              | oz   |
| 419          | 4             | 419           | (null)          | 24               | 12              | 48              | oz   |
| 420          | 4             | 420           | (null)          | 48               | 24              | 96              | oz   |
| 421          | 4             | 421           | (null)          | 128              | 64              | 256             | oz   |
| 422          | 4             | (null)        | 401             | 80               | 40              | 160             | oz   |
| 423          | 4             | (null)        | 402             | 60               | 30              | 120             | oz   |
| 424          | 4             | (null)        | 403             | 40               | 20              | 80              | oz   |

---

## Inventory Lots (restaurant_id=4)

| lot_id | inventory_id | restaurant_id | ingredient_supplier_id | delivery_date | spoilage_expected_date | quantity | total_received | unit | ingredient_id | batch_recipe_id | status    |
| ------ | ------------ | ------------- | ---------------------- | ------------- | ---------------------- | -------- | -------------- | ---- | ------------- | --------------- | --------- |
| 401    | 401          | 4             | 401                    | 2025-12-20    | 2025-12-25             | 10.0     | 10.0           | lb   | 401           | (null)          | available |
| 402    | 402          | 4             | 402                    | 2025-12-19    | 2025-12-23             | 10.0     | 10.0           | lb   | 402           | (null)          | available |
| 403    | 403          | 4             | 403                    | 2025-12-20    | 2025-12-25             | 10.0     | 10.0           | lb   | 403           | (null)          | available |
| 404    | 411          | 4             | 411                    | 2025-12-22    | 2025-12-29             | 64.0     | 64.0           | oz   | 411           | (null)          | available |
| 405    | 415          | 4             | 415                    | 2025-12-23    | 2025-12-27             | 24       | 24             | ea   | 415           | (null)          | available |
| 406    | 422          | 4             | (null)                 | 2025-12-24    | 2025-12-27             | 40.0     | 40.0           | oz   | (null)        | 401             | available |
| 407    | 423          | 4             | (null)                 | 2025-12-24    | 2025-12-26             | 30.0     | 30.0           | oz   | (null)        | 402             | available |

---

## Purchase Orders (restaurant_id=4)

| purchase_order_id | restaurant_id | supplier_id | order_date | expected_delivery_date | status   | total_order_price |
| ----------------- | ------------- | ----------- | ---------- | ---------------------- | -------- | ----------------- |
| 401               | 4             | 401         | 2025-12-20 | 2025-12-22             | received | 45.60             |
| 402               | 4             | 402         | 2025-12-21 | 2025-12-23             | pending  | 127.50            |

---

## Purchase Order Items (restaurant_id=4)

| purchase_order_item_id | purchase_order_id | restaurant_id | ingredient_supplier_id | ingredient_id | quantity | unit_price | total_item_price |
| ---------------------- | ----------------- | ------------- | ---------------------- | ------------- | -------- | ---------- | ---------------- |
| 4001                   | 401               | 4             | 411                    | 411           | 128      | 0.08       | 10.24            |
| 4002                   | 401               | 4             | 415                    | 415           | 48       | 0.75       | 36.00            |
| 4003                   | 402               | 4             | 401                    | 401           | 15       | 4.25       | 63.75            |
| 4004                   | 402               | 4             | 402                    | 402           | 7.5      | 8.50       | 63.75            |

---

## Inventory Usage Logs (restaurant_id=4)

| usage_log_id | restaurant_id | inventory_id | lot_id | usage_type       | reference_type | reference_id | quantity_used | unit | timestamp           |
| ------------ | ------------- | ------------ | ------ | ---------------- | -------------- | ------------ | ------------- | ---- | ------------------- |
| 4001         | 4             | 422          | 406    | sale             | order          | 401          | 1.5           | oz   | 2025-12-24 12:30:00 |
| 4002         | 4             | 423          | 407    | sale             | order          | 401          | 3.0           | oz   | 2025-12-24 12:30:00 |
| 4003         | 4             | 401          | 401    | batch_production | batch          | 401          | 0.18          | lb   | 2025-12-24 09:00:00 |
| 4004         | 4             | 422          | (null) | batch_output     | batch          | 401          | 40.0          | oz   | 2025-12-24 09:30:00 |
| 4005         | 4             | 415          | 405    | waste            | lot            | 405          | 2             | ea   | 2025-12-23 21:00:00 |

---

## Historical Sales (restaurant_id=4)

Generate sales records for **6 months** (June 25, 2025 → December 24, 2025):

**Sales Pattern:**

- **Channel distribution:** 60% in-house, 25% takeout, 15% doordash
- **Daily volume (weekdays):** 80-120 total items
- **Weekend volume:** +30% (100-155 items)
- **Peak hours:** 11:30-13:30 lunch, 17:30-20:30 dinner

**Menu item mix:**

- Carne Asada Taco: 35%
- Pollo Adobado Taco: 30%
- Carnitas Burrito: 20%
- Chips & Guac: 15%

---

## Sample Orders (restaurant_id=4)

| order_id | restaurant_id | employee_id | order_status | inventory_deduction_state | sales_channel | subtotal | tax  | total |
| -------- | ------------- | ----------- | ------------ | ------------------------- | ------------- | -------- | ---- | ----- |
| 401      | 4             | 403         | completed    | completed                 | in-house      | 14.25    | 0.86 | 15.11 |
| 402      | 4             | 402         | completed    | completed                 | takeout       | 19.00    | 1.14 | 20.14 |
| 403      | 4             | 403         | completed    | completed                 | doordash      | 15.50    | 0.93 | 16.43 |
| 404      | 4             | 403         | in_progress  | pending                   | in-house      | 9.25     | 0.56 | 9.81  |
| 405      | 4             | 402         | open         | pending                   | in-house      | 0.00     | 0.00 | 0.00  |

---

## Order Items (restaurant_id=4)

| order_item_id | order_id | restaurant_id | menu_item_id | quantity | unit_price | line_total |
| ------------- | -------- | ------------- | ------------ | -------- | ---------- | ---------- |
| 4101          | 401      | 4             | 401          | 2        | 4.75       | 9.50       |
| 4102          | 401      | 4             | 402          | 1        | 4.50       | 4.50       |
| 4103          | 402      | 4             | 403          | 2        | 9.50       | 19.00      |
| 4104          | 403      | 4             | 401          | 1        | 4.75       | 4.75       |
| 4105          | 403      | 4             | 402          | 1        | 4.50       | 4.50       |
| 4106          | 403      | 4             | 404          | 1        | 6.00       | 6.00       |
| 4107          | 404      | 4             | 401          | 1        | 4.75       | 4.75       |
| 4108          | 404      | 4             | 402          | 1        | 4.50       | 4.50       |

---

## Weather Data (restaurant_id=4)

**DO NOT include in SQL script** — Use the backfill script after seeding:

```bash
# Backfill 6 months of weather data for all restaurants
python scripts/backfill_weather.py --start 2025-06-25 --end 2025-12-24
```

The script uses restaurant coordinates (42.5885, -114.4602) and the free Open-Meteo API.

---

## Supplier Preferences (restaurant_id=4)

| supplier_preference_id | restaurant_id | weight_cost | weight_lead_time | weight_spoilage | weight_rating |
| ---------------------- | ------------- | ----------- | ---------------- | --------------- | ------------- |
| 401                    | 4             | 0.40        | 0.30             | 0.15            | 0.15          |

---

## Summary

Pro tier restaurant seed provides:

- ✅ Full restaurant configuration
- ✅ Expanded roles & permissions (Owner/Lead/Line)
- ✅ Complete ingredient catalog (21 ingredients)
- ✅ Suppliers with ingredient mappings
- ✅ 3 batch recipes (including nested: Guacamole → Pico)
- ✅ 4 recipes with mixed ingredient/batch components
- ✅ Menu items linked to recipes
- ✅ Inventory with lot tracking
- ✅ Purchase orders (pending + received)
- ✅ Inventory usage logs
- ✅ 6 months historical sales
- ✅ Sample orders with various statuses
- ✅ Weather data
