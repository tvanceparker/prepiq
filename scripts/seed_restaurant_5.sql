-- Seed data for Restaurant 5 (Master Tier)
-- Perrine Heights Kitchen

START TRANSACTION;

INSERT INTO restaurants (
    restaurant_id,
    name,
    phone,
    email,
    address,
    city,
    state,
    zip_code,
    latitude,
    longitude,
    timezone,
    subscription_tier,
    subscription_status,
    expiry_date,
    tax_rate,
    forecast_length,
    sales_channels,
    hours_of_operation,
    eod_run_when_closed,
    eod_run_after_close_mins,
    has_pos_display,
    has_kitchen_display,
    default_ui_layout,
    pos_mode,
    pos_provider,
    pos_connected,
    pos_sync_enabled,
    pos_sync_orders,
    pos_sync_payments,
    pos_sync_menu,
    cash_drawer_enabled,
    settings
) VALUES (
    5,
    'Perrine Heights Kitchen',
    '208-555-5500',
    'info@perrineheights.test',
    '401 Shoshone St N',
    'Twin Falls',
    'ID',
    '83301',
    42.5637,
    -114.4609,
    'America/Boise',
    'master',
    'active',
    '2027-12-25',
    6.00,
    21,
    '["in-house", "takeout", "doordash"]',
    '{"monday":{"open":"10:00","close":"21:00"},"tuesday":{"open":"10:00","close":"21:00"},"wednesday":{"open":"10:00","close":"21:00"},"thursday":{"open":"10:00","close":"21:00"},"friday":{"open":"10:00","close":"23:00"},"saturday":{"open":"10:00","close":"23:00"},"sunday":{"open":"10:00","close":"20:00"}}',
    1,
    60,
    1,
    1,
    'auto',
    'internal',
    'none',
    0,
    1,
    1,
    1,
    0,
    1,
    '{}'
);

INSERT INTO permissions (permission_id, restaurant_id, name, description) VALUES
    (501, 5, 'view_menu', 'View menu items'),
    (502, 5, 'edit_menu', 'Edit menu items'),
    (503, 5, 'view_orders', 'View orders'),
    (504, 5, 'create_orders', 'Create new orders'),
    (505, 5, 'manage_orders', 'Manage order status'),
    (506, 5, 'view_inventory', 'View inventory levels'),
    (507, 5, 'edit_inventory', 'Edit inventory'),
    (508, 5, 'view_sales', 'View sales reports'),
    (509, 5, 'view_employees', 'View employee list'),
    (510, 5, 'manage_employees', 'Manage employees'),
    (511, 5, 'view_settings', 'View settings'),
    (512, 5, 'edit_settings', 'Edit settings'),
    (513, 5, 'manage_suppliers', 'Manage suppliers'),
    (514, 5, 'manage_purchase_orders', 'Manage purchase orders'),
    (515, 5, 'view_prep', 'View prep schedules'),
    (516, 5, 'manage_prep', 'Manage prep schedules'),
    (517, 5, 'view_analytics', 'View analytics'),
    (518, 5, 'manage_devices', 'Manage devices'),
    (519, 5, 'process_payments', 'Process payments'),
    (520, 5, 'manage_cash_drawer', 'Manage cash drawer');

INSERT INTO roles (role_id, restaurant_id, name, description) VALUES
    (501, 5, 'Admin', 'Full access to all features'),
    (502, 5, 'Supervisor', 'Orders, inventory, scheduling, analytics'),
    (503, 5, 'Counter', 'Order entry, payments');

INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
    (501, 501, 5), (501, 502, 5), (501, 503, 5), (501, 504, 5), (501, 505, 5),
    (501, 506, 5), (501, 507, 5), (501, 508, 5), (501, 509, 5), (501, 510, 5),
    (501, 511, 5), (501, 512, 5), (501, 513, 5), (501, 514, 5), (501, 515, 5),
    (501, 516, 5), (501, 517, 5), (501, 518, 5), (501, 519, 5), (501, 520, 5),
    (502, 501, 5), (502, 503, 5), (502, 504, 5), (502, 505, 5), (502, 506, 5),
    (502, 507, 5), (502, 508, 5), (502, 513, 5), (502, 514, 5), (502, 515, 5),
    (502, 516, 5), (502, 517, 5), (502, 519, 5),
    (503, 501, 5), (503, 503, 5), (503, 504, 5), (503, 505, 5), (503, 508, 5),
    (503, 519, 5);

