# Restaurant 5 Blueprint — Master Tier (Twin Falls, ID)

Full-featured master-tier tenant with nested batches, complex recipes, inventory, suppliers, purchase orders, orders, payments, devices, and weather.

---

## Tenant Profile

| Column                   | Value                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| restaurant_id            | 5                                                                                                                                                                                                                                                                                                                                                   |
| name                     | Perrine Heights Kitchen                                                                                                                                                                                                                                                                                                                             |
| phone                    | 208-555-5500                                                                                                                                                                                                                                                                                                                                        |
| email                    | info@perrineheights.test                                                                                                                                                                                                                                                                                                                            |
| address                  | 401 Shoshone St N                                                                                                                                                                                                                                                                                                                                   |
| city                     | Twin Falls                                                                                                                                                                                                                                                                                                                                          |
| state                    | ID                                                                                                                                                                                                                                                                                                                                                  |
| zip_code                 | 83301                                                                                                                                                                                                                                                                                                                                               |
| latitude                 | 42.5637                                                                                                                                                                                                                                                                                                                                             |
| longitude                | -114.4609                                                                                                                                                                                                                                                                                                                                           |
| timezone                 | America/Boise                                                                                                                                                                                                                                                                                                                                       |
| subscription_tier        | master                                                                                                                                                                                                                                                                                                                                              |
| subscription_status      | active                                                                                                                                                                                                                                                                                                                                              |
| expiry_date              | 2027-12-25                                                                                                                                                                                                                                                                                                                                          |
| tax_rate                 | 6.00                                                                                                                                                                                                                                                                                                                                                |
| forecast_length          | 21                                                                                                                                                                                                                                                                                                                                                  |
| sales_channels           | `["in-house", "takeout", "doordash"]`                                                                                                                                                                                                                                                                                                               |
| hours_of_operation       | `{"monday": {"open": "10:00", "close": "21:00"}, "tuesday": {"open": "10:00", "close": "21:00"}, "wednesday": {"open": "10:00", "close": "21:00"}, "thursday": {"open": "10:00", "close": "21:00"}, "friday": {"open": "10:00", "close": "23:00"}, "saturday": {"open": "10:00", "close": "23:00"}, "sunday": {"open": "10:00", "close": "20:00"}}` |
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
| cash_drawer_enabled      | true                                                                                                                                                                                                                                                                                                                                                |
| settings                 | `{}`                                                                                                                                                                                                                                                                                                                                                |

---

## Permissions (restaurant_id=5)

| permission_id | restaurant_id | name                   | description            |
| ------------- | ------------- | ---------------------- | ---------------------- |
| 501           | 5             | view_menu              | View menu items        |
| 502           | 5             | edit_menu              | Edit menu items        |
| 503           | 5             | view_orders            | View orders            |
| 504           | 5             | create_orders          | Create new orders      |
| 505           | 5             | manage_orders          | Manage order status    |
| 506           | 5             | view_inventory         | View inventory levels  |
| 507           | 5             | edit_inventory         | Edit inventory         |
| 508           | 5             | view_sales             | View sales reports     |
| 509           | 5             | view_employees         | View employee list     |
| 510           | 5             | manage_employees       | Manage employees       |
| 511           | 5             | view_settings          | View settings          |
| 512           | 5             | edit_settings          | Edit settings          |
| 513           | 5             | manage_suppliers       | Manage suppliers       |
| 514           | 5             | manage_purchase_orders | Manage purchase orders |
| 515           | 5             | view_prep              | View prep schedules    |
| 516           | 5             | manage_prep            | Manage prep schedules  |
| 517           | 5             | view_analytics         | View analytics         |
| 518           | 5             | manage_devices         | Manage devices         |
| 519           | 5             | process_payments       | Process payments       |
| 520           | 5             | manage_cash_drawer     | Manage cash drawer     |

---

## Roles (restaurant_id=5)

| role_id | restaurant_id | name       | description                              |
| ------- | ------------- | ---------- | ---------------------------------------- |
| 501     | 5             | Admin      | Full access to all features              |
| 502     | 5             | Supervisor | Orders, inventory, scheduling, analytics |
| 503     | 5             | Counter    | Order entry, payments                    |

---

## Role Permissions (restaurant_id=5)

**Admin (role_id=501):** all permissions (501-520)

**Supervisor (role_id=502):** 501, 503, 504, 505, 506, 507, 508, 513, 514, 515, 516, 517, 519

**Counter (role_id=503):** 501, 503, 504, 505, 508, 519

---

