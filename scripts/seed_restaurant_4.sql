-- Seed data for Restaurant 4 (Pro Tier)
-- Snake River Taqueria

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
    4,
    'Snake River Taqueria',
    '208-555-4400',
    'info@snakerivertaq.test',
    '210 Falls Ave',
    'Twin Falls',
    'ID',
    '83301',
    42.5885,
    -114.4602,
    'America/Boise',
    'pro',
    'active',
    '2027-06-25',
    6.00,
    14,
    '["in-house", "takeout", "doordash"]',
    '{"sunday":{"open":"10:30","close":"21:00"},"monday":{"open":"10:30","close":"21:00"},"tuesday":{"open":"10:30","close":"21:00"},"wednesday":{"open":"10:30","close":"21:00"},"thursday":{"open":"10:30","close":"21:00"},"friday":{"open":"10:30","close":"22:00"},"saturday":{"open":"10:30","close":"22:00"}}',
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
    0,
    '{}'
);

INSERT INTO permissions (permission_id, restaurant_id, name, description) VALUES
    (401, 4, 'view_menu', 'View menu items'),
    (402, 4, 'edit_menu', 'Edit menu items'),
    (403, 4, 'view_orders', 'View orders'),
    (404, 4, 'create_orders', 'Create new orders'),
    (405, 4, 'manage_orders', 'Manage order status'),
    (406, 4, 'view_inventory', 'View inventory levels'),
    (407, 4, 'edit_inventory', 'Edit inventory'),
    (408, 4, 'view_sales', 'View sales reports'),
    (409, 4, 'view_employees', 'View employee list'),
    (410, 4, 'manage_employees', 'Manage employees'),
    (411, 4, 'view_settings', 'View settings'),
    (412, 4, 'edit_settings', 'Edit settings'),
    (413, 4, 'manage_suppliers', 'Manage suppliers'),
    (414, 4, 'manage_purchase_orders', 'Manage purchase orders'),
    (415, 4, 'view_prep', 'View prep schedules'),
    (416, 4, 'manage_prep', 'Manage prep schedules');

INSERT INTO roles (role_id, restaurant_id, name, description) VALUES
    (401, 4, 'Owner', 'Full access to all features'),
    (402, 4, 'Shift Lead', 'Orders, inventory counts, prep'),
    (403, 4, 'Line', 'Order entry only');

INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
    (401, 401, 4), (401, 402, 4), (401, 403, 4), (401, 404, 4), (401, 405, 4),
    (401, 406, 4), (401, 407, 4), (401, 408, 4), (401, 409, 4), (401, 410, 4),
    (401, 411, 4), (401, 412, 4), (401, 413, 4), (401, 414, 4), (401, 415, 4),
    (401, 416, 4),
    (402, 401, 4), (402, 403, 4), (402, 404, 4), (402, 405, 4), (402, 406, 4),
    (402, 407, 4), (402, 408, 4), (402, 415, 4), (402, 416, 4),
    (403, 401, 4), (403, 403, 4), (403, 404, 4), (403, 405, 4);

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
    (401, 4, 'Elena Rodriguez', 'elena@snakerivertaqueria.com', 'elena_snake',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     2001, 401, 1),
    (402, 4, 'Carlos Mendez', 'carlos@snakerivertaqueria.com', 'carlos_snake',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     2002, 402, 1),
    (403, 4, 'Miguel Santos', 'miguel@snakerivertaqueria.com', 'miguel_snake',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     2003, 403, 1);

INSERT INTO supplier (supplier_id, restaurant_id, name, type, region, contact_info, rating, is_active) VALUES
    (401, 4, 'Gem Valley Produce', 'produce', 'ID', 'phone: 208-555-3111, email: orders@gemvalley.test', 4.7, 1),
    (402, 4, 'High Desert Meats', 'meat', 'ID', 'phone: 208-555-2888, email: orders@highdesert.test', 4.6, 1),
    (403, 4, 'Basin Dry Goods', 'dry', 'UT', 'phone: 208-555-4410, email: orders@basingoods.test', 4.5, 1);