INSERT INTO employees (
    employee_id,
    restaurant_id,
    name,
    email,
    username,
    password_hash,
    login_code,
    role_id,
    is_active
) VALUES
    (501, 5, 'Victoria Ashworth', 'victoria@perrineheights.com', 'victoria_perrine',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     3001, 501, 1),
    (502, 5, 'James Mitchell', 'james@perrineheights.com', 'james_perrine',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     3002, 502, 1),
    (503, 5, 'Maria Gonzalez', 'maria@perrineheights.com', 'maria_perrine',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     3003, 503, 1),
    (504, 5, 'David Kim', 'david@perrineheights.com', 'david_perrine',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     3004, 503, 1),
    (505, 5, 'Sarah Chen', 'sarah@perrineheights.com', 'sarah_perrine',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     3005, 503, 1);

INSERT INTO supplier (supplier_id, restaurant_id, name, type, region, contact_info, rating, is_active) VALUES
    (501, 5, 'Sawtooth Farms', 'produce', 'ID', 'phone: 208-555-1901, email: orders@sawtoothfarms.test', 4.8, 1),
    (502, 5, 'Magic Valley Meats', 'meat', 'ID', 'phone: 208-555-3344, email: orders@mvmeats.test', 4.7, 1),
    (503, 5, 'Summit Dairy', 'dairy', 'ID', 'phone: 208-555-2266, email: orders@summitdairy.test', 4.6, 1),
    (504, 5, 'Gem State Dry Goods', 'dry', 'ID', 'phone: 208-555-1188, email: orders@gemdry.test', 4.5, 1);

INSERT INTO ingredients (ingredient_id, restaurant_id, name, unit, category, is_active) VALUES
    (501, 5, 'Salmon Fillet', 'lb', 'Protein', 1),
    (502, 5, 'Chicken Breast', 'lb', 'Protein', 1),
    (503, 5, 'Short Rib', 'lb', 'Protein', 1),
    (504, 5, 'Short Rib Trim', 'lb', 'Protein', 1),
    (505, 5, 'Risotto Rice', 'oz', 'Starch', 1),
    (506, 5, 'Yukon Potato', 'lb', 'Produce', 1),
    (507, 5, 'Focaccia Bread', 'oz', 'Bread', 1),
    (508, 5, 'Parmesan', 'oz', 'Dairy', 1),
    (509, 5, 'Heavy Cream', 'oz', 'Dairy', 1),
    (510, 5, 'Butter', 'oz', 'Dairy', 1),
    (511, 5, 'Asparagus', 'oz', 'Produce', 1),
    (512, 5, 'Arugula', 'oz', 'Produce', 1),
    (513, 5, 'Lemon', 'ea', 'Produce', 1),
    (514, 5, 'Garlic', 'oz', 'Produce', 1),
    (515, 5, 'Olive Oil', 'oz', 'Oil', 1),
    (516, 5, 'Fry Oil', 'oz', 'Oil', 1),
    (517, 5, 'Truffle Oil', 'oz', 'Oil', 1),
    (518, 5, 'Parsley', 'oz', 'Produce', 1),
    (519, 5, 'Cilantro', 'oz', 'Produce', 1),
    (520, 5, 'Red Wine', 'oz', 'Pantry', 1),
    (521, 5, 'Beef Stock', 'oz', 'Pantry', 1),
    (522, 5, 'Mirepoix', 'oz', 'Produce', 1),
    (523, 5, 'Red Wine Vinegar', 'oz', 'Pantry', 1),
    (524, 5, 'Salt', 'oz', 'Dry', 1),
    (525, 5, 'Black Pepper', 'oz', 'Dry', 1),
    (526, 5, 'Pappardelle Pasta', 'oz', 'Starch', 1),
    (527, 5, 'Shallot', 'oz', 'Produce', 1),
    (528, 5, 'Thyme', 'oz', 'Produce', 1),
    (529, 5, 'Rosemary', 'oz', 'Produce', 1),
    (530, 5, 'White Wine', 'oz', 'Pantry', 1);

