-- scripts/migrations/seed_restaurant_pro.sql
-- Seed data for Restaurant ID 4: Snake River Taqueria (Full Tier)
-- Full tier sample: inventory, recipes, batches with nested support
-- 
-- Run: mysql -u user -p database < scripts/migrations/seed_restaurant_pro.sql
-- After seeding: python scripts/backfill_weather.py --start 2025-06-25 --end 2025-12-24

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- SCHEMA UPDATES (ensure enum values exist)
-- ============================================================================
-- Add batch_output to usage_type enum if not present
ALTER TABLE inventory_usage_log 
MODIFY COLUMN usage_type ENUM('sale', 'waste', 'spoilage', 'manual_adjustment', 'batch_production', 'batch_output') NOT NULL;

-- ============================================================================
-- CLEANUP: Remove existing data for restaurant_id=4 (idempotent)
-- ============================================================================
DELETE FROM order_items WHERE restaurant_id = 4;
DELETE FROM orders WHERE restaurant_id = 4;
DELETE FROM inventory_usage_log WHERE restaurant_id = 4;
DELETE FROM inventory_lots WHERE restaurant_id = 4;
DELETE FROM inventory WHERE restaurant_id = 4;
DELETE FROM purchase_order_items WHERE restaurant_id = 4;
DELETE FROM purchase_orders WHERE restaurant_id = 4;
DELETE FROM menu_item_recipes WHERE restaurant_id = 4;
DELETE FROM menu_items WHERE restaurant_id = 4;
DELETE FROM recipe_ingredients WHERE restaurant_id = 4;
DELETE FROM recipes WHERE restaurant_id = 4;
DELETE FROM batch_recipe_ingredients WHERE restaurant_id = 4;
DELETE FROM batch_recipes WHERE restaurant_id = 4;
DELETE FROM ingredient_supplier WHERE restaurant_id = 4;
DELETE FROM ingredients WHERE restaurant_id = 4;
DELETE FROM supplier WHERE restaurant_id = 4;
DELETE FROM role_permissions WHERE restaurant_id = 4;
DELETE FROM employees WHERE restaurant_id = 4;
DELETE FROM roles WHERE restaurant_id = 4;
DELETE FROM permissions WHERE restaurant_id = 4;
DELETE FROM restaurants WHERE restaurant_id = 4;

-- ============================================================================
-- RESTAURANT
-- ============================================================================
INSERT INTO restaurants (
    restaurant_id, name, phone, address, city, state, zip_code,
    latitude, longitude, subscription_tier, email, subscription_status,
    expiry_date, forecast_length, hours_of_operation, tax_rate, timezone,
    eod_run_when_closed, eod_run_after_close_mins, sales_channels, last_eod_run_date,
    settings, has_pos_display, has_kitchen_display, default_ui_layout,
    pos_provider, pos_connected, pos_mode
) VALUES (
    4, 'Snake River Taqueria', '208-555-0104', '789 Riverside Ave', 'Twin Falls', 'ID', '83301',
    42.5630, -114.4720, 'full', 'info@snakerivertaqueria.com', 'active',
    '2026-12-31', 14,
    '{"mon": {"open": "10:00", "close": "22:00"}, "tue": {"open": "10:00", "close": "22:00"}, "wed": {"open": "10:00", "close": "22:00"}, "thu": {"open": "10:00", "close": "22:00"}, "fri": {"open": "10:00", "close": "23:00"}, "sat": {"open": "09:00", "close": "23:00"}, "sun": {"open": "09:00", "close": "21:00"}}',
    6.00, 'America/Boise', TRUE, 60,
    '["in-house", "take-out", "delivery"]', NULL,
    '{}', FALSE, FALSE, 'auto',
    'none', FALSE, 'none'
);

-- ============================================================================
-- PERMISSIONS (Full tier sample: 15 permissions)
-- ============================================================================
INSERT INTO permissions (permission_id, restaurant_id, name, description) VALUES
(401, 4, 'view_menu', 'View menu items'),
(402, 4, 'view_dashboard', 'View dashboard'),
(403, 4, 'view_orders', 'View orders'),
(404, 4, 'create_orders', 'Create new orders'),
(405, 4, 'view_reports', 'View sales reports'),
(406, 4, 'manage_menu', 'Add/edit/delete menu items'),
(407, 4, 'manage_orders', 'Modify and manage orders'),
(408, 4, 'manage_employees', 'Manage employee records'),
(409, 4, 'manage_settings', 'Manage restaurant settings'),
(410, 4, 'view_employees', 'View employee list'),
(411, 4, 'view_inventory', 'View inventory levels'),
(412, 4, 'manage_inventory', 'Manage inventory'),
(413, 4, 'view_recipes', 'View recipes'),
(414, 4, 'manage_recipes', 'Create and edit recipes'),
(415, 4, 'view_suppliers', 'View supplier information');