INSERT INTO ingredients (ingredient_id, restaurant_id, name, unit, category, is_active) VALUES
    (401, 4, 'Chicken Thigh', 'lb', 'Protein', 1),
    (402, 4, 'Carne Asada', 'lb', 'Protein', 1),
    (403, 4, 'Carnitas', 'lb', 'Protein', 1),
    (404, 4, 'Corn Tortilla', 'ea', 'Base', 1),
    (405, 4, 'Flour Tortilla', 'ea', 'Base', 1),
    (406, 4, 'Cilantro', 'oz', 'Produce', 1),
    (407, 4, 'White Onion', 'oz', 'Produce', 1),
    (408, 4, 'Queso Fresco', 'oz', 'Dairy', 1),
    (409, 4, 'Lime Wedge', 'ea', 'Produce', 1),
    (410, 4, 'Fry Oil', 'oz', 'Oil', 1),
    (411, 4, 'Roma Tomato', 'oz', 'Produce', 1),
    (412, 4, 'Jalapeño', 'oz', 'Produce', 1),
    (413, 4, 'Salt', 'oz', 'Dry', 1),
    (414, 4, 'Lime Juice', 'oz', 'Produce', 1),
    (415, 4, 'Avocado', 'ea', 'Produce', 1),
    (416, 4, 'Dried Chili', 'oz', 'Dry', 1),
    (417, 4, 'Vinegar', 'oz', 'Pantry', 1),
    (418, 4, 'Cumin', 'oz', 'Spice', 1),
    (419, 4, 'Oregano', 'oz', 'Spice', 1),
    (420, 4, 'Garlic', 'oz', 'Produce', 1),
    (421, 4, 'Tortilla Chips', 'oz', 'Base', 1);

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
    (401, 401, 402, 4, 4.25, 2, 5, 0.08, 1, 10, 'lb', 10, 1, 1, 1),
    (402, 402, 402, 4, 8.50, 2, 4, 0.10, 1, 10, 'lb', 10, 1, 1, 1),
    (403, 403, 402, 4, 6.75, 2, 5, 0.08, 1, 10, 'lb', 10, 1, 1, 1),
    (404, 404, 403, 4, 0.08, 3, 14, 0.02, 1, 100, 'ea', 100, 1, 1, 1),
    (405, 405, 403, 4, 0.12, 3, 14, 0.02, 1, 100, 'ea', 100, 1, 1, 1),
    (406, 406, 401, 4, 0.15, 2, 5, 0.15, 1, 32, 'oz', 32, 1, 1, 1),
    (407, 407, 401, 4, 0.10, 2, 10, 0.05, 1, 64, 'oz', 64, 1, 1, 1),
    (408, 408, 401, 4, 0.25, 2, 21, 0.03, 1, 32, 'oz', 32, 1, 1, 1),
    (409, 409, 401, 4, 0.05, 2, 14, 0.05, 1, 50, 'ea', 50, 1, 1, 1),
    (410, 410, 403, 4, 0.04, 4, 180, 0.01, 1, 128, 'oz', 128, 1, 1, 1),
    (411, 411, 401, 4, 0.08, 2, 7, 0.10, 1, 64, 'oz', 64, 1, 1, 1),
    (412, 412, 401, 4, 0.12, 2, 10, 0.08, 1, 32, 'oz', 32, 1, 1, 1),
    (413, 413, 403, 4, 0.02, 4, 365, 0.00, 1, 64, 'oz', 64, 1, 1, 1),
    (414, 414, 401, 4, 0.10, 2, 14, 0.05, 1, 32, 'oz', 32, 1, 1, 1),
    (415, 415, 401, 4, 0.75, 2, 4, 0.15, 1, 24, 'ea', 24, 1, 1, 1),
    (416, 416, 403, 4, 0.30, 4, 180, 0.01, 1, 32, 'oz', 32, 1, 1, 1),
    (417, 417, 403, 4, 0.05, 4, 365, 0.00, 1, 64, 'oz', 64, 1, 1, 1),
    (418, 418, 403, 4, 0.40, 4, 365, 0.00, 1, 16, 'oz', 16, 1, 1, 1),
    (419, 419, 403, 4, 0.35, 4, 365, 0.00, 1, 16, 'oz', 16, 1, 1, 1),
    (420, 420, 401, 4, 0.15, 2, 21, 0.05, 1, 32, 'oz', 32, 1, 1, 1),
    (421, 421, 403, 4, 0.06, 3, 30, 0.02, 1, 64, 'oz', 64, 1, 1, 1);

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
    (401, 4, 'Pico de Gallo', 'Fresh tomato salsa', 160, 'oz', 3, 30),
    (402, 4, 'Guacamole', 'Fresh avocado dip', 120, 'oz', 2, 20),
    (403, 4, 'Adobo Marinade', 'Chili-based marinade for chicken', 80, 'oz', 5, 25);