INSERT INTO ingredient_supplier (
    ingredient_supplier_id,
    ingredient_id,
    supplier_id,
    restaurant_id,
    cost_per_unit,
    lead_time_days,
    shelf_life_days,
    spoilage_rate,
    preferred,
    min_order_quantity,
    unit,
    pack_size,
    quantity_per_pack_item,
    supplier_priority,
    is_active
) VALUES
    (501, 501, 502, 5, 14.50, 1, 3, 0.12, 1, 5, 'lb', 5, 1, 1, 1),
    (502, 502, 502, 5, 5.25, 1, 4, 0.10, 1, 10, 'lb', 10, 1, 1, 1),
    (503, 503, 502, 5, 12.00, 2, 5, 0.08, 1, 10, 'lb', 10, 1, 1, 1),
    (504, 504, 502, 5, 4.50, 2, 4, 0.10, 1, 5, 'lb', 5, 1, 1, 1),
    (505, 505, 504, 5, 0.15, 3, 365, 0.00, 1, 64, 'oz', 64, 1, 1, 1),
    (506, 506, 501, 5, 1.25, 2, 21, 0.05, 1, 20, 'lb', 20, 1, 1, 1),
    (507, 507, 504, 5, 0.12, 2, 5, 0.08, 1, 64, 'oz', 64, 1, 1, 1),
    (508, 508, 503, 5, 0.45, 2, 60, 0.02, 1, 32, 'oz', 32, 1, 1, 1),
    (509, 509, 503, 5, 0.08, 2, 14, 0.08, 1, 64, 'oz', 64, 1, 1, 1),
    (510, 510, 503, 5, 0.12, 2, 30, 0.03, 1, 32, 'oz', 32, 1, 1, 1),
    (511, 511, 501, 5, 0.20, 1, 5, 0.15, 1, 32, 'oz', 32, 1, 1, 1),
    (512, 512, 501, 5, 0.18, 1, 4, 0.18, 1, 16, 'oz', 16, 1, 1, 1),
    (513, 513, 501, 5, 0.25, 2, 21, 0.05, 1, 24, 'ea', 24, 1, 1, 1),
    (514, 514, 501, 5, 0.10, 2, 30, 0.03, 1, 32, 'oz', 32, 1, 1, 1),
    (515, 515, 504, 5, 0.08, 3, 365, 0.00, 1, 128, 'oz', 128, 1, 1, 1),
    (516, 516, 504, 5, 0.04, 4, 180, 0.01, 1, 128, 'oz', 128, 1, 1, 1),
    (517, 517, 504, 5, 1.50, 3, 180, 0.01, 1, 16, 'oz', 16, 1, 1, 1),
    (518, 518, 501, 5, 0.15, 1, 5, 0.15, 1, 16, 'oz', 16, 1, 1, 1),
    (519, 519, 501, 5, 0.15, 1, 5, 0.15, 1, 16, 'oz', 16, 1, 1, 1),
    (520, 520, 504, 5, 0.10, 3, 365, 0.00, 1, 64, 'oz', 64, 1, 1, 1),
    (521, 521, 504, 5, 0.06, 3, 30, 0.02, 1, 128, 'oz', 128, 1, 1, 1),
    (522, 522, 501, 5, 0.08, 2, 7, 0.10, 1, 64, 'oz', 64, 1, 1, 1),
    (523, 523, 504, 5, 0.05, 3, 365, 0.00, 1, 32, 'oz', 32, 1, 1, 1),
    (524, 524, 504, 5, 0.02, 4, 365, 0.00, 1, 64, 'oz', 64, 1, 1, 1),
    (525, 525, 504, 5, 0.08, 4, 365, 0.00, 1, 16, 'oz', 16, 1, 1, 1),
    (526, 526, 504, 5, 0.12, 3, 90, 0.02, 1, 64, 'oz', 64, 1, 1, 1),
    (527, 527, 501, 5, 0.12, 2, 14, 0.08, 1, 16, 'oz', 16, 1, 1, 1),
    (528, 528, 501, 5, 0.20, 1, 7, 0.12, 1, 8, 'oz', 8, 1, 1, 1),
    (529, 529, 501, 5, 0.22, 1, 10, 0.10, 1, 8, 'oz', 8, 1, 1, 1),
    (530, 530, 504, 5, 0.08, 3, 365, 0.00, 1, 64, 'oz', 64, 1, 1, 1);

