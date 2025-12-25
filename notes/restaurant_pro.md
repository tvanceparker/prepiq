# Restaurant 4 Blueprint — Pro Tier (Twin Falls, ID)

Plan for richer pro-tier tenant with batches, recipes, suppliers, inventory flows, and historical sales. No SQL yet.

## Tenant Profile

- Working restaurant_id: 4 (new)
- Name: Snake River Taqueria
- Address: 210 Falls Ave, Twin Falls, ID 83301
- Coordinates: 42.5885, -114.4602
- Timezone: America/Boise
- Sales channels: ["in-house", "takeout", "doordash"]
- Subscription: tier=pro, status=active, expiry_date=+18 months
- Tax rate: 6.00%
- Hours: Sun–Thu 10:30-21:00, Fri–Sat 10:30-22:00
- Settings: eod_run_when_closed=true, eod_run_after_close_mins=60, default_ui_layout=auto, has_pos_display=true, has_kitchen_display=true, pos_mode=internal, cash_drawer_enabled=false; sales_channels stored on restaurant

## Roles & Users

- Roles: Owner (all), Shift Lead (orders/inventory counts), Line (orders only)
- Users (cleartext for doc; hash later)
  - Owner: name=Rosa Delgado, email=rosa@snakeriver.test, username=taq_owner, login_code=11302, password=Test!2345, role=Owner
  - Lead: name=Marco Ruiz, email=marco@snakeriver.test, username=taq_lead, login_code=77492, password=Test!2345, role=Shift Lead
  - Line: name=Kara Patel, email=kara@snakeriver.test, username=taq_line, login_code=55981, password=Test!2345, role=Line

## Suppliers & Ingredient Suppliers

- Suppliers (supplier):
  - Gem Valley Produce (type=produce, contact=208-555-3111, region=ID, rating=4.7)
  - High Desert Meats (type=meat, contact=208-555-2888, region=ID, rating=4.6)
  - Basin Dry Goods (type=dry, contact=208-555-4410, region=UT, rating=4.5)
- IngredientSupplier mappings (ingredient_supplier): include cost_per_unit, lead_time_days (2–4), spoilage_rate, shelf_life_days, preferred, unit, pack_size, quantity_per_pack_item, supplier_priority.

## Ingredients

- Proteins: Chicken Thigh (lb), Carne Asada (lb), Carnitas (lb)
- Bases: Corn Tortilla (ea), Flour Tortilla (ea), Cilantro (oz), White Onion (oz)
- Salsas/Add-ons: Pico Base (oz), Guacamole (oz), Queso Fresco (oz), Lime Wedge (ea)
- Oils/Prep: Fry Oil (oz), Adobo Marinade (oz)

## Batch Recipes

- Pico Base (yield 160 oz, shelf_life_days=3): ingredients tomato 60 oz, onion 40 oz, cilantro 20 oz, lime 10 oz, salt 5 oz, jalapeño 5 oz
- Guacamole Batch (yield 120 oz, shelf_life_days=2): avocado pulp 90 oz, pico base 20 oz (ingredient_type=batch, reference_id=pico batch id), lime 5 oz, salt 5 oz
- Adobo Marinade (yield 80 oz, shelf_life_days=5): chili paste 40 oz, vinegar 20 oz, spices 20 oz
- For each batch recipe, create a corresponding batch output inventory entry (inventory.batch_recipe_id set, ingredient_id null) so it can be consumed as ingredient_type="batch" in recipes and menu_item_batch_usage.

## Recipes (recipe_ingredients with ingredient_type)

- Carne Asada Taco: corn tortilla 2 ea, carne asada 0.18 lb, pico base 1.5 oz (type=batch), queso fresco 0.8 oz, lime wedge 1 ea
- Pollo Adobado Taco: corn tortilla 2 ea, chicken thigh 0.18 lb, adobo marinade 1.2 oz (type=batch), pico base 1 oz (type=batch), queso fresco 0.8 oz
- Carnitas Burrito: flour tortilla 1 ea, carnitas 0.30 lb, pico base 2 oz (type=batch), guacamole 2 oz (type=batch), queso fresco 1.2 oz
- Chips & Guac: fry oil 3 oz, chips (from tortillas) 4 oz, guacamole 3 oz (type=batch)
- Ensure every recipe line references an existing ingredient or batch recipe record (ingredient_type=ingredient or batch), keeping the reference_id consistent.

## Menu Items & Links

- Menu items: Carne Asada Taco $4.75 (Tacos), Pollo Adobado Taco $4.50 (Tacos), Carnitas Burrito $9.50 (Burritos), Chips & Guac $6.00 (Snacks)
- Map each to recipes via menu_item_recipes; use menu_item_batch_usage for menu items that directly consume a batch (e.g., Chips & Guac using Guacamole Batch if desired).

## Inventory & Lots

- Inventory entries per ingredient with quantity_on_hand and unit.
- Inventory lots (inventory_lots) per delivery: ingredient_supplier_id, quantity, unit, delivery_date, spoilage_expected_date, status=available. For batch outputs, allow lots with batch_recipe_id set and ingredient_id null.

## Purchase Orders

- Two purchase_orders with pending and received statuses; purchase_order_items linked to ingredient_supplier_id and ingredient_id with quantities/price.

## Inventory Usage Logs

- usage_type: sale for completed tickets, batch_production for making batches (reference_type=batch, reference_id=batch_recipe_id), batch_output for moving batch into stock, waste for discarded guac.

## Historical Sales & Orders

- 6 months of sales with weekend lifts; channel split: 60% in-house, 25% takeout, 15% doordash. Populate sales table and a handful of orders/order_items (statuses completed) with order_item_modifiers for add/remove queso.

## Weather Data

- Weather for restaurant_id=4 for the same 6-month window using the coordinates above via the existing weather helper; source="archive-api".

## POS/Integration

- Keep pos_provider="none" for now; pos_connected=false; pos_sync flags true. No POS item mappings yet.