INSERT INTO batch_recipe_ingredients (
    batch_recipe_ingredient_id,
    batch_recipe_id,
    restaurant_id,
    reference_id,
    ingredient_type,
    quantity_used,
    unit
) VALUES
    (4001, 401, 4, 411, 'ingredient', 60, 'oz'),
    (4002, 401, 4, 407, 'ingredient', 40, 'oz'),
    (4003, 401, 4, 406, 'ingredient', 20, 'oz'),
    (4004, 401, 4, 414, 'ingredient', 10, 'oz'),
    (4005, 401, 4, 412, 'ingredient', 8, 'oz'),
    (4006, 401, 4, 413, 'ingredient', 5, 'oz'),
    (4007, 402, 4, 415, 'ingredient', 12, 'ea'),
    (4008, 402, 4, 401, 'batch', 20, 'oz'),
    (4009, 402, 4, 414, 'ingredient', 5, 'oz'),
    (4010, 402, 4, 413, 'ingredient', 3, 'oz'),
    (4011, 403, 4, 416, 'ingredient', 40, 'oz'),
    (4012, 403, 4, 417, 'ingredient', 20, 'oz'),
    (4013, 403, 4, 418, 'ingredient', 8, 'oz'),
    (4014, 403, 4, 419, 'ingredient', 6, 'oz'),
    (4015, 403, 4, 420, 'ingredient', 6, 'oz');

INSERT INTO recipes (recipe_id, restaurant_id, name, description) VALUES
    (401, 4, 'Carne Asada Taco', 'Grilled steak taco with pico and queso'),
    (402, 4, 'Pollo Adobado Taco', 'Adobo marinated chicken taco'),
    (403, 4, 'Carnitas Burrito', 'Slow-cooked pork burrito'),
    (404, 4, 'Chips & Guac', 'House chips with fresh guacamole');

INSERT INTO recipe_ingredients (
    recipe_ingredient_id,
    recipe_id,
    restaurant_id,
    quantity_used,
    unit,
    ingredient_type,
    reference_id
) VALUES
    (4101, 401, 4, 2, 'ea', 'ingredient', 404),
    (4102, 401, 4, 0.18, 'lb', 'ingredient', 402),
    (4103, 401, 4, 1.5, 'oz', 'batch', 401),
    (4104, 401, 4, 0.8, 'oz', 'ingredient', 408),
    (4105, 401, 4, 1, 'ea', 'ingredient', 409),
    (4106, 402, 4, 2, 'ea', 'ingredient', 404),
    (4107, 402, 4, 0.18, 'lb', 'ingredient', 401),
    (4108, 402, 4, 1.2, 'oz', 'batch', 403),
    (4109, 402, 4, 1, 'oz', 'batch', 401),
    (4110, 402, 4, 0.8, 'oz', 'ingredient', 408),
    (4111, 403, 4, 1, 'ea', 'ingredient', 405),
    (4112, 403, 4, 0.30, 'lb', 'ingredient', 403),
    (4113, 403, 4, 2, 'oz', 'batch', 401),
    (4114, 403, 4, 2, 'oz', 'batch', 402),
    (4115, 403, 4, 1.2, 'oz', 'ingredient', 408),
    (4116, 404, 4, 4, 'oz', 'ingredient', 421),
    (4117, 404, 4, 3, 'oz', 'batch', 402);

INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) VALUES
    (401, 4, 'Carne Asada Taco', 4.75, 'Tacos', 1),
    (402, 4, 'Pollo Adobado Taco', 4.50, 'Tacos', 1),
    (403, 4, 'Carnitas Burrito', 9.50, 'Burritos', 1),
    (404, 4, 'Chips & Guac', 6.00, 'Snacks', 1);

INSERT INTO menu_item_recipes (menu_item_id, restaurant_id, recipe_id) VALUES
    (401, 4, 401),
    (402, 4, 402),
    (403, 4, 403),
    (404, 4, 404);

INSERT INTO menu_item_batch_usage (menu_item_id, batch_recipe_id, restaurant_id, quantity_used, unit) VALUES
    (404, 402, 4, 3.0, 'oz');