## Employees (restaurant_id=5)

| employee_id | restaurant_id | name              | email                       | username         | login_code | password_cleartext | role_id | is_active |
| ----------- | ------------- | ----------------- | --------------------------- | ---------------- | ---------- | ------------------ | ------- | --------- |
| 501         | 5             | Victoria Ashworth | victoria@perrineheights.com | victoria_perrine | 3001       | Test!2345          | 501     | true      |
| 502         | 5             | James Mitchell    | james@perrineheights.com    | james_perrine    | 3002       | Test!2345          | 502     | true      |
| 503         | 5             | Maria Gonzalez    | maria@perrineheights.com    | maria_perrine    | 3003       | Test!2345          | 503     | true      |
| 504         | 5             | David Kim         | david@perrineheights.com    | david_perrine    | 3004       | Test!2345          | 503     | true      |
| 505         | 5             | Sarah Chen        | sarah@perrineheights.com    | sarah_perrine    | 3005       | Test!2345          | 503     | true      |

> **Note:** Generate `password_hash` using bcrypt before inserting.

---

## Suppliers (restaurant_id=5)

| supplier_id | restaurant_id | name                | type    | contact_phone | contact_email             | region | rating | is_active |
| ----------- | ------------- | ------------------- | ------- | ------------- | ------------------------- | ------ | ------ | --------- |
| 501         | 5             | Sawtooth Farms      | produce | 208-555-1901  | orders@sawtoothfarms.test | ID     | 4.8    | true      |
| 502         | 5             | Magic Valley Meats  | meat    | 208-555-3344  | orders@mvmeats.test       | ID     | 4.7    | true      |
| 503         | 5             | Summit Dairy        | dairy   | 208-555-2266  | orders@summitdairy.test   | ID     | 4.6    | true      |
| 504         | 5             | Gem State Dry Goods | dry     | 208-555-1188  | orders@gemdry.test        | ID     | 4.5    | true      |

---

## Ingredients (restaurant_id=5)

**COMPLETE LIST — All 30 ingredients must exist before being referenced**

| ingredient_id | restaurant_id | name              | unit | category | is_active |
| ------------- | ------------- | ----------------- | ---- | -------- | --------- |
| 501           | 5             | Salmon Fillet     | lb   | Protein  | true      |
| 502           | 5             | Chicken Breast    | lb   | Protein  | true      |
| 503           | 5             | Short Rib         | lb   | Protein  | true      |
| 504           | 5             | Short Rib Trim    | lb   | Protein  | true      |
| 505           | 5             | Risotto Rice      | oz   | Starch   | true      |
| 506           | 5             | Yukon Potato      | lb   | Produce  | true      |
| 507           | 5             | Focaccia Bread    | oz   | Bread    | true      |
| 508           | 5             | Parmesan          | oz   | Dairy    | true      |
| 509           | 5             | Heavy Cream       | oz   | Dairy    | true      |
| 510           | 5             | Butter            | oz   | Dairy    | true      |
| 511           | 5             | Asparagus         | oz   | Produce  | true      |
| 512           | 5             | Arugula           | oz   | Produce  | true      |
| 513           | 5             | Lemon             | ea   | Produce  | true      |
| 514           | 5             | Garlic            | oz   | Produce  | true      |
| 515           | 5             | Olive Oil         | oz   | Oil      | true      |
| 516           | 5             | Fry Oil           | oz   | Oil      | true      |
| 517           | 5             | Truffle Oil       | oz   | Oil      | true      |
| 518           | 5             | Parsley           | oz   | Produce  | true      |
| 519           | 5             | Cilantro          | oz   | Produce  | true      |
| 520           | 5             | Red Wine          | oz   | Pantry   | true      |
| 521           | 5             | Beef Stock        | oz   | Pantry   | true      |
| 522           | 5             | Mirepoix          | oz   | Produce  | true      |
| 523           | 5             | Red Wine Vinegar  | oz   | Pantry   | true      |
| 524           | 5             | Salt              | oz   | Dry      | true      |
| 525           | 5             | Black Pepper      | oz   | Dry      | true      |
| 526           | 5             | Pappardelle Pasta | oz   | Starch   | true      |
| 527           | 5             | Shallot           | oz   | Produce  | true      |
| 528           | 5             | Thyme             | oz   | Produce  | true      |
| 529           | 5             | Rosemary          | oz   | Produce  | true      |
| 530           | 5             | White Wine        | oz   | Pantry   | true      |

---

## Ingredient Supplier Mappings (restaurant_id=5)