INSERT INTO batch_recipes (
    batch_recipe_id,
    restaurant_id,
    name,
    description,
    yield_quantity,
    yield_unit,
    shelf_life_days,
    estimated_prep_time_minutes
) VALUES
    (501, 5, 'Garlic Confit', 'Slow-roasted garlic in olive oil', 80, 'oz', 14, 90),
    (502, 5, 'Demi-Glace', 'Rich beef reduction sauce', 120, 'oz', 10, 240),
    (503, 5, 'Herb Chimichurri', 'Fresh herb sauce with garlic confit', 90, 'oz', 5, 20),
    (504, 5, 'Truffle Butter', 'Compound butter with truffle oil', 60, 'oz', 7, 15);

INSERT INTO batch_recipe_ingredients (
    batch_recipe_ingredient_id,
    batch_recipe_id,
    restaurant_id,
    reference_id,
    ingredient_type,
    quantity_used,
    unit
) VALUES
    (5001, 501, 5, 514, 'ingredient', 40, 'oz'),
    (5002, 501, 5, 515, 'ingredient', 40, 'oz'),
    (5003, 502, 5, 504, 'ingredient', 30, 'oz'),
    (5004, 502, 5, 522, 'ingredient', 25, 'oz'),
    (5005, 502, 5, 520, 'ingredient', 20, 'oz'),
    (5006, 502, 5, 521, 'ingredient', 45, 'oz'),
    (5007, 503, 5, 518, 'ingredient', 30, 'oz'),
    (5008, 503, 5, 519, 'ingredient', 20, 'oz'),
    (5009, 503, 5, 501, 'batch', 8, 'oz'),
    (5010, 503, 5, 515, 'ingredient', 20, 'oz'),
    (5011, 503, 5, 523, 'ingredient', 12, 'oz'),
    (5012, 504, 5, 510, 'ingredient', 50, 'oz'),
    (5013, 504, 5, 517, 'ingredient', 5, 'oz'),
    (5014, 504, 5, 524, 'ingredient', 5, 'oz');

INSERT INTO recipes (recipe_id, restaurant_id, name, description) VALUES
    (501, 5, 'Pan-Seared Salmon Risotto', 'Salmon with creamy parmesan risotto and asparagus'),
    (502, 5, 'Short Rib Pappardelle', 'Braised short rib with demi-glace over pappardelle'),
    (503, 5, 'Truffle Chicken Sandwich', 'Chicken breast with truffle butter on focaccia'),
    (504, 5, 'Garlic Fries', 'Hand-cut fries with garlic confit and herbs');

INSERT INTO recipe_ingredients (
    recipe_ingredient_id,
    recipe_id,
    restaurant_id,
    quantity_used,
    unit,
    ingredient_type,
    reference_id
) VALUES
    (5101, 501, 5, 0.35, 'lb', 'ingredient', 501),
    (5102, 501, 5, 5, 'oz', 'ingredient', 505),
    (5103, 501, 5, 2, 'oz', 'ingredient', 509),
    (5104, 501, 5, 1.5, 'oz', 'ingredient', 508),
    (5105, 501, 5, 3, 'oz', 'ingredient', 511),
    (5106, 501, 5, 1, 'oz', 'ingredient', 510),
    (5107, 501, 5, 0.25, 'ea', 'ingredient', 513),
    (5108, 501, 5, 2, 'oz', 'ingredient', 530),
    (5109, 501, 5, 0.5, 'oz', 'ingredient', 527),
    (5110, 502, 5, 0.40, 'lb', 'ingredient', 503),
    (5111, 502, 5, 3, 'oz', 'batch', 502),
    (5112, 502, 5, 0.6, 'oz', 'batch', 501),
    (5113, 502, 5, 0.8, 'oz', 'batch', 503),
    (5114, 502, 5, 1.2, 'oz', 'ingredient', 508),
    (5115, 502, 5, 0.5, 'oz', 'ingredient', 510),
    (5116, 502, 5, 4, 'oz', 'ingredient', 526),
    (5117, 503, 5, 6, 'oz', 'ingredient', 507),
    (5118, 503, 5, 0.30, 'lb', 'ingredient', 502),
    (5119, 503, 5, 0.8, 'oz', 'batch', 504),
    (5120, 503, 5, 0.8, 'oz', 'ingredient', 512),
    (5121, 503, 5, 0.4, 'oz', 'batch', 501),
    (5122, 504, 5, 0.30, 'lb', 'ingredient', 506),
    (5123, 504, 5, 2.5, 'oz', 'ingredient', 516),
    (5124, 504, 5, 0.3, 'oz', 'batch', 501),
    (5125, 504, 5, 0.2, 'oz', 'ingredient', 518),
    (5126, 504, 5, 0.1, 'oz', 'ingredient', 524);

INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) VALUES
    (501, 5, 'Salmon Risotto', 21.00, 'Entrees', 1),
    (502, 5, 'Short Rib Pappardelle', 23.00, 'Entrees', 1),
    (503, 5, 'Truffle Chicken Sandwich', 14.50, 'Handhelds', 1),
    (504, 5, 'Garlic Fries', 6.50, 'Sides', 1);

INSERT INTO menu_item_recipes (menu_item_id, restaurant_id, recipe_id) VALUES
    (501, 5, 501),
    (502, 5, 502),
    (503, 5, 503),
    (504, 5, 504);

INSERT INTO menu_item_batch_usage (menu_item_id, batch_recipe_id, restaurant_id, quantity_used, unit) VALUES
    (504, 501, 5, 0.3, 'oz');

INSERT INTO inventory (
    inventory_id,
    restaurant_id,
    ingredient_id,
    quantity_on_hand,
    min_stock_level,
    unit
) VALUES
    (501, 5, 501, 8.0, 4.0, 'lb'),
    (502, 5, 502, 15.0, 8.0, 'lb'),
    (503, 5, 503, 12.0, 6.0, 'lb'),
    (504, 5, 504, 5.0, 3.0, 'lb'),
    (505, 5, 505, 128, 64, 'oz'),
    (506, 5, 506, 30.0, 15.0, 'lb'),
    (507, 5, 507, 96, 48, 'oz'),
    (508, 5, 508, 48, 24, 'oz'),
    (509, 5, 509, 96, 48, 'oz'),
    (510, 5, 510, 64, 32, 'oz'),
    (511, 5, 511, 48, 24, 'oz'),
    (512, 5, 512, 24, 12, 'oz'),
    (513, 5, 513, 36, 18, 'ea'),
    (514, 5, 514, 48, 24, 'oz'),
    (515, 5, 515, 192, 96, 'oz'),
    (516, 5, 516, 256, 128, 'oz'),
    (517, 5, 517, 24, 12, 'oz'),
    (518, 5, 518, 24, 12, 'oz'),
    (519, 5, 519, 24, 12, 'oz'),
    (520, 5, 520, 96, 48, 'oz'),
    (521, 5, 521, 192, 96, 'oz'),
    (522, 5, 522, 96, 48, 'oz'),
    (523, 5, 523, 48, 24, 'oz'),
    (524, 5, 524, 64, 32, 'oz'),
    (525, 5, 525, 24, 12, 'oz'),
    (526, 5, 526, 96, 48, 'oz'),
    (527, 5, 527, 24, 12, 'oz'),
    (528, 5, 528, 12, 6, 'oz'),
    (529, 5, 529, 12, 6, 'oz'),
    (530, 5, 530, 96, 48, 'oz'),
    (531, 5, NULL, 40, 20, 'oz'),
    (532, 5, NULL, 60, 30, 'oz'),
    (533, 5, NULL, 45, 22, 'oz'),
    (534, 5, NULL, 30, 15, 'oz');

