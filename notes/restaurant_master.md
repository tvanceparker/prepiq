# Restaurant 5 Blueprint — Master Tier (Twin Falls, ID)

Plan for a full-featured master-tier tenant with nested batches, recipes, inventory, suppliers, purchase orders, orders, payments, and weather. No SQL yet.

## Tenant Profile

- Working restaurant_id: 5 (new)
- Name: Perrine Heights Kitchen
- Address: 401 Shoshone St N, Twin Falls, ID 83301
- Coordinates: 42.5637, -114.4609
- Timezone: America/Boise
- Sales channels: ["in-house", "takeout", "doordash"]
- Subscription: tier=master, status=active, expiry_date=+24 months
- Tax rate: 6.00%
- Hours: Mon–Thu 10:00-21:00, Fri–Sat 10:00-23:00, Sun 10:00-20:00
- Settings: eod_run_when_closed=true, eod_run_after_close_mins=60, has_pos_display=true, has_kitchen_display=true, default_ui_layout=auto, pos_mode=internal, cash_drawer_enabled=true; sales_channels stored on restaurant

## Roles & Users

- Roles: Admin (all), Supervisor (orders/inventory/scheduling), Counter (orders only)
- Users (cleartext; hash later)
  - Admin: name=Morgan Tate, email=morgan@perrineheights.test, username=perrine_admin, login_code=92441, password=Test!2345, role=Admin
  - Supervisor: name=Taylor Brooks, email=taylor@perrineheights.test, username=perrine_super, login_code=34728, password=Test!2345, role=Supervisor
  - Counter: name=Evan Cruz, email=evan@perrineheights.test, username=perrine_counter, login_code=66105, password=Test!2345, role=Counter

## Suppliers & Ingredient Suppliers

- Suppliers (supplier):
  - Sawtooth Farms (produce) — contact 208-555-1901, rating 4.8
  - Magic Valley Meats (meat) — contact 208-555-3344, rating 4.7
  - Summit Dairy (dairy) — contact 208-555-2266, rating 4.6
  - Gem State Dry Goods (dry) — contact 208-555-1188, rating 4.5
- IngredientSupplier mappings with cost_per_unit, lead_time_days (1–4), shelf_life_days, spoilage_rate, preferred flag, min_order_quantity, supplier_priority, unit, pack_size, quantity_per_pack_item.
- Add supplier_preferences weights for pricing vs lead time (e.g., price_weight=0.6, lead_time_weight=0.3, quality_weight=0.1).

## Ingredients

- Proteins: Salmon (lb), Chicken Breast (lb), Braised Short Rib (lb)
- Starches/Bases: Risotto Rice (oz), Yukon Potato (lb), Focaccia (oz)
- Sauces/Components: Demi-Glace (oz), Herb Chimichurri (oz), Garlic Confit (oz), Truffle Butter (oz)
- Dairy: Parmesan (oz), Heavy Cream (oz)
- Produce: Asparagus (oz), Arugula (oz), Lemon (ea)

## Batch Recipes (with batch_recipe_ingredients)

- Demi-Glace Base (yield 120 oz, shelf_life_days=10): short rib trim 30 oz, mirepoix 25 oz, red wine 20 oz, stock 45 oz
- Garlic Confit (yield 80 oz, shelf_life_days=14): garlic 40 oz, olive oil 40 oz
- Herb Chimichurri (yield 90 oz, shelf_life_days=5): parsley 30 oz, cilantro 20 oz, garlic confit 8 oz (ingredient_type=batch, reference_id=garlic confit), oil 20 oz, vinegar 12 oz
- Truffle Butter (yield 60 oz, shelf_life_days=7): butter 50 oz, truffle oil 5 oz, salt 5 oz
- For each batch recipe, create a batch output inventory entry (inventory.batch_recipe_id set, ingredient_id null) so it can be consumed as ingredient_type="batch" elsewhere.

## Recipes (recipe_ingredients with mixed ingredient_type)

- Pan-Seared Salmon w/ Risotto: salmon 0.35 lb, risotto rice 5 oz, heavy cream 2 oz, parmesan 1.5 oz, asparagus 3 oz, butter 1 oz, lemon 0.25 ea
- Short Rib Pappardelle: short rib 0.40 lb, demi-glace base 3 oz (type=batch), garlic confit 0.6 oz (type=batch), herb chimichurri 0.8 oz (type=batch), parmesan 1.2 oz, butter 0.5 oz
- Truffle Chicken Sandwich: focaccia 6 oz, chicken breast 0.30 lb, truffle butter 0.8 oz (type=batch), arugula 0.8 oz, garlic confit 0.4 oz (type=batch)
- Garlic Fries Side: yukon potato 0.30 lb, fry oil 2.5 oz, garlic confit 0.3 oz (type=batch), parsley 0.2 oz
- Ensure every recipe line references an existing ingredient or batch recipe record, keeping ingredient_type and reference_id consistent.

## Menu Items & Links

- Menu items: Salmon Risotto $21.00 (Entrees), Short Rib Pappardelle $23.00 (Entrees), Truffle Chicken Sandwich $14.50 (Handhelds), Garlic Fries $6.50 (Sides)
- menu_item_recipes connect menu items to above recipes. menu_item_batch_usage for any menu item that directly consumes a batch (e.g., Garlic Fries -> Garlic Confit if desired) with quantity_used/unit.

## Inventory & Lots

- Inventory rows per ingredient and for batches created (inventory.batch_recipe_id set, ingredient_id null when storing batch outputs).
- Inventory lots with ingredient_supplier_id, delivery_date, spoilage_expected_date, quantity, unit, status (available/used/expired). Include lots representing produced batches (batch_recipe_id set, status=available, ingredient_supplier_id null permitted if needed by schema; otherwise tie to preferred supplier record).
- Track last_audit_timestamp/quantity on inventory for realism.

## Purchase Orders

- Three purchase_orders (pending, in_transit, received) across suppliers with purchase_order_items tied to ingredient_supplier_id and ingredient_id; include unit_price/quantity to compute total_item_price and total_order_price.

## Inventory Usage Logs

- usage_type sale entries for menu items sold; batch_production + batch_output for each batch made; waste/spoilage for expired asparagus; manual_adjustment for audit corrections; reference_type indicates sale/batch/lot.

## Orders, Payments, Sales

- Orders (orders) with status mix: open, in_progress, completed, cancelled; inventory_deduction_state pending/completed; include order_metadata for table/device.
- Order items for each menu item with recipe_snapshot set; order_item_modifiers examples: mod_type=remove target_type=ingredient reference_id=garlic confit to remove, mod_type=add for extra chimichurri.
- Payments: create stripe-terminal-style records tied to orders; sample statuses succeeded/failed.
- Sales (sales) aggregated per menu_item_id over the last 6 months; channel split: 55% in-house, 25% takeout, 20% doordash.

## Weather Data

- Weather_data rows for restaurant_id=5 covering the last 6 months using the coordinates above via the existing weather helper; include temperature, precipitation_mm/type, humidity, wind_speed/deg, weather_condition; source="archive-api".

## POS/Devices

- Keep pos_provider="none" for now; pos_connected=false; pos_sync flags true. Add a couple device entries (devices table) with device_settings JSON for kitchen and counter displays; stripe_terminal_readers placeholder rows (reader serials/location IDs) to exercise cash_drawer/terminal paths.

## Notes

- Ensure ingredient_type/reference_id correctness in recipe_ingredients; fallback_ingredient_id null for now.
- Maintain restaurant_id scoping across all tables; use consistent IDs starting at 5xx for new ingredients/batches to avoid clashing when seeding.