| ingredient_supplier_id | restaurant_id | ingredient_id | supplier_id | cost_per_unit | lead_time_days | shelf_life_days | spoilage_rate | preferred | min_order_quantity | unit | pack_size | quantity_per_pack_item | supplier_priority | is_active |
| ---------------------- | ------------- | ------------- | ----------- | ------------- | -------------- | --------------- | ------------- | --------- | ------------------ | ---- | --------- | ---------------------- | ----------------- | --------- |
| 501                    | 5             | 501           | 502         | 14.50         | 1              | 3               | 0.12          | true      | 5                  | lb   | 5         | 1                      | 1                 | true      |
| 502                    | 5             | 502           | 502         | 5.25          | 1              | 4               | 0.10          | true      | 10                 | lb   | 10        | 1                      | 1                 | true      |
| 503                    | 5             | 503           | 502         | 12.00         | 2              | 5               | 0.08          | true      | 10                 | lb   | 10        | 1                      | 1                 | true      |
| 504                    | 5             | 504           | 502         | 4.50          | 2              | 4               | 0.10          | true      | 5                  | lb   | 5         | 1                      | 1                 | true      |
| 505                    | 5             | 505           | 504         | 0.15          | 3              | 365             | 0.00          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 506                    | 5             | 506           | 501         | 1.25          | 2              | 21              | 0.05          | true      | 20                 | lb   | 20        | 1                      | 1                 | true      |
| 507                    | 5             | 507           | 504         | 0.12          | 2              | 5               | 0.08          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 508                    | 5             | 508           | 503         | 0.45          | 2              | 60              | 0.02          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 509                    | 5             | 509           | 503         | 0.08          | 2              | 14              | 0.08          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 510                    | 5             | 510           | 503         | 0.12          | 2              | 30              | 0.03          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 511                    | 5             | 511           | 501         | 0.20          | 1              | 5               | 0.15          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 512                    | 5             | 512           | 501         | 0.18          | 1              | 4               | 0.18          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 513                    | 5             | 513           | 501         | 0.25          | 2              | 21              | 0.05          | true      | 24                 | ea   | 24        | 1                      | 1                 | true      |
| 514                    | 5             | 514           | 501         | 0.10          | 2              | 30              | 0.03          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 515                    | 5             | 515           | 504         | 0.08          | 3              | 365             | 0.00          | true      | 128                | oz   | 128       | 1                      | 1                 | true      |
| 516                    | 5             | 516           | 504         | 0.04          | 4              | 180             | 0.01          | true      | 128                | oz   | 128       | 1                      | 1                 | true      |
| 517                    | 5             | 517           | 504         | 1.50          | 3              | 180             | 0.01          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 518                    | 5             | 518           | 501         | 0.15          | 1              | 5               | 0.15          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 519                    | 5             | 519           | 501         | 0.15          | 1              | 5               | 0.15          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 520                    | 5             | 520           | 504         | 0.10          | 3              | 365             | 0.00          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 521                    | 5             | 521           | 504         | 0.06          | 3              | 30              | 0.02          | true      | 128                | oz   | 128       | 1                      | 1                 | true      |
| 522                    | 5             | 522           | 501         | 0.08          | 2              | 7               | 0.10          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 523                    | 5             | 523           | 504         | 0.05          | 3              | 365             | 0.00          | true      | 32                 | oz   | 32        | 1                      | 1                 | true      |
| 524                    | 5             | 524           | 504         | 0.02          | 4              | 365             | 0.00          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 525                    | 5             | 525           | 504         | 0.08          | 4              | 365             | 0.00          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 526                    | 5             | 526           | 504         | 0.12          | 3              | 90              | 0.02          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |
| 527                    | 5             | 527           | 501         | 0.12          | 2              | 14              | 0.08          | true      | 16                 | oz   | 16        | 1                      | 1                 | true      |
| 528                    | 5             | 528           | 501         | 0.20          | 1              | 7               | 0.12          | true      | 8                  | oz   | 8         | 1                      | 1                 | true      |
| 529                    | 5             | 529           | 501         | 0.22          | 1              | 10              | 0.10          | true      | 8                  | oz   | 8         | 1                      | 1                 | true      |
| 530                    | 5             | 530           | 504         | 0.08          | 3              | 365             | 0.00          | true      | 64                 | oz   | 64        | 1                      | 1                 | true      |

---

## Batch Recipes (restaurant_id=5)

