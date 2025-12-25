# Restaurant 3 Blueprint — Basic Tier (Twin Falls, ID)

Plan for seeding a minimal basic-tier tenant focused on sales/menu/users/settings. No SQL yet.

## Tenant Profile

- Working restaurant_id: 3 (new)
- Name: Canyon Rim Grill
- Address: 1250 Blue Lakes Blvd N, Twin Falls, ID 83301
- Coordinates: 42.5970, -114.4597
- Timezone: America/Boise (Mountain)
- Sales channels: ["in-house", "takeout", "doordash"]
- Subscription: tier=basic, status=active, expiry_date=+18 months
- Tax rate: 6.00%
- Hours of operation (local): Mon–Thu 11:00-21:00, Fri–Sat 11:00-22:00, Sun 11:00-20:00
- Settings: eod_run_when_closed=true, eod_run_after_close_mins=45, default_ui_layout=auto, has_pos_display=false, has_kitchen_display=true, pos_mode=internal, cash_drawer_enabled=false

## Roles & Users

- Roles (restaurant_id=3)
  - Manager: full permissions (inventory/menu/orders/users/settings)
  - Cashier: order entry, view menu/sales, no settings
- Users (store cleartext for docs; seed hashed values later)
  - Manager: name=Alex Rivera, email=alex.rivera@canyonrim.test, username=canyon_manager, login_code=43021, password=Test!2345, role=Manager
  - Cashier: name=Jamie Lee, email=jamie.lee@canyonrim.test, username=canyon_cashier, login_code=78214, password=Test!2345, role=Cashier

## Menu & Recipes

- Menu items (menu_items):
  1. Canyon Smash Burger — $12.50 — category="Burgers" — active
  2. Hand-Cut Fries — $4.25 — category="Sides" — active
  3. Huckleberry Lemonade — $3.95 — category="Drinks" — active
- Ingredients (ingredients) with units:
  - Ground Beef (lb), Brioche Bun (ea), Cheddar Slice (ea), Pickles (oz), Smash Sauce (oz), Russet Potato (lb), Fry Oil (oz), Lemonade Syrup (oz), Huckleberry Puree (oz), Sparkling Water (oz)
- Recipes (recipes + recipe_ingredients):
  - Smash Burger: beef 0.33 lb, bun 1 ea, cheddar 1 ea, pickles 1 oz, smash sauce 1.5 oz
  - Fries: russet potato 0.40 lb, fry oil 2.5 oz
  - Huckleberry Lemonade: lemonade syrup 2 oz, huckleberry puree 1.5 oz, sparkling water 8 oz
- Menu linkage (menu_item_recipes): each menu item maps to its recipe_id; ingredient_type="ingredient" for all reference_id=ingredient_id
- Ensure every recipe line references an existing ingredient row (no missing ingredients), so all recipes are resolvable as ingredients.

## Inventory (lightweight for basic)

- Inventory rows per ingredient with quantity_on_hand (starter counts), unit matching ingredient, min_stock_level small.
- No batch recipes or lots; keep inventory_lots empty for this tenant.

## Historical Sales

- Populate sales (sales) for the last 6 months rolling: per day aggregates per menu item with sales_channel distribution: 70% in-house, 20% takeout, 10% doordash.
- Include lunch/dinner peaks: weekdays higher 12:00–13:30 and 18:00–20:00 local; weekends +25% volume.

## Orders (optional minimal)

- A few orders (orders/order_items) to validate POS/internal workflows; inventory_deduction_state="completed"; order_status completed; sales_channel aligned with channels above.

## Weather Data

- Insert weather_data for restaurant_id=3 for the same 6-month window using the Twin Falls coordinates via the existing weather helper; include temperature, precipitation_mm/type, humidity, wind_speed/deg, weather_condition; source="archive-api".

## Notes

- No POS provider tokens; pos_provider="none", pos_connected=false, pos_sync flags true but unused.
- Keep ingredient_supplier/suppliers empty for this tenant to stay minimal.