-- ============================================================================
-- ROLES
-- ============================================================================
INSERT INTO roles (role_id, restaurant_id, name, description) VALUES
(401, 4, 'Owner', 'Full access to all features'),
(402, 4, 'Manager', 'Operational management'),
(403, 4, 'Line Cook', 'Kitchen operations');

-- ============================================================================
-- ROLE_PERMISSIONS
-- ============================================================================
-- Owner gets all permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(401, 401, 4), (401, 402, 4), (401, 403, 4), (401, 404, 4), (401, 405, 4),
(401, 406, 4), (401, 407, 4), (401, 408, 4), (401, 409, 4), (401, 410, 4),
(401, 411, 4), (401, 412, 4), (401, 413, 4), (401, 414, 4), (401, 415, 4);

-- Manager gets operational permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(402, 401, 4), (402, 402, 4), (402, 403, 4), (402, 404, 4), (402, 405, 4),
(402, 407, 4), (402, 410, 4), (402, 411, 4), (402, 412, 4), (402, 413, 4);

-- Line Cook gets kitchen permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(403, 401, 4), (403, 402, 4), (403, 403, 4), (403, 411, 4), (403, 413, 4);

-- ============================================================================
-- EMPLOYEES
-- ============================================================================
INSERT INTO employees (
    employee_id, restaurant_id, name, role_id, email, username, phone,
    password_hash, hire_date, is_active, login_code, pay_rate, employment_type, preferences
) VALUES
(401, 4, 'Elena Rodriguez', 401, 'elena@snakerivertaqueria.com', 'taq_owner', '208-555-0141',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2021-06-01', TRUE, 2001, 0.00, 'salary', '{}'),
(402, 4, 'Carlos Mendez', 402, 'carlos@snakerivertaqueria.com', 'carlos_snake', '208-555-0142',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2022-09-15', TRUE, 2002, 22.00, 'hourly', '{}'),
(403, 4, 'Miguel Santos', 403, 'miguel@snakerivertaqueria.com', 'miguel_snake', '208-555-0143',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2023-03-20', TRUE, 2003, 18.00, 'hourly', '{}');

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
INSERT INTO supplier (
    supplier_id, restaurant_id, name, type, region, contact_info, rating,
    website, is_active, supplier_feedback, contract_status, contract_start_date, contract_end_date
) VALUES
(401, 4, 'Valley Fresh Produce', 'produce', 'Idaho', 'orders@valleyfresh.com', 4.80,
 'https://valleyfresh.com', TRUE, 'Reliable local supplier', 'Active', '2024-01-01', '2025-12-31'),
(402, 4, 'Mountain Meat Co', 'protein', 'Idaho', 'sales@mountainmeat.com', 4.60,
 'https://mountainmeat.com', TRUE, 'Quality beef and poultry', 'Active', '2024-01-01', '2025-12-31'),
(403, 4, 'Sysco Idaho', 'distributor', 'Regional', 'idaho@sysco.com', 4.50,
 'https://sysco.com', TRUE, 'Broad product range', 'Active', '2024-01-01', '2025-12-31');

-- ============================================================================
-- INGREDIENTS (21 ingredients)
-- ============================================================================
INSERT INTO ingredients (
    ingredient_id, restaurant_id, name, unit, category, average_weight_per_unit,
    abc_class, max_stock_level, is_active
) VALUES
-- Produce (IDs 401-410)
(401, 4, 'Tomatoes', 'lb', 'Produce', 1.00, 'A', 50.00, TRUE),
(402, 4, 'White Onions', 'lb', 'Produce', 1.00, 'A', 40.00, TRUE),
(403, 4, 'Jalapeños', 'lb', 'Produce', 1.00, 'B', 15.00, TRUE),
(404, 4, 'Cilantro', 'bunch', 'Produce', 0.25, 'B', 30.00, TRUE),
(405, 4, 'Limes', 'each', 'Produce', 0.10, 'B', 100.00, TRUE),
(406, 4, 'Avocados', 'each', 'Produce', 0.40, 'A', 80.00, TRUE),
(407, 4, 'Romaine Lettuce', 'head', 'Produce', 1.50, 'B', 20.00, TRUE),
(408, 4, 'Serrano Peppers', 'lb', 'Produce', 1.00, 'C', 10.00, TRUE),
(409, 4, 'Garlic', 'lb', 'Produce', 1.00, 'B', 10.00, TRUE),
(410, 4, 'Red Onions', 'lb', 'Produce', 1.00, 'C', 20.00, TRUE),

-- Proteins (IDs 411-414)
(411, 4, 'Chicken Breast', 'lb', 'Protein', 1.00, 'A', 60.00, TRUE),
(412, 4, 'Carne Asada Beef', 'lb', 'Protein', 1.00, 'A', 50.00, TRUE),
(413, 4, 'Carnitas Pork', 'lb', 'Protein', 1.00, 'A', 40.00, TRUE),
(414, 4, 'Ground Beef', 'lb', 'Protein', 1.00, 'B', 30.00, TRUE),

-- Dairy & Cheese (IDs 415-417)
(415, 4, 'Shredded Cheddar', 'lb', 'Dairy', 1.00, 'A', 25.00, TRUE),
(416, 4, 'Sour Cream', 'lb', 'Dairy', 1.00, 'B', 15.00, TRUE),
(417, 4, 'Cotija Cheese', 'lb', 'Dairy', 1.00, 'B', 10.00, TRUE),

-- Dry Goods & Tortillas (IDs 418-421)
(418, 4, 'Flour Tortillas 10"', 'dozen', 'Dry Goods', 0.80, 'A', 50.00, TRUE),
(419, 4, 'Corn Tortillas 6"', 'dozen', 'Dry Goods', 0.50, 'A', 50.00, TRUE),
(420, 4, 'Dried Guajillo Chiles', 'lb', 'Dry Goods', 1.00, 'C', 5.00, TRUE),
(421, 4, 'Cumin', 'oz', 'Dry Goods', 0.0625, 'C', 32.00, TRUE);

-- ============================================================================
-- INGREDIENT_SUPPLIER (21 mappings, 1:1 for simplicity)
-- ============================================================================
INSERT INTO ingredient_supplier (
    ingredient_supplier_id, ingredient_id, supplier_id, restaurant_id,
    cost_per_unit, lead_time_days, spoilage_rate, shelf_life_days,
    preferred, min_order_quantity, supplier_priority, unit, pack_size, quantity_per_pack_item, is_active
) VALUES
-- Valley Fresh Produce (supplier 401)
(401, 401, 401, 4, 2.50, 1, 0.050, 7, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),   -- Tomatoes
(402, 402, 401, 4, 1.20, 1, 0.030, 14, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),  -- White Onions
(403, 403, 401, 4, 3.50, 1, 0.040, 10, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),   -- Jalapeños
(404, 404, 401, 4, 1.50, 1, 0.080, 5, TRUE, 10, 1, 'bunch', 1, 1.00, TRUE),-- Cilantro
(405, 405, 401, 4, 0.25, 1, 0.020, 14, TRUE, 50, 1, 'each', 1, 1.00, TRUE),-- Limes
(406, 406, 401, 4, 1.75, 1, 0.060, 5, TRUE, 20, 1, 'each', 1, 1.00, TRUE), -- Avocados
(407, 407, 401, 4, 2.00, 1, 0.070, 7, TRUE, 10, 1, 'head', 1, 1.00, TRUE), -- Romaine Lettuce
(408, 408, 401, 4, 4.00, 1, 0.040, 10, TRUE, 3, 1, 'lb', 1, 1.00, TRUE),   -- Serrano Peppers
(409, 409, 401, 4, 5.00, 1, 0.010, 30, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),   -- Garlic
(410, 410, 401, 4, 1.30, 1, 0.030, 14, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),  -- Red Onions

-- Mountain Meat Co (supplier 402)
(411, 411, 402, 4, 4.50, 2, 0.020, 5, TRUE, 20, 1, 'lb', 1, 1.00, TRUE),   -- Chicken Breast
(412, 412, 402, 4, 8.00, 2, 0.020, 5, TRUE, 15, 1, 'lb', 1, 1.00, TRUE),   -- Carne Asada Beef
(413, 413, 402, 4, 6.00, 2, 0.025, 5, TRUE, 15, 1, 'lb', 1, 1.00, TRUE),   -- Carnitas Pork
(414, 414, 402, 4, 5.50, 2, 0.020, 5, TRUE, 15, 1, 'lb', 1, 1.00, TRUE),   -- Ground Beef

-- Sysco Idaho (supplier 403)
(415, 415, 403, 4, 6.00, 3, 0.010, 30, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),  -- Shredded Cheddar
(416, 416, 403, 4, 3.50, 3, 0.030, 14, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),  -- Sour Cream
(417, 417, 403, 4, 8.00, 3, 0.020, 21, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),   -- Cotija Cheese
(418, 418, 403, 4, 3.00, 3, 0.005, 14, TRUE, 20, 1, 'dozen', 1, 1.00, TRUE),-- Flour Tortillas
(419, 419, 403, 4, 2.50, 3, 0.005, 10, TRUE, 20, 1, 'dozen', 1, 1.00, TRUE),-- Corn Tortillas
(420, 420, 403, 4, 12.00, 3, 0.005, 180, TRUE, 2, 1, 'lb', 1, 1.00, TRUE), -- Dried Guajillo Chiles
(421, 421, 403, 4, 0.50, 3, 0.002, 365, TRUE, 16, 1, 'oz', 1, 1.00, TRUE); -- Cumin

-- ============================================================================
-- BATCH RECIPES (3 batches, including nested: Guacamole uses Pico de Gallo)
-- ============================================================================
INSERT INTO batch_recipes (
    batch_recipe_id, restaurant_id, name, description, yield_quantity,
    yield_unit, estimated_prep_time_minutes, shelf_life_days
) VALUES
(401, 4, 'Pico de Gallo', 'Fresh tomato salsa', 8.00, 'cups', 20, 2),
(402, 4, 'Guacamole', 'Fresh avocado dip with pico', 6.00, 'cups', 15, 1),
(403, 4, 'Adobo Marinade', 'Dried chile marinade for proteins', 4.00, 'cups', 30, 7);

-- ============================================================================
-- BATCH RECIPE INGREDIENTS (new schema with ingredient_type and reference_id)
-- ============================================================================
INSERT INTO batch_recipe_ingredients (
    batch_recipe_ingredient_id, batch_recipe_id, restaurant_id, reference_id,
    ingredient_type, quantity_used, unit
) VALUES
-- Pico de Gallo (batch 401) - uses raw ingredients
(401, 401, 4, 401, 'ingredient', 2.00, 'lb'),     -- Tomatoes
(402, 401, 4, 402, 'ingredient', 0.50, 'lb'),     -- White Onions
(403, 401, 4, 403, 'ingredient', 0.25, 'lb'),     -- Jalapeños
(404, 401, 4, 404, 'ingredient', 2.00, 'bunch'),  -- Cilantro
(405, 401, 4, 405, 'ingredient', 6.00, 'each'),   -- Limes

-- Guacamole (batch 402) - uses Pico de Gallo (nested batch!)
(406, 402, 4, 406, 'ingredient', 8.00, 'each'),   -- Avocados
(407, 402, 4, 401, 'batch', 2.00, 'cups'),        -- Pico de Gallo (reference to batch 401!)
(408, 402, 4, 405, 'ingredient', 4.00, 'each'),   -- Limes

-- Adobo Marinade (batch 403) - uses raw ingredients
(409, 403, 4, 420, 'ingredient', 0.50, 'lb'),     -- Dried Guajillo Chiles
(410, 403, 4, 409, 'ingredient', 0.25, 'lb'),     -- Garlic
(411, 403, 4, 421, 'ingredient', 2.00, 'oz');     -- Cumin

-- ============================================================================
-- RECIPES (4 recipes)
-- ============================================================================
INSERT INTO recipes (recipe_id, restaurant_id, name, description) VALUES
(401, 4, 'Street Tacos', 'Classic street-style tacos'),
(402, 4, 'Carne Asada Burrito', 'Large flour tortilla with grilled steak'),
(403, 4, 'Chicken Quesadilla', 'Grilled flour tortilla with chicken and cheese'),
(404, 4, 'Taco Salad', 'Crispy bowl with seasoned ground beef');

-- ============================================================================
-- RECIPE INGREDIENTS (same schema as batch_recipe_ingredients)
-- ============================================================================
INSERT INTO recipe_ingredients (
    recipe_ingredient_id, recipe_id, restaurant_id, reference_id,
    ingredient_type, quantity_used, unit, fallback_ingredient_id
) VALUES
-- Street Tacos (recipe 401)
(401, 401, 4, 419, 'ingredient', 3.00, 'each', NULL),  -- Corn Tortillas
(402, 401, 4, 413, 'ingredient', 0.25, 'lb', NULL),    -- Carnitas Pork
(403, 401, 4, 401, 'batch', 0.25, 'cups', NULL),       -- Pico de Gallo
(404, 401, 4, 404, 'ingredient', 0.25, 'bunch', NULL), -- Cilantro

-- Carne Asada Burrito (recipe 402)
(405, 402, 4, 418, 'ingredient', 1.00, 'each', NULL),  -- Flour Tortilla
(406, 402, 4, 412, 'ingredient', 0.50, 'lb', NULL),    -- Carne Asada Beef
(407, 402, 4, 402, 'batch', 0.50, 'cups', NULL),       -- Guacamole
(408, 402, 4, 416, 'ingredient', 0.10, 'lb', NULL),    -- Sour Cream
(409, 402, 4, 415, 'ingredient', 0.15, 'lb', NULL),    -- Shredded Cheddar

-- Chicken Quesadilla (recipe 403)
(410, 403, 4, 418, 'ingredient', 2.00, 'each', NULL),  -- Flour Tortillas
(411, 403, 4, 411, 'ingredient', 0.33, 'lb', NULL),    -- Chicken Breast
(412, 403, 4, 415, 'ingredient', 0.25, 'lb', NULL),    -- Shredded Cheddar

-- Taco Salad (recipe 404)
(413, 404, 4, 414, 'ingredient', 0.33, 'lb', NULL),    -- Ground Beef
(414, 404, 4, 407, 'ingredient', 0.50, 'head', NULL),  -- Romaine Lettuce
(415, 404, 4, 415, 'ingredient', 0.20, 'lb', NULL),    -- Shredded Cheddar
(416, 404, 4, 401, 'batch', 0.25, 'cups', NULL);       -- Pico de Gallo

-- ============================================================================
-- MENU ITEMS
-- ============================================================================
INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) VALUES
(401, 4, 'Street Tacos (3)', 11.99, 'Tacos', TRUE),
(402, 4, 'Carne Asada Burrito', 14.99, 'Burritos', TRUE),
(403, 4, 'Chicken Quesadilla', 12.99, 'Quesadillas', TRUE),
(404, 4, 'Taco Salad', 13.99, 'Salads', TRUE);

-- ============================================================================
-- MENU ITEM RECIPES (linking menu items to recipes)
-- ============================================================================
INSERT INTO menu_item_recipes (menu_item_id, recipe_id, restaurant_id) VALUES
(401, 401, 4),  -- Street Tacos -> Street Tacos recipe
(402, 402, 4),  -- Carne Asada Burrito -> Carne Asada Burrito recipe
(403, 403, 4),  -- Chicken Quesadilla -> Chicken Quesadilla recipe
(404, 404, 4);  -- Taco Salad -> Taco Salad recipe

-- ============================================================================
-- INVENTORY (24 rows: 21 ingredients + 3 batches)
-- ============================================================================
INSERT INTO inventory (
    inventory_id, restaurant_id, ingredient_id, quantity_on_hand, min_stock_level,
    last_delivery_date, spoilage_expected_date, shelf_life_days, spoilage_rate,
    last_audit_timestamp, last_audit_quantity, unit
) VALUES
-- Produce
(401, 4, 401, 25.00, 10.00, '2025-12-23', '2025-12-30', 7, 0.050, '2025-12-24 08:00:00', 25.00, 'lb'),
(402, 4, 402, 20.00, 8.00, '2025-12-23', '2026-01-06', 14, 0.030, '2025-12-24 08:00:00', 20.00, 'lb'),
(403, 4, 403, 8.00, 3.00, '2025-12-23', '2026-01-02', 10, 0.040, '2025-12-24 08:00:00', 8.00, 'lb'),
(404, 4, 404, 15.00, 5.00, '2025-12-23', '2025-12-28', 5, 0.080, '2025-12-24 08:00:00', 15.00, 'bunch'),
(405, 4, 405, 60.00, 20.00, '2025-12-23', '2026-01-06', 14, 0.020, '2025-12-24 08:00:00', 60.00, 'each'),
(406, 4, 406, 40.00, 15.00, '2025-12-23', '2025-12-28', 5, 0.060, '2025-12-24 08:00:00', 40.00, 'each'),
(407, 4, 407, 10.00, 4.00, '2025-12-23', '2025-12-30', 7, 0.070, '2025-12-24 08:00:00', 10.00, 'head'),
(408, 4, 408, 5.00, 2.00, '2025-12-23', '2026-01-02', 10, 0.040, '2025-12-24 08:00:00', 5.00, 'lb'),
(409, 4, 409, 5.00, 2.00, '2025-12-20', '2026-01-19', 30, 0.010, '2025-12-24 08:00:00', 5.00, 'lb'),
(410, 4, 410, 10.00, 4.00, '2025-12-23', '2026-01-06', 14, 0.030, '2025-12-24 08:00:00', 10.00, 'lb'),
-- Proteins
(411, 4, 411, 30.00, 15.00, '2025-12-23', '2025-12-28', 5, 0.020, '2025-12-24 08:00:00', 30.00, 'lb'),
(412, 4, 412, 25.00, 12.00, '2025-12-23', '2025-12-28', 5, 0.020, '2025-12-24 08:00:00', 25.00, 'lb'),
(413, 4, 413, 20.00, 10.00, '2025-12-23', '2025-12-28', 5, 0.025, '2025-12-24 08:00:00', 20.00, 'lb'),
(414, 4, 414, 15.00, 8.00, '2025-12-23', '2025-12-28', 5, 0.020, '2025-12-24 08:00:00', 15.00, 'lb'),
-- Dairy
(415, 4, 415, 12.00, 5.00, '2025-12-20', '2026-01-19', 30, 0.010, '2025-12-24 08:00:00', 12.00, 'lb'),
(416, 4, 416, 8.00, 3.00, '2025-12-20', '2026-01-03', 14, 0.030, '2025-12-24 08:00:00', 8.00, 'lb'),
(417, 4, 417, 5.00, 2.00, '2025-12-20', '2026-01-10', 21, 0.020, '2025-12-24 08:00:00', 5.00, 'lb'),
-- Dry Goods
(418, 4, 418, 25.00, 10.00, '2025-12-20', '2026-01-03', 14, 0.005, '2025-12-24 08:00:00', 25.00, 'dozen'),
(419, 4, 419, 25.00, 10.00, '2025-12-20', '2025-12-30', 10, 0.005, '2025-12-24 08:00:00', 25.00, 'dozen'),
(420, 4, 420, 3.00, 1.00, '2025-12-15', '2026-06-13', 180, 0.005, '2025-12-24 08:00:00', 3.00, 'lb'),
(421, 4, 421, 20.00, 8.00, '2025-12-15', '2026-12-15', 365, 0.002, '2025-12-24 08:00:00', 20.00, 'oz'),
-- Batch outputs (inventory rows for prepared batches)
(422, 4, NULL, 4.00, 2.00, '2025-12-24', '2025-12-26', 2, 0.100, '2025-12-24 10:00:00', 4.00, 'cups'),
(423, 4, NULL, 3.00, 1.50, '2025-12-24', '2025-12-25', 1, 0.150, '2025-12-24 10:30:00', 3.00, 'cups'),
(424, 4, NULL, 2.00, 1.00, '2025-12-24', '2025-12-31', 7, 0.020, '2025-12-24 11:00:00', 2.00, 'cups');

-- ============================================================================
-- INVENTORY LOTS
-- ============================================================================
INSERT INTO inventory_lots (
    lot_id, inventory_id, restaurant_id, ingredient_supplier_id,
    delivery_date, spoilage_expected_date, quantity, total_received, unit,
    ingredient_id, batch_recipe_id, status
) VALUES
-- Raw ingredient lots (from suppliers)
(401, 401, 4, 401, '2025-12-23', '2025-12-30', 25.00, 25.00, 'lb', 401, NULL, 'available'),
(402, 402, 4, 402, '2025-12-23', '2026-01-06', 20.00, 20.00, 'lb', 402, NULL, 'available'),
(403, 406, 4, 406, '2025-12-23', '2025-12-28', 40.00, 40.00, 'each', 406, NULL, 'available'),
(404, 411, 4, 411, '2025-12-23', '2025-12-28', 30.00, 30.00, 'lb', 411, NULL, 'available'),
(405, 412, 4, 412, '2025-12-23', '2025-12-28', 25.00, 25.00, 'lb', 412, NULL, 'available'),

-- Batch-produced lots (NO supplier - ingredient_supplier_id is NULL)
(406, 422, 4, NULL, '2025-12-24', '2025-12-26', 4.00, 4.00, 'cups', NULL, 401, 'available'),  -- Pico de Gallo
(407, 423, 4, NULL, '2025-12-24', '2025-12-25', 3.00, 3.00, 'cups', NULL, 402, 'available'),  -- Guacamole
(408, 424, 4, NULL, '2025-12-24', '2025-12-31', 2.00, 2.00, 'cups', NULL, 403, 'available'); -- Adobo Marinade

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
INSERT INTO purchase_orders (
    order_id, restaurant_id, supplier_id, order_date, expected_delivery_date,
    actual_delivery_date, status, total_order_price, notes
) VALUES
(401, 4, 401, '2025-12-22', '2025-12-23', '2025-12-23', 'received', 85.00, 'Weekly produce order'),
(402, 4, 402, '2025-12-22', '2025-12-24', NULL, 'in_transit', 175.00, 'Protein restock'),
(403, 4, 403, '2025-12-23', '2025-12-26', NULL, 'pending', 95.00, 'Dry goods and dairy');

-- ============================================================================
-- PURCHASE ORDER ITEMS
-- ============================================================================
INSERT INTO purchase_order_items (
    order_item_id, restaurant_id, order_id, ingredient_id, ingredient_supplier_id,
    quantity_ordered, unit, unit_price, total_item_price
) VALUES
-- PO 401 (Valley Fresh Produce)
(401, 4, 401, 401, 401, 20.00, 'lb', 2.50, 50.00),    -- Tomatoes
(402, 4, 401, 406, 406, 20.00, 'each', 1.75, 35.00),  -- Avocados
-- PO 402 (Mountain Meat Co)
(403, 4, 402, 411, 411, 20.00, 'lb', 4.50, 90.00),    -- Chicken Breast
(404, 4, 402, 412, 412, 10.00, 'lb', 8.00, 80.00),    -- Carne Asada
-- PO 403 (Sysco Idaho)
(405, 4, 403, 415, 415, 10.00, 'lb', 6.00, 60.00),    -- Shredded Cheddar
(406, 4, 403, 418, 418, 10.00, 'dozen', 3.00, 30.00); -- Flour Tortillas

-- ============================================================================
-- INVENTORY USAGE LOG
-- ============================================================================
INSERT INTO inventory_usage_log (
    usage_id, restaurant_id, inventory_id, lot_id, ingredient_id,
    used_quantity, unit, used_date, usage_type, reference_type, reference_id, notes
) VALUES
-- Batch production: Pico de Gallo consumed ingredients
(401, 4, 401, 401, 401, 2.00, 'lb', '2025-12-24 09:00:00', 'batch_production', 'batch', 401, 'Pico de Gallo prep'),
(402, 4, 402, 402, 402, 0.50, 'lb', '2025-12-24 09:00:00', 'batch_production', 'batch', 401, 'Pico de Gallo prep'),
-- Batch output: Pico de Gallo produced
(403, 4, 422, 406, 401, 8.00, 'cups', '2025-12-24 09:30:00', 'batch_output', 'batch', 401, 'Pico de Gallo output'),
-- Batch production: Guacamole (uses Pico de Gallo)
(404, 4, 406, 403, 406, 8.00, 'each', '2025-12-24 10:00:00', 'batch_production', 'batch', 402, 'Guac prep - avocados'),
(405, 4, 422, 406, 401, 2.00, 'cups', '2025-12-24 10:00:00', 'batch_production', 'batch', 402, 'Guac prep - pico'),
-- Batch output: Guacamole produced
(406, 4, 423, 407, 406, 6.00, 'cups', '2025-12-24 10:30:00', 'batch_output', 'batch', 402, 'Guacamole output'),
-- Sale deductions
(407, 4, 413, NULL, 413, 0.75, 'lb', '2025-12-24 12:30:00', 'sale', 'sale', 401, 'Street tacos order'),
(408, 4, 412, NULL, 412, 0.50, 'lb', '2025-12-24 13:00:00', 'sale', 'sale', 402, 'Burrito order'),
-- Waste
(409, 4, 404, NULL, 404, 2.00, 'bunch', '2025-12-24 20:00:00', 'waste', 'waste_report', 1, 'Wilted cilantro');

-- ============================================================================
-- SAMPLE ORDERS
-- ============================================================================
INSERT INTO orders (
    order_id, restaurant_id, external_id, employee_id, order_timestamp,
    order_status, sales_channel, subtotal, tax, discount, total,
    order_metadata, inventory_deduction_state
) VALUES
(401, 4, NULL, 402, '2025-12-24 12:30:00', 'completed', 'in-house', 24.98, 1.50, 0.00, 26.48, '{}', 'completed'),
(402, 4, NULL, 402, '2025-12-24 13:00:00', 'completed', 'in-house', 27.98, 1.68, 0.00, 29.66, '{}', 'completed'),
(403, 4, NULL, 402, '2025-12-24 18:45:00', 'completed', 'take-out', 14.99, 0.90, 0.00, 15.89, '{}', 'completed'),
(404, 4, NULL, 403, '2025-12-24 19:15:00', 'completed', 'in-house', 38.97, 2.34, 0.00, 41.31, '{}', 'completed');

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
INSERT INTO order_items (
    order_item_id, order_id, restaurant_id, menu_item_id, quantity,
    unit_price, line_total, instructions, recipe_snapshot
) VALUES
-- Order 401: 2 Street Tacos orders
(4001, 401, 4, 401, 2, 11.99, 23.98, NULL, NULL),
-- Order 402: 1 Burrito + 1 Quesadilla
(4002, 402, 4, 402, 1, 14.99, 14.99, NULL, NULL),
(4003, 402, 4, 403, 1, 12.99, 12.99, NULL, NULL),
-- Order 403: 1 Carne Asada Burrito
(4004, 403, 4, 402, 1, 14.99, 14.99, NULL, NULL),
-- Order 404: 1 of each menu item
(4005, 404, 4, 401, 1, 11.99, 11.99, NULL, NULL),
(4006, 404, 4, 402, 1, 14.99, 14.99, NULL, NULL),
(4007, 404, 4, 404, 1, 13.99, 13.99, NULL, NULL);

-- =========================================================================
-- SALES (mirror order_items for sales reporting table)
-- =========================================================================
INSERT INTO sales (
    sale_id, restaurant_id, sale_timestamp, menu_item_id, quantity_sold, sales_channel
) VALUES
-- Order 401 (2025-12-24 12:30:00)
(4001, 4, '2025-12-24 12:30:00', 401, 2, 'in-house'),
-- Order 402 (2025-12-24 13:00:00)
(4002, 4, '2025-12-24 13:00:00', 402, 1, 'in-house'),
(4003, 4, '2025-12-24 13:00:00', 403, 1, 'in-house'),
-- Order 403 (2025-12-24 18:45:00)
(4004, 4, '2025-12-24 18:45:00', 402, 1, 'take-out'),
-- Order 404 (2025-12-24 19:15:00)
(4005, 4, '2025-12-24 19:15:00', 401, 1, 'in-house'),
(4006, 4, '2025-12-24 19:15:00', 402, 1, 'in-house'),
(4007, 4, '2025-12-24 19:15:00', 404, 1, 'in-house');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- POST-SEED INSTRUCTIONS
-- ============================================================================
-- After running this script:
-- 1. Generate proper bcrypt password hashes for employees
-- 2. Backfill weather data:
--    python scripts/backfill_weather.py --start 2025-06-25 --end 2025-12-24
-- 3. Generate 6 months of sales data programmatically for realistic forecasting
--
-- Notes:
-- - Full tier sample includes: ingredients, suppliers, recipes, batches (with nesting), inventory
-- - Guacamole batch references Pico de Gallo batch (nested batch support)
-- - Batch-produced inventory lots have NULL ingredient_supplier_id
-- ============================================================================