| batch_recipe_id | restaurant_id | name             | description                         | yield_quantity | yield_unit | shelf_life_days | estimated_prep_time_minutes |
| --------------- | ------------- | ---------------- | ----------------------------------- | -------------- | ---------- | --------------- | --------------------------- |
| 501             | 5             | Garlic Confit    | Slow-roasted garlic in olive oil    | 80             | oz         | 14              | 90                          |
| 502             | 5             | Demi-Glace       | Rich beef reduction sauce           | 120            | oz         | 10              | 240                         |
| 503             | 5             | Herb Chimichurri | Fresh herb sauce with garlic confit | 90             | oz         | 5               | 20                          |
| 504             | 5             | Truffle Butter   | Compound butter with truffle oil    | 60             | oz         | 7               | 15                          |

---

## Batch Recipe Ingredients (restaurant_id=5)

**Demonstrates nested batch support: Herb Chimichurri uses Garlic Confit as ingredient_type='batch'**

| batch_recipe_ingredient_id | batch_recipe_id | restaurant_id | reference_id | ingredient_type | quantity_used | unit |
| -------------------------- | --------------- | ------------- | ------------ | --------------- | ------------- | ---- |
| 5001                       | 501             | 5             | 514          | ingredient      | 40            | oz   |
| 5002                       | 501             | 5             | 515          | ingredient      | 40            | oz   |
| 5003                       | 502             | 5             | 504          | ingredient      | 30            | oz   |
| 5004                       | 502             | 5             | 522          | ingredient      | 25            | oz   |
| 5005                       | 502             | 5             | 520          | ingredient      | 20            | oz   |
| 5006                       | 502             | 5             | 521          | ingredient      | 45            | oz   |
| 5007                       | 503             | 5             | 518          | ingredient      | 30            | oz   |
| 5008                       | 503             | 5             | 519          | ingredient      | 20            | oz   |
| 5009                       | 503             | 5             | 501          | batch           | 8             | oz   |
| 5010                       | 503             | 5             | 515          | ingredient      | 20            | oz   |
| 5011                       | 503             | 5             | 523          | ingredient      | 12            | oz   |
| 5012                       | 504             | 5             | 510          | ingredient      | 50            | oz   |
| 5013                       | 504             | 5             | 517          | ingredient      | 5             | oz   |
| 5014                       | 504             | 5             | 524          | ingredient      | 5             | oz   |

> **Note:** Row 5009 shows nested batch: Herb Chimichurri (503) uses Garlic Confit (501) with `ingredient_type='batch'`

---

## Recipes (restaurant_id=5)

| recipe_id | restaurant_id | name                      | description                                        |
| --------- | ------------- | ------------------------- | -------------------------------------------------- |
| 501       | 5             | Pan-Seared Salmon Risotto | Salmon with creamy parmesan risotto and asparagus  |
| 502       | 5             | Short Rib Pappardelle     | Braised short rib with demi-glace over pappardelle |
| 503       | 5             | Truffle Chicken Sandwich  | Chicken breast with truffle butter on focaccia     |
| 504       | 5             | Garlic Fries              | Hand-cut fries with garlic confit and herbs        |

---

## Recipe Ingredients (restaurant_id=5)

| recipe_ingredient_id | recipe_id | restaurant_id | reference_id | ingredient_type | quantity_used | unit |
| -------------------- | --------- | ------------- | ------------ | --------------- | ------------- | ---- |
| 5101                 | 501       | 5             | 501          | ingredient      | 0.35          | lb   |
| 5102                 | 501       | 5             | 505          | ingredient      | 5             | oz   |
| 5103                 | 501       | 5             | 509          | ingredient      | 2             | oz   |
| 5104                 | 501       | 5             | 508          | ingredient      | 1.5           | oz   |
| 5105                 | 501       | 5             | 511          | ingredient      | 3             | oz   |
| 5106                 | 501       | 5             | 510          | ingredient      | 1             | oz   |
| 5107                 | 501       | 5             | 513          | ingredient      | 0.25          | ea   |
| 5108                 | 501       | 5             | 530          | ingredient      | 2             | oz   |
| 5109                 | 501       | 5             | 527          | ingredient      | 0.5           | oz   |
| 5110                 | 502       | 5             | 503          | ingredient      | 0.40          | lb   |
| 5111                 | 502       | 5             | 502          | batch           | 3             | oz   |
| 5112                 | 502       | 5             | 501          | batch           | 0.6           | oz   |
| 5113                 | 502       | 5             | 503          | batch           | 0.8           | oz   |
| 5114                 | 502       | 5             | 508          | ingredient      | 1.2           | oz   |
| 5115                 | 502       | 5             | 510          | ingredient      | 0.5           | oz   |
| 5116                 | 502       | 5             | 526          | ingredient      | 4             | oz   |
| 5117                 | 503       | 5             | 507          | ingredient      | 6             | oz   |
| 5118                 | 503       | 5             | 502          | ingredient      | 0.30          | lb   |
| 5119                 | 503       | 5             | 504          | batch           | 0.8           | oz   |
| 5120                 | 503       | 5             | 512          | ingredient      | 0.8           | oz   |
| 5121                 | 503       | 5             | 501          | batch           | 0.4           | oz   |
| 5122                 | 504       | 5             | 506          | ingredient      | 0.30          | lb   |
| 5123                 | 504       | 5             | 516          | ingredient      | 2.5           | oz   |
| 5124                 | 504       | 5             | 501          | batch           | 0.3           | oz   |
| 5125                 | 504       | 5             | 518          | ingredient      | 0.2           | oz   |
| 5126                 | 504       | 5             | 524          | ingredient      | 0.1           | oz   |

