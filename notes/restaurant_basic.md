# Restaurant 3 Blueprint — Basic Tier (Twin Falls, ID)

Plan for seeding a minimal basic-tier tenant focused on **menu items, historical sales, and analytics insights only**.
Basic tier does NOT include: ingredients, recipes, inventory, batches, suppliers, or purchase orders.

---

## Tenant Profile

| Column                   | Value                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| restaurant_id            | 3                                                                                                                                                                                                                                                                                                                                                   |
| name                     | Canyon Rim Grill                                                                                                                                                                                                                                                                                                                                    |
| phone                    | 208-555-3300                                                                                                                                                                                                                                                                                                                                        |
| email                    | info@canyonrim.test                                                                                                                                                                                                                                                                                                                                 |
| address                  | 1250 Blue Lakes Blvd N                                                                                                                                                                                                                                                                                                                              |
| city                     | Twin Falls                                                                                                                                                                                                                                                                                                                                          |
| state                    | ID                                                                                                                                                                                                                                                                                                                                                  |
| zip_code                 | 83301                                                                                                                                                                                                                                                                                                                                               |
| latitude                 | 42.5970                                                                                                                                                                                                                                                                                                                                             |
| longitude                | -114.4597                                                                                                                                                                                                                                                                                                                                           |
| timezone                 | America/Boise                                                                                                                                                                                                                                                                                                                                       |
| subscription_tier        | basic                                                                                                                                                                                                                                                                                                                                               |
| subscription_status      | active                                                                                                                                                                                                                                                                                                                                              |
| expiry_date              | 2027-06-25                                                                                                                                                                                                                                                                                                                                          |
| tax_rate                 | 6.00                                                                                                                                                                                                                                                                                                                                                |
| forecast_length          | 7                                                                                                                                                                                                                                                                                                                                                   |
| sales_channels           | `["in-house", "takeout", "doordash"]`                                                                                                                                                                                                                                                                                                               |
| hours_of_operation       | `{"monday": {"open": "11:00", "close": "21:00"}, "tuesday": {"open": "11:00", "close": "21:00"}, "wednesday": {"open": "11:00", "close": "21:00"}, "thursday": {"open": "11:00", "close": "21:00"}, "friday": {"open": "11:00", "close": "22:00"}, "saturday": {"open": "11:00", "close": "22:00"}, "sunday": {"open": "11:00", "close": "20:00"}}` |
| eod_run_when_closed      | true                                                                                                                                                                                                                                                                                                                                                |
| eod_run_after_close_mins | 45                                                                                                                                                                                                                                                                                                                                                  |
| has_pos_display          | false                                                                                                                                                                                                                                                                                                                                               |
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

## Permissions (restaurant_id=3)

| permission_id | restaurant_id | name             | description         |
| ------------- | ------------- | ---------------- | ------------------- |
| 301           | 3             | view_menu        | View menu items     |
| 302           | 3             | edit_menu        | Edit menu items     |
| 303           | 3             | view_orders      | View orders         |
| 304           | 3             | create_orders    | Create new orders   |
| 305           | 3             | manage_orders    | Manage order status |
| 306           | 3             | view_sales       | View sales reports  |
| 307           | 3             | view_employees   | View employee list  |
| 308           | 3             | manage_employees | Manage employees    |
| 309           | 3             | view_settings    | View settings       |
| 310           | 3             | edit_settings    | Edit settings       |

---

## Roles (restaurant_id=3)

| role_id | restaurant_id | name    | description                  |
| ------- | ------------- | ------- | ---------------------------- |
| 301     | 3             | Manager | Full access to all features  |
| 302     | 3             | Cashier | Order entry, view menu/sales |

---

## Role Permissions (restaurant_id=3)

| role_id | permission_id | restaurant_id |
| ------- | ------------- | ------------- |
| 301     | 301           | 3             |
| 301     | 302           | 3             |
| 301     | 303           | 3             |
| 301     | 304           | 3             |
| 301     | 305           | 3             |
| 301     | 306           | 3             |
| 301     | 307           | 3             |
| 301     | 308           | 3             |
| 301     | 309           | 3             |
| 301     | 310           | 3             |
| 302     | 301           | 3             |
| 302     | 303           | 3             |
| 302     | 304           | 3             |
| 302     | 305           | 3             |
| 302     | 306           | 3             |

---

## Employees (restaurant_id=3)

| employee_id | restaurant_id | name        | email                      | username       | login_code | password_cleartext | role_id | is_active |
| ----------- | ------------- | ----------- | -------------------------- | -------------- | ---------- | ------------------ | ------- | --------- |
| 301         | 3             | Alex Rivera | alex.rivera@canyonrim.test | canyon_manager | 43021      | Test!2345          | 301     | true      |
| 302         | 3             | Jamie Lee   | jamie.lee@canyonrim.test   | canyon_cashier | 78214      | Test!2345          | 302     | true      |

> **Note:** Generate `password_hash` using bcrypt before inserting. Store NULL for `password_cleartext`.

---

## Menu Items (restaurant_id=3)

Basic tier menu items — no linked recipes, just menu items for tracking sales.