INSERT INTO inventory_lots (
    lot_id,
    inventory_id,
    restaurant_id,
    ingredient_supplier_id,
    delivery_date,
    spoilage_expected_date,
    quantity,
    total_received,
    unit,
    ingredient_id,
    batch_recipe_id,
    status
) VALUES
    (501, 501, 5, 501, '2025-12-23', '2025-12-26', 4.0, 4.0, 'lb', 501, NULL, 'available'),
    (502, 503, 5, 503, '2025-12-21', '2025-12-26', 6.0, 6.0, 'lb', 503, NULL, 'available'),
    (503, 511, 5, 511, '2025-12-24', '2025-12-29', 24.0, 24.0, 'oz', 511, NULL, 'available'),
    (504, 512, 5, 512, '2025-12-24', '2025-12-28', 12.0, 12.0, 'oz', 512, NULL, 'available'),
    (505, 531, 5, NULL, '2025-12-24', '2026-01-07', 20.0, 20.0, 'oz', NULL, 501, 'available'),
    (506, 532, 5, NULL, '2025-12-23', '2026-01-02', 30.0, 30.0, 'oz', NULL, 502, 'available'),
    (507, 533, 5, NULL, '2025-12-24', '2025-12-29', 22.0, 22.0, 'oz', NULL, 503, 'available'),
    (508, 534, 5, NULL, '2025-12-23', '2025-12-30', 15.0, 15.0, 'oz', NULL, 504, 'available');

INSERT INTO purchase_orders (
    order_id,
    restaurant_id,
    supplier_id,
    order_date,
    expected_delivery_date,
    status,
    total_order_price
) VALUES
    (501, 5, 501, '2025-12-20', '2025-12-22', 'received', 52.80),
    (502, 5, 502, '2025-12-21', '2025-12-23', 'received', 189.50),
    (503, 5, 503, '2025-12-22', '2025-12-24', 'in_transit', 28.80),
    (504, 5, 504, '2025-12-23', '2025-12-27', 'pending', 45.60);

INSERT INTO purchase_order_items (
    order_item_id,
    restaurant_id,
    order_id,
    ingredient_id,
    quantity_ordered,
    unit,
    unit_price,
    ingredient_supplier_id,
    total_item_price
) VALUES
    (5001, 5, 501, 511, 64, 'oz', 0.20, 511, 12.80),
    (5002, 5, 501, 512, 32, 'oz', 0.18, 512, 5.76),
    (5003, 5, 501, 522, 128, 'oz', 0.08, 522, 10.24),
    (5004, 5, 501, 513, 48, 'ea', 0.25, 513, 12.00),
    (5005, 5, 501, 518, 32, 'oz', 0.15, 518, 4.80),
    (5006, 5, 501, 519, 48, 'oz', 0.15, 519, 7.20),
    (5007, 5, 502, 501, 5, 'lb', 14.50, 501, 72.50),
    (5008, 5, 502, 503, 5, 'lb', 12.00, 503, 60.00),
    (5009, 5, 502, 504, 3, 'lb', 4.50, 504, 13.50),
    (5010, 5, 502, 502, 8, 'lb', 5.25, 502, 42.00),
    (5011, 5, 503, 509, 128, 'oz', 0.08, 509, 10.24),
    (5012, 5, 503, 510, 64, 'oz', 0.12, 510, 7.68),
    (5013, 5, 503, 508, 32, 'oz', 0.45, 508, 14.40),
    (5014, 5, 504, 505, 128, 'oz', 0.15, 505, 19.20),
    (5015, 5, 504, 526, 128, 'oz', 0.12, 526, 15.36),
    (5016, 5, 504, 520, 64, 'oz', 0.10, 520, 6.40);

INSERT INTO inventory_usage_log (
    usage_id,
    restaurant_id,
    inventory_id,
    lot_id,
    ingredient_id,
    used_quantity,
    unit,
    used_date,
    usage_type,
    reference_type,
    reference_id,
    notes
) VALUES
    (5001, 5, 531, 505, NULL, 0.6, 'oz', '2025-12-24 12:30:00', 'sale', 'sale', 501, NULL),
    (5002, 5, 532, 506, NULL, 3.0, 'oz', '2025-12-24 12:30:00', 'sale', 'sale', 501, NULL),
    (5003, 5, 533, 507, NULL, 0.8, 'oz', '2025-12-24 12:30:00', 'sale', 'sale', 501, NULL),
    (5004, 5, 514, NULL, 514, 40.0, 'oz', '2025-12-24 08:00:00', 'batch_production', 'batch', 501, NULL),
    (5005, 5, 515, NULL, 515, 40.0, 'oz', '2025-12-24 08:00:00', 'batch_production', 'batch', 501, NULL),
    (5006, 5, 531, NULL, NULL, 80.0, 'oz', '2025-12-24 09:30:00', 'batch_output', 'batch', 501, NULL),
    (5007, 5, 511, 503, 511, 3.0, 'oz', '2025-12-23 21:00:00', 'waste', 'lot', 503, NULL),
    (5008, 5, 501, 501, 501, -0.5, 'lb', '2025-12-23 14:00:00', 'manual_adjustment', 'lot', 501, NULL);