---

## Menu Items (restaurant_id=5)

| menu_item_id | restaurant_id | name                     | price | category  | is_active |
| ------------ | ------------- | ------------------------ | ----- | --------- | --------- |
| 501          | 5             | Salmon Risotto           | 21.00 | Entrees   | true      |
| 502          | 5             | Short Rib Pappardelle    | 23.00 | Entrees   | true      |
| 503          | 5             | Truffle Chicken Sandwich | 14.50 | Handhelds | true      |
| 504          | 5             | Garlic Fries             | 6.50  | Sides     | true      |

---

## Menu Item Recipes (restaurant_id=5)

| menu_item_id | recipe_id |
| ------------ | --------- |
| 501          | 501       |
| 502          | 502       |
| 503          | 503       |
| 504          | 504       |

---

## Menu Item Batch Usage (restaurant_id=5)

Direct batch consumption (optional supplement to recipe-based deduction):

| menu_item_id | batch_recipe_id | quantity_used | unit |
| ------------ | --------------- | ------------- | ---- |
| 504          | 501             | 0.3           | oz   |

---

## Inventory (restaurant_id=5)

**Raw ingredients + batch outputs (batch_recipe_id set for produced batches)**

| inventory_id | restaurant_id | ingredient_id | batch_recipe_id | quantity_on_hand | min_stock_level | max_stock_level | unit |
| ------------ | ------------- | ------------- | --------------- | ---------------- | --------------- | --------------- | ---- |
| 501          | 5             | 501           | (null)          | 8.0              | 4.0             | 20.0            | lb   |
| 502          | 5             | 502           | (null)          | 15.0             | 8.0             | 30.0            | lb   |
| 503          | 5             | 503           | (null)          | 12.0             | 6.0             | 25.0            | lb   |
| 504          | 5             | 504           | (null)          | 5.0              | 3.0             | 10.0            | lb   |
| 505          | 5             | 505           | (null)          | 128              | 64              | 256             | oz   |
| 506          | 5             | 506           | (null)          | 30.0             | 15.0            | 50.0            | lb   |
| 507          | 5             | 507           | (null)          | 96               | 48              | 192             | oz   |
| 508          | 5             | 508           | (null)          | 48               | 24              | 96              | oz   |
| 509          | 5             | 509           | (null)          | 96               | 48              | 192             | oz   |
| 510          | 5             | 510           | (null)          | 64               | 32              | 128             | oz   |
| 511          | 5             | 511           | (null)          | 48               | 24              | 96              | oz   |
| 512          | 5             | 512           | (null)          | 24               | 12              | 48              | oz   |
| 513          | 5             | 513           | (null)          | 36               | 18              | 72              | ea   |
| 514          | 5             | 514           | (null)          | 48               | 24              | 96              | oz   |
| 515          | 5             | 515           | (null)          | 192              | 96              | 384             | oz   |
| 516          | 5             | 516           | (null)          | 256              | 128             | 512             | oz   |
| 517          | 5             | 517           | (null)          | 24               | 12              | 48              | oz   |
| 518          | 5             | 518           | (null)          | 24               | 12              | 48              | oz   |
| 519          | 5             | 519           | (null)          | 24               | 12              | 48              | oz   |
| 520          | 5             | 520           | (null)          | 96               | 48              | 192             | oz   |
| 521          | 5             | 521           | (null)          | 192              | 96              | 384             | oz   |
| 522          | 5             | 522           | (null)          | 96               | 48              | 192             | oz   |
| 523          | 5             | 523           | (null)          | 48               | 24              | 96              | oz   |
| 524          | 5             | 524           | (null)          | 64               | 32              | 128             | oz   |
| 525          | 5             | 525           | (null)          | 24               | 12              | 48              | oz   |
| 526          | 5             | 526           | (null)          | 96               | 48              | 192             | oz   |
| 527          | 5             | 527           | (null)          | 24               | 12              | 48              | oz   |
| 528          | 5             | 528           | (null)          | 12               | 6               | 24              | oz   |
| 529          | 5             | 529           | (null)          | 12               | 6               | 24              | oz   |
| 530          | 5             | 530           | (null)          | 96               | 48              | 192             | oz   |
| 531          | 5             | (null)        | 501             | 40               | 20              | 80              | oz   |
| 532          | 5             | (null)        | 502             | 60               | 30              | 120             | oz   |
| 533          | 5             | (null)        | 503             | 45               | 22              | 90              | oz   |
| 534          | 5             | (null)        | 504             | 30               | 15              | 60              | oz   |