| menu_item_id | restaurant_id | name                 | price | category | is_active |
| ------------ | ------------- | -------------------- | ----- | -------- | --------- |
| 301          | 3             | Canyon Smash Burger  | 12.50 | Burgers  | true      |
| 302          | 3             | Hand-Cut Fries       | 4.25  | Sides    | true      |
| 303          | 3             | Huckleberry Lemonade | 3.95  | Drinks   | true      |
| 304          | 3             | BBQ Bacon Burger     | 14.75 | Burgers  | true      |
| 305          | 3             | Onion Rings          | 5.50  | Sides    | true      |
| 306          | 3             | Chocolate Shake      | 5.95  | Drinks   | true      |

---

## Historical Sales (restaurant_id=3)

Generate sales records for the **last 6 months** (June 25, 2025 → December 24, 2025):

**Sales Pattern:**

- **Channel distribution:** 70% in-house, 20% takeout, 10% doordash
- **Daily volume (weekdays):** 40-60 total items
- **Weekend volume:** +25% (50-75 total items)
- **Peak hours (local):** 12:00-13:30 lunch, 18:00-20:00 dinner

**Menu item mix:**

- Canyon Smash Burger: 30%
- Hand-Cut Fries: 25%
- Huckleberry Lemonade: 15%
- BBQ Bacon Burger: 15%
- Onion Rings: 10%
- Chocolate Shake: 5%

**Insert into `sales` table:**

- `sale_id` (auto)
- `restaurant_id` = 3
- `menu_item_id` (from above)
- `quantity_sold` (1-3 per row typically)
- `sale_timestamp` (distributed across operating hours)
- `sales_channel` ("in-house", "takeout", "doordash")

---

## Sample Orders (restaurant_id=3)

Create 5-10 sample orders with `order_status='completed'`:

| order_id | restaurant_id | employee_id | order_status | inventory_deduction_state | sales_channel | subtotal | tax  | total |
| -------- | ------------- | ----------- | ------------ | ------------------------- | ------------- | -------- | ---- | ----- |
| 301      | 3             | 302         | completed    | skipped                   | in-house      | 16.75    | 1.01 | 17.76 |
| 302      | 3             | 302         | completed    | skipped                   | takeout       | 12.50    | 0.75 | 13.25 |
| 303      | 3             | 301         | completed    | skipped                   | doordash      | 20.70    | 1.24 | 21.94 |
| 304      | 3             | 302         | completed    | skipped                   | in-house      | 25.25    | 1.52 | 26.77 |
| 305      | 3             | 302         | completed    | skipped                   | takeout       | 19.00    | 1.14 | 20.14 |

> **Note:** `inventory_deduction_state='skipped'` because basic tier has no inventory tracking.

---

## Order Items (restaurant_id=3)

| order_item_id | order_id | restaurant_id | menu_item_id | quantity | unit_price | line_total |
| ------------- | -------- | ------------- | ------------ | -------- | ---------- | ---------- |
| 3001          | 301      | 3             | 301          | 1        | 12.50      | 12.50      |
| 3002          | 301      | 3             | 302          | 1        | 4.25       | 4.25       |
| 3003          | 302      | 3             | 301          | 1        | 12.50      | 12.50      |
| 3004          | 303      | 3             | 304          | 1        | 14.75      | 14.75      |
| 3005          | 303      | 3             | 303          | 1        | 3.95       | 3.95       |
| 3006          | 303      | 3             | 305          | 1        | 2.00       | 2.00       |
| 3007          | 304      | 3             | 301          | 2        | 12.50      | 25.00      |
| 3008          | 304      | 3             | 302          | 1        | 4.25       | 4.25       |
| 3009          | 305      | 3             | 304          | 1        | 14.75      | 14.75      |
| 3010          | 305      | 3             | 302          | 1        | 4.25       | 4.25       |

---

## Weather Data (restaurant_id=3)

**DO NOT include in SQL script** — Use the backfill script after seeding:

```bash
# Backfill 6 months of weather data for all restaurants
python scripts/backfill_weather.py --start 2025-06-25 --end 2025-12-24
```

The script uses:

- Restaurant coordinates (42.5970, -114.4597)
- Open-Meteo free archive API (no API key needed)
- Upserts into `weather_data` table with source="open-meteo"

---

## NOT Included for Basic Tier

The following tables remain **empty** for restaurant_id=3:

- `ingredients` — No ingredient tracking
- `recipes` — No recipe management
- `recipe_ingredients` — No recipe components
- `batch_recipes` — No batch prep
- `batch_recipe_ingredients` — No batch components
- `inventory` — No inventory tracking
- `inventory_lots` — No lot tracking
- `suppliers` — No supplier management
- `ingredient_supplier` — No supplier mappings
- `supplier_preferences` — No supplier preferences
- `purchase_orders` — No PO management
- `purchase_order_items` — No PO items
- `inventory_usage_log` — No usage tracking
- `menu_item_recipes` — Menu items not linked to recipes
- `menu_item_batch_usage` — No batch usage tracking

---

## Summary

Basic tier restaurant seed provides:

- ✅ Restaurant configuration
- ✅ Roles & permissions
- ✅ Employees with login credentials
- ✅ Menu items (unlinked to recipes)
- ✅ 6 months historical sales data
- ✅ Sample orders
- ✅ Weather data for forecasting context

This enables basic tier features:

- Sales analytics and trends
- Revenue reporting by channel
- Menu item performance tracking
- Weather correlation insights