INSERT INTO orders (
    order_id,
    restaurant_id,
    employee_id,
    order_status,
    inventory_deduction_state,
    sales_channel,
    subtotal,
    tax,
    total,
    order_metadata
) VALUES
    (501, 5, 503, 'completed', 'completed', 'in-house', 44.00, 2.64, 46.64, '{"table": "12"}'),
    (502, 5, 503, 'completed', 'completed', 'takeout', 35.50, 2.13, 37.63, '{}'),
    (503, 5, 502, 'completed', 'completed', 'doordash', 27.50, 1.65, 29.15, '{}'),
    (504, 5, 503, 'in_progress', 'pending', 'in-house', 21.00, 1.26, 22.26, '{"table": "8"}'),
    (505, 5, 503, 'open', 'pending', 'in-house', 0.00, 0.00, 0.00, '{"table": "3"}'),
    (506, 5, 502, 'cancelled', 'skipped', 'in-house', 23.00, 1.38, 24.38, '{}');

INSERT INTO order_items (
    order_item_id,
    order_id,
    restaurant_id,
    menu_item_id,
    quantity,
    unit_price,
    line_total
) VALUES
    (5101, 501, 5, 501, 1, 21.00, 21.00),
    (5102, 501, 5, 502, 1, 23.00, 23.00),
    (5103, 502, 5, 503, 2, 14.50, 29.00),
    (5104, 502, 5, 504, 1, 6.50, 6.50),
    (5105, 503, 5, 501, 1, 21.00, 21.00),
    (5106, 503, 5, 504, 1, 6.50, 6.50),
    (5107, 504, 5, 501, 1, 21.00, 21.00),
    (5108, 506, 5, 502, 1, 23.00, 23.00);

INSERT INTO order_item_modifiers (
    order_item_id,
    restaurant_id,
    mod_type,
    target_type,
    reference_id,
    quantity,
    unit,
    note
) VALUES
    (5102, 5, 'remove', 'ingredient', 503, 1, NULL, NULL),
    (5103, 5, 'add', 'ingredient', 501, 1, NULL, NULL);

INSERT INTO payments (
    payment_id,
    order_id,
    restaurant_id,
    payment_timestamp,
    amount,
    method,
    status
) VALUES
    (501, 501, 5, '2025-12-24 13:15:00', 46.64, 'card', 'succeeded'),
    (502, 502, 5, '2025-12-24 12:45:00', 37.63, 'card', 'succeeded'),
    (503, 503, 5, '2025-12-24 19:30:00', 29.15, 'card', 'succeeded'),
    (504, 506, 5, '2025-12-24 18:00:00', 24.38, 'card', 'refunded');

INSERT INTO devices (
    device_id,
    restaurant_id,
    name,
    device_type,
    device_settings
) VALUES
    (501, 5, 'Kitchen Display 1', 'kitchen_display', '{"screen_timeout": 300, "order_alert_sound": true}'),
    (502, 5, 'Counter POS', 'pos_terminal', '{"receipt_printer": true, "cash_drawer": true}'),
    (503, 5, 'Manager Tablet', 'management', '{}');

INSERT INTO stripe_terminal_readers (
    reader_id,
    restaurant_id,
    stripe_reader_id,
    label,
    device_type,
    serial_number,
    status
) VALUES
    (501, 5, 'STRP-001-PERRINE', 'Counter Reader', 'pos_terminal', 'STRP-001-PERRINE', 'online');

INSERT INTO supplier_preferences (
    restaurant_id,
    weight_cost,
    weight_lead_time,
    weight_spoilage,
    weight_rating
) VALUES
    (5, 0.35, 0.25, 0.20, 0.20);

COMMIT;