---

## Inventory Lots (restaurant_id=5)

| lot_id | inventory_id | restaurant_id | ingredient_supplier_id | delivery_date | spoilage_expected_date | quantity | total_received | unit | ingredient_id | batch_recipe_id | status    |
| ------ | ------------ | ------------- | ---------------------- | ------------- | ---------------------- | -------- | -------------- | ---- | ------------- | --------------- | --------- |
| 501    | 501          | 5             | 501                    | 2025-12-23    | 2025-12-26             | 4.0      | 4.0            | lb   | 501           | (null)          | available |
| 502    | 503          | 5             | 503                    | 2025-12-21    | 2025-12-26             | 6.0      | 6.0            | lb   | 503           | (null)          | available |
| 503    | 511          | 5             | 511                    | 2025-12-24    | 2025-12-29             | 24.0     | 24.0           | oz   | 511           | (null)          | available |
| 504    | 512          | 5             | 512                    | 2025-12-24    | 2025-12-28             | 12.0     | 12.0           | oz   | 512           | (null)          | available |
| 505    | 531          | 5             | (null)                 | 2025-12-24    | 2026-01-07             | 20.0     | 20.0           | oz   | (null)        | 501             | available |
| 506    | 532          | 5             | (null)                 | 2025-12-23    | 2026-01-02             | 30.0     | 30.0           | oz   | (null)        | 502             | available |
| 507    | 533          | 5             | (null)                 | 2025-12-24    | 2025-12-29             | 22.0     | 22.0           | oz   | (null)        | 503             | available |
| 508    | 534          | 5             | (null)                 | 2025-12-23    | 2025-12-30             | 15.0     | 15.0           | oz   | (null)        | 504             | available |

> **Note:** Lots 505-508 are batch-produced (ingredient_supplier_id=NULL, batch_recipe_id set)

---

## Purchase Orders (restaurant_id=5)

| purchase_order_id | restaurant_id | supplier_id | order_date | expected_delivery_date | status     | total_order_price |
| ----------------- | ------------- | ----------- | ---------- | ---------------------- | ---------- | ----------------- |
| 501               | 5             | 501         | 2025-12-20 | 2025-12-22             | received   | 52.80             |
| 502               | 5             | 502         | 2025-12-21 | 2025-12-23             | received   | 189.50            |
| 503               | 5             | 503         | 2025-12-22 | 2025-12-24             | in_transit | 28.80             |
| 504               | 5             | 504         | 2025-12-23 | 2025-12-27             | pending    | 45.60             |

---

## Purchase Order Items (restaurant_id=5)