INSERT INTO inventory (
    inventory_id,
    restaurant_id,
    ingredient_id,
    quantity_on_hand,
    min_stock_level,
    unit
) VALUES
    (401, 4, 401, 20.0, 10.0, 'lb'),
    (402, 4, 402, 15.0, 8.0, 'lb'),
    (403, 4, 403, 18.0, 10.0, 'lb'),
    (404, 4, 404, 200, 100, 'ea'),
    (405, 4, 405, 150, 80, 'ea'),
    (406, 4, 406, 64, 32, 'oz'),
    (407, 4, 407, 96, 48, 'oz'),
    (408, 4, 408, 64, 32, 'oz'),
    (409, 4, 409, 75, 40, 'ea'),
    (410, 4, 410, 256, 128, 'oz'),
    (411, 4, 411, 128, 64, 'oz'),
    (412, 4, 412, 48, 24, 'oz'),
    (413, 4, 413, 64, 32, 'oz'),
    (414, 4, 414, 48, 24, 'oz'),
    (415, 4, 415, 36, 18, 'ea'),
    (416, 4, 416, 48, 24, 'oz'),
    (417, 4, 417, 64, 32, 'oz'),
    (418, 4, 418, 24, 12, 'oz'),
    (419, 4, 419, 24, 12, 'oz'),
    (420, 4, 420, 48, 24, 'oz'),
    (421, 4, 421, 128, 64, 'oz'),
    (422, 4, NULL, 80, 40, 'oz'),
    (423, 4, NULL, 60, 30, 'oz'),
    (424, 4, NULL, 40, 20, 'oz');

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
    (401, 401, 4, 401, '2025-12-20', '2025-12-25', 10.0, 10.0, 'lb', 401, NULL, 'available'),
    (402, 402, 4, 402, '2025-12-19', '2025-12-23', 10.0, 10.0, 'lb', 402, NULL, 'available'),
    (403, 403, 4, 403, '2025-12-20', '2025-12-25', 10.0, 10.0, 'lb', 403, NULL, 'available'),
    (404, 411, 4, 411, '2025-12-22', '2025-12-29', 64.0, 64.0, 'oz', 411, NULL, 'available'),
    (405, 415, 4, 415, '2025-12-23', '2025-12-27', 24, 24, 'ea', 415, NULL, 'available'),
    (406, 422, 4, NULL, '2025-12-24', '2025-12-27', 40.0, 40.0, 'oz', NULL, 401, 'available'),
    (407, 423, 4, NULL, '2025-12-24', '2025-12-26', 30.0, 30.0, 'oz', NULL, 402, 'available');

INSERT INTO purchase_orders (
    order_id,
    restaurant_id,
    supplier_id,
    order_date,
    expected_delivery_date,
    status,
    total_order_price
) VALUES
    (401, 4, 401, '2025-12-20', '2025-12-22', 'received', 45.60),
    (402, 4, 402, '2025-12-21', '2025-12-23', 'pending', 127.50);

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
    (4001, 4, 401, 411, 128, 'oz', 0.08, 411, 10.24),
    (4002, 4, 401, 415, 48, 'ea', 0.75, 415, 36.00),
    (4003, 4, 402, 401, 15, 'lb', 4.25, 401, 63.75),
    (4004, 4, 402, 402, 7.5, 'lb', 8.50, 402, 63.75);

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
    (4001, 4, 422, 406, NULL, 1.5, 'oz', '2025-12-24 12:30:00', 'sale', 'sale', 401, NULL),
    (4002, 4, 423, 407, NULL, 3.0, 'oz', '2025-12-24 12:30:00', 'sale', 'sale', 401, NULL),
    (4003, 4, 401, 401, 401, 0.18, 'lb', '2025-12-24 09:00:00', 'batch_production', 'batch', 401, NULL),
    (4004, 4, 422, NULL, NULL, 40.0, 'oz', '2025-12-24 09:30:00', 'batch_output', 'batch', 401, NULL),
    (4005, 4, 415, 405, 415, 2, 'ea', '2025-12-23 21:00:00', 'waste', 'lot', 405, NULL);

INSERT INTO orders (
    order_id,
    restaurant_id,
    employee_id,
    order_status,
    inventory_deduction_state,
    sales_channel,
    subtotal,
    tax,
    total
) VALUES
    (401, 4, 403, 'completed', 'completed', 'in-house', 14.25, 0.86, 15.11),
    (402, 4, 402, 'completed', 'completed', 'takeout', 19.00, 1.14, 20.14),
    (403, 4, 403, 'completed', 'completed', 'doordash', 15.50, 0.93, 16.43),
    (404, 4, 403, 'in_progress', 'pending', 'in-house', 9.25, 0.56, 9.81),
    (405, 4, 402, 'open', 'pending', 'in-house', 0.00, 0.00, 0.00);

INSERT INTO order_items (
    order_item_id,
    order_id,
    restaurant_id,
    menu_item_id,
    quantity,
    unit_price,
    line_total
) VALUES
    (4101, 401, 4, 401, 2, 4.75, 9.50),
    (4102, 401, 4, 402, 1, 4.50, 4.50),
    (4103, 402, 4, 403, 2, 9.50, 19.00),
    (4104, 403, 4, 401, 1, 4.75, 4.75),
    (4105, 403, 4, 402, 1, 4.50, 4.50),
    (4106, 403, 4, 404, 1, 6.00, 6.00),
    (4107, 404, 4, 401, 1, 4.75, 4.75),
    (4108, 404, 4, 402, 1, 4.50, 4.50);

COMMIT;