| purchase_order_item_id | purchase_order_id | restaurant_id | ingredient_supplier_id | ingredient_id | quantity | unit_price | total_item_price |
| ---------------------- | ----------------- | ------------- | ---------------------- | ------------- | -------- | ---------- | ---------------- |
| 5001                   | 501               | 5             | 511                    | 511           | 64       | 0.20       | 12.80            |
| 5002                   | 501               | 5             | 512                    | 512           | 32       | 0.18       | 5.76             |
| 5003                   | 501               | 5             | 522                    | 522           | 128      | 0.08       | 10.24            |
| 5004                   | 501               | 5             | 513                    | 513           | 48       | 0.25       | 12.00            |
| 5005                   | 501               | 5             | 518                    | 518           | 32       | 0.15       | 4.80             |
| 5006                   | 501               | 5             | 519                    | 519           | 48       | 0.15       | 7.20             |
| 5007                   | 502               | 5             | 501                    | 501           | 5        | 14.50      | 72.50            |
| 5008                   | 502               | 5             | 503                    | 503           | 5        | 12.00      | 60.00            |
| 5009                   | 502               | 5             | 504                    | 504           | 3        | 4.50       | 13.50            |
| 5010                   | 502               | 5             | 502                    | 502           | 8        | 5.25       | 42.00            |
| 5011                   | 503               | 5             | 509                    | 509           | 128      | 0.08       | 10.24            |
| 5012                   | 503               | 5             | 510                    | 510           | 64       | 0.12       | 7.68             |
| 5013                   | 503               | 5             | 508                    | 508           | 32       | 0.45       | 14.40            |
| 5014                   | 504               | 5             | 505                    | 505           | 128      | 0.15       | 19.20            |
| 5015                   | 504               | 5             | 526                    | 526           | 128      | 0.12       | 15.36            |
| 5016                   | 504               | 5             | 520                    | 520           | 64       | 0.10       | 6.40             |

---

## Inventory Usage Logs (restaurant_id=5)

| usage_log_id | restaurant_id | inventory_id | lot_id | usage_type        | reference_type | reference_id | quantity_used | unit | timestamp           |
| ------------ | ------------- | ------------ | ------ | ----------------- | -------------- | ------------ | ------------- | ---- | ------------------- |
| 5001         | 5             | 531          | 505    | sale              | order          | 501          | 0.6           | oz   | 2025-12-24 12:30:00 |
| 5002         | 5             | 532          | 506    | sale              | order          | 501          | 3.0           | oz   | 2025-12-24 12:30:00 |
| 5003         | 5             | 533          | 507    | sale              | order          | 501          | 0.8           | oz   | 2025-12-24 12:30:00 |
| 5004         | 5             | 514          | (null) | batch_production  | batch          | 501          | 40.0          | oz   | 2025-12-24 08:00:00 |
| 5005         | 5             | 515          | (null) | batch_production  | batch          | 501          | 40.0          | oz   | 2025-12-24 08:00:00 |
| 5006         | 5             | 531          | (null) | batch_output      | batch          | 501          | 80.0          | oz   | 2025-12-24 09:30:00 |
| 5007         | 5             | 511          | 503    | waste             | lot            | 503          | 3.0           | oz   | 2025-12-23 21:00:00 |
| 5008         | 5             | 501          | 501    | manual_adjustment | inventory      | 501          | -0.5          | lb   | 2025-12-23 14:00:00 |

---

## Historical Sales (restaurant_id=5)

Generate sales records for **6 months** (June 25, 2025 → December 24, 2025):

**Sales Pattern:**

- **Channel distribution:** 55% in-house, 25% takeout, 20% doordash
- **Daily volume (weekdays):** 60-90 total items
- **Weekend volume:** +35% (80-120 items)
- **Peak hours:** 11:30-13:30 lunch, 18:00-21:00 dinner

**Menu item mix:**

- Salmon Risotto: 30%
- Short Rib Pappardelle: 25%
- Truffle Chicken Sandwich: 30%
- Garlic Fries: 15%

---

## Sample Orders (restaurant_id=5)

| order_id | restaurant_id | employee_id | order_status | inventory_deduction_state | sales_channel | subtotal | tax  | total | order_metadata    |
| -------- | ------------- | ----------- | ------------ | ------------------------- | ------------- | -------- | ---- | ----- | ----------------- |
| 501      | 5             | 503         | completed    | completed                 | in-house      | 44.00    | 2.64 | 46.64 | `{"table": "12"}` |
| 502      | 5             | 503         | completed    | completed                 | takeout       | 35.50    | 2.13 | 37.63 | `{}`              |
| 503      | 5             | 502         | completed    | completed                 | doordash      | 27.50    | 1.65 | 29.15 | `{}`              |
| 504      | 5             | 503         | in_progress  | pending                   | in-house      | 21.00    | 1.26 | 22.26 | `{"table": "8"}`  |
| 505      | 5             | 503         | open         | pending                   | in-house      | 0.00     | 0.00 | 0.00  | `{"table": "3"}`  |
| 506      | 5             | 502         | cancelled    | skipped                   | in-house      | 23.00    | 1.38 | 24.38 | `{}`              |

---

## Order Items (restaurant_id=5)

| order_item_id | order_id | restaurant_id | menu_item_id | quantity | unit_price | line_total |
| ------------- | -------- | ------------- | ------------ | -------- | ---------- | ---------- |
| 5101          | 501      | 5             | 501          | 1        | 21.00      | 21.00      |
| 5102          | 501      | 5             | 502          | 1        | 23.00      | 23.00      |
| 5103          | 502      | 5             | 503          | 2        | 14.50      | 29.00      |
| 5104          | 502      | 5             | 504          | 1        | 6.50       | 6.50       |
| 5105          | 503      | 5             | 501          | 1        | 21.00      | 21.00      |
| 5106          | 503      | 5             | 504          | 1        | 6.50       | 6.50       |
| 5107          | 504      | 5             | 501          | 1        | 21.00      | 21.00      |
| 5108          | 506      | 5             | 502          | 1        | 23.00      | 23.00      |

---

## Order Item Modifiers (restaurant_id=5)

| order_item_modifier_id | order_item_id | restaurant_id | mod_type | target_type | reference_id | quantity | price_adjustment |
| ---------------------- | ------------- | ------------- | -------- | ----------- | ------------ | -------- | ---------------- |
| 5001                   | 5102          | 5             | remove   | batch       | 503          | 1        | 0.00             |
| 5002                   | 5103          | 5             | add      | batch       | 501          | 1        | 1.50             |

> **Note:** Modifier 5001 removes Herb Chimichurri; 5002 adds extra Garlic Confit

---

## Payments (restaurant_id=5)

| payment_id | restaurant_id | order_id | amount | payment_method | status    | processed_at        |
| ---------- | ------------- | -------- | ------ | -------------- | --------- | ------------------- |
| 501        | 5             | 501      | 46.64  | card           | succeeded | 2025-12-24 13:15:00 |
| 502        | 5             | 502      | 37.63  | card           | succeeded | 2025-12-24 12:45:00 |
| 503        | 5             | 503      | 29.15  | card           | succeeded | 2025-12-24 19:30:00 |
| 504        | 5             | 506      | 24.38  | card           | refunded  | 2025-12-24 18:00:00 |

---

## Devices (restaurant_id=5)

| device_id | restaurant_id | device_name       | device_type     | is_active | device_settings                                      |
| --------- | ------------- | ----------------- | --------------- | --------- | ---------------------------------------------------- |
| 501       | 5             | Kitchen Display 1 | kitchen_display | true      | `{"screen_timeout": 300, "order_alert_sound": true}` |
| 502       | 5             | Counter POS       | pos_terminal    | true      | `{"receipt_printer": true, "cash_drawer": true}`     |
| 503       | 5             | Manager Tablet    | management      | true      | `{}`                                                 |

---

## Stripe Terminal Readers (restaurant_id=5)

| reader_id | restaurant_id | serial_number    | location_id         | label          | status |
| --------- | ------------- | ---------------- | ------------------- | -------------- | ------ |
| 501       | 5             | STRP-001-PERRINE | loc_perrine_counter | Counter Reader | online |

---

## Supplier Preferences (restaurant_id=5)

| supplier_preference_id | restaurant_id | weight_cost | weight_lead_time | weight_spoilage | weight_rating |
| ---------------------- | ------------- | ----------- | ---------------- | --------------- | ------------- |
| 501                    | 5             | 0.35        | 0.25             | 0.20            | 0.20          |

---

## Weather Data (restaurant_id=5)

**DO NOT include in SQL script** — Use the backfill script after seeding:

```bash
# Backfill 6 months of weather data for all restaurants
python scripts/backfill_weather.py --start 2025-06-25 --end 2025-12-24
```

The script uses restaurant coordinates (42.5637, -114.4609) and the free Open-Meteo API.

---

## Summary

Master tier restaurant seed provides:

- ✅ Full restaurant configuration with all POS/device features
- ✅ Comprehensive roles & permissions (20 permissions)
- ✅ Complete ingredient catalog (30 ingredients)
- ✅ 4 suppliers with full mappings
- ✅ **4 batch recipes with nested batch support** (Chimichurri → Garlic Confit)
- ✅ 4 recipes with complex ingredient/batch components
- ✅ Menu items linked to recipes
- ✅ Full inventory with batch output tracking
- ✅ Inventory lots (including batch-produced with null supplier)
- ✅ Purchase orders (all statuses: pending, in_transit, received)
- ✅ Inventory usage logs (all types: sale, batch_production, batch_output, waste, manual_adjustment)
- ✅ 6 months historical sales
- ✅ Sample orders with modifiers
- ✅ Payments with various statuses
- ✅ Devices and Stripe terminal readers
- ✅ Supplier preferences with correct column names
- ✅ Weather data
