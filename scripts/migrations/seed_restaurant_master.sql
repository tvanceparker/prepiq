-- scripts/migrations/seed_restaurant_master.sql
-- Seed data for Restaurant ID 5: Perrine Heights Kitchen (Master Tier)
-- Master tier: Full POS, devices, payments, nested batches, all features
-- 
-- Run: mysql -u user -p database < scripts/migrations/seed_restaurant_master.sql
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
-- CLEANUP: Remove existing data for restaurant_id=5 (idempotent)
-- Delete by restaurant_id AND by specific ID ranges we'll insert
-- ============================================================================
DELETE FROM order_item_modifiers WHERE restaurant_id = 5 OR modifier_id BETWEEN 501 AND 599;
DELETE FROM payments WHERE restaurant_id = 5 OR payment_id BETWEEN 501 AND 599;
DELETE FROM order_items WHERE restaurant_id = 5 OR order_item_id BETWEEN 5101 AND 5199;
DELETE FROM orders WHERE restaurant_id = 5 OR order_id BETWEEN 501 AND 599;
DELETE FROM inventory_usage_log WHERE restaurant_id = 5 OR usage_id BETWEEN 501 AND 599;
DELETE FROM inventory_lots WHERE restaurant_id = 5 OR lot_id BETWEEN 501 AND 599;
DELETE FROM inventory WHERE restaurant_id = 5 OR inventory_id BETWEEN 501 AND 599;
DELETE FROM purchase_order_items WHERE restaurant_id = 5 OR order_item_id BETWEEN 501 AND 599;
DELETE FROM purchase_orders WHERE restaurant_id = 5 OR order_id BETWEEN 501 AND 599;
DELETE FROM menu_item_recipes WHERE restaurant_id = 5 OR menu_item_id BETWEEN 501 AND 599;
DELETE FROM menu_items WHERE restaurant_id = 5 OR menu_item_id BETWEEN 501 AND 599;
DELETE FROM recipe_ingredients WHERE restaurant_id = 5 OR recipe_ingredient_id BETWEEN 501 AND 599;
DELETE FROM recipes WHERE restaurant_id = 5 OR recipe_id BETWEEN 501 AND 599;
DELETE FROM batch_recipe_ingredients WHERE restaurant_id = 5 OR batch_recipe_ingredient_id BETWEEN 501 AND 599;
DELETE FROM batch_recipes WHERE restaurant_id = 5 OR batch_recipe_id BETWEEN 501 AND 599;
DELETE FROM ingredient_supplier WHERE restaurant_id = 5 OR ingredient_supplier_id BETWEEN 501 AND 599;
DELETE FROM ingredients WHERE restaurant_id = 5 OR ingredient_id BETWEEN 501 AND 599;
DELETE FROM supplier WHERE restaurant_id = 5 OR supplier_id BETWEEN 501 AND 599;
DELETE FROM stripe_terminal_readers WHERE restaurant_id = 5 OR reader_id BETWEEN 501 AND 599;
DELETE FROM devices WHERE restaurant_id = 5 OR device_id BETWEEN 501 AND 599;
DELETE FROM supplier_preferences WHERE restaurant_id = 5;
DELETE FROM role_permissions WHERE restaurant_id = 5;
DELETE FROM employees WHERE restaurant_id = 5 OR employee_id BETWEEN 501 AND 599;
DELETE FROM roles WHERE restaurant_id = 5 OR role_id BETWEEN 501 AND 599;
DELETE FROM permissions WHERE restaurant_id = 5 OR permission_id BETWEEN 501 AND 599;
DELETE FROM restaurants WHERE restaurant_id = 5;

-- ============================================================================
-- RESTAURANT
-- ============================================================================
INSERT INTO restaurants (
    restaurant_id, name, phone, address, city, state, zip_code,
    latitude, longitude, subscription_tier, email, subscription_status,
    expiry_date, forecast_length, hours_of_operation, tax_rate, timezone,
    eod_run_when_closed, eod_run_after_close_mins, sales_channels, last_eod_run_date,
    settings, has_pos_display, has_kitchen_display, default_ui_layout,
    pos_provider, pos_connected, pos_mode, stripe_terminal_location_id, cash_drawer_enabled
) VALUES (
    5, 'Perrine Heights Kitchen', '208-555-0105', '1234 Perrine Bridge Rd', 'Twin Falls', 'ID', '83301',
    42.5637, -114.4609, 'master', 'info@perrineheights.com', 'active',
    '2026-12-31', 30,
    '{"mon": {"open": "11:00", "close": "22:00"}, "tue": {"open": "11:00", "close": "22:00"}, "wed": {"open": "11:00", "close": "22:00"}, "thu": {"open": "11:00", "close": "22:00"}, "fri": {"open": "11:00", "close": "23:00"}, "sat": {"open": "10:00", "close": "23:00"}, "sun": {"open": "10:00", "close": "21:00"}}',
    6.00, 'America/Boise', TRUE, 60,
    '["in-house", "take-out", "delivery", "catering"]', NULL,
    '{"enable_kds_routing": true, "auto_inventory_deduction": true}', TRUE, TRUE, 'kds',
    'none', FALSE, 'internal', 'loc_perrine_heights', TRUE
);

-- ============================================================================
-- PERMISSIONS (Master tier: 20 permissions)
-- ============================================================================
INSERT INTO permissions (permission_id, restaurant_id, name, description) VALUES
(501, 5, 'view_menu', 'View menu items'),
(502, 5, 'view_dashboard', 'View dashboard'),
(503, 5, 'view_orders', 'View orders'),
(504, 5, 'create_orders', 'Create new orders'),
(505, 5, 'view_reports', 'View sales reports'),
(506, 5, 'manage_menu', 'Add/edit/delete menu items'),
(507, 5, 'manage_orders', 'Modify and manage orders'),
(508, 5, 'manage_employees', 'Manage employee records'),
(509, 5, 'manage_settings', 'Manage restaurant settings'),
(510, 5, 'view_employees', 'View employee list'),
(511, 5, 'view_inventory', 'View inventory levels'),
(512, 5, 'manage_inventory', 'Manage inventory'),
(513, 5, 'view_recipes', 'View recipes'),
(514, 5, 'manage_recipes', 'Create and edit recipes'),
(515, 5, 'view_suppliers', 'View supplier information'),
(516, 5, 'manage_suppliers', 'Manage supplier relationships'),
(517, 5, 'view_analytics', 'View analytics dashboard'),
(518, 5, 'manage_pos', 'Manage POS settings and devices'),
(519, 5, 'process_payments', 'Process customer payments'),
(520, 5, 'manage_cash_drawer', 'Access and manage cash drawer');

-- ============================================================================
-- ROLES
-- ============================================================================
INSERT INTO roles (role_id, restaurant_id, name, description) VALUES
(501, 5, 'Owner', 'Full access to all features'),
(502, 5, 'General Manager', 'Full operational control'),
(503, 5, 'Sous Chef', 'Kitchen leadership'),
(504, 5, 'Line Cook', 'Kitchen operations'),
(505, 5, 'Server', 'Front of house service');

-- ============================================================================
-- ROLE_PERMISSIONS
-- ============================================================================
-- Owner gets all permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(501, 501, 5), (501, 502, 5), (501, 503, 5), (501, 504, 5), (501, 505, 5),
(501, 506, 5), (501, 507, 5), (501, 508, 5), (501, 509, 5), (501, 510, 5),
(501, 511, 5), (501, 512, 5), (501, 513, 5), (501, 514, 5), (501, 515, 5),
(501, 516, 5), (501, 517, 5), (501, 518, 5), (501, 519, 5), (501, 520, 5);

-- General Manager gets most permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(502, 501, 5), (502, 502, 5), (502, 503, 5), (502, 504, 5), (502, 505, 5),
(502, 506, 5), (502, 507, 5), (502, 510, 5), (502, 511, 5), (502, 512, 5),
(502, 513, 5), (502, 514, 5), (502, 515, 5), (502, 516, 5), (502, 517, 5),
(502, 518, 5), (502, 519, 5), (502, 520, 5);

-- Sous Chef gets kitchen + inventory permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(503, 501, 5), (503, 502, 5), (503, 503, 5), (503, 504, 5), (503, 507, 5),
(503, 511, 5), (503, 512, 5), (503, 513, 5), (503, 514, 5), (503, 515, 5);

-- Line Cook gets limited kitchen permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(504, 501, 5), (504, 502, 5), (504, 503, 5), (504, 511, 5), (504, 513, 5);

-- Server gets front-of-house permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(505, 501, 5), (505, 502, 5), (505, 503, 5), (505, 504, 5), (505, 519, 5);

-- ============================================================================
-- EMPLOYEES
-- ============================================================================
INSERT INTO employees (
    employee_id, restaurant_id, name, role_id, email, username, phone,
    password_hash, hire_date, is_active, login_code, pay_rate, employment_type, preferences
) VALUES
(501, 5, 'Victoria Ashworth', 501, 'victoria@perrineheights.com', 'victoria_perrine', '208-555-0151',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2020-01-15', TRUE, 3001, 0.00, 'salary', '{}'),
(502, 5, 'James Mitchell', 502, 'james@perrineheights.com', 'james_perrine', '208-555-0152',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2021-03-01', TRUE, 3002, 28.00, 'hourly', '{}'),
(503, 5, 'Maria Gonzalez', 503, 'maria@perrineheights.com', 'maria_perrine', '208-555-0153',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2022-06-15', TRUE, 3003, 24.00, 'hourly', '{}'),
(504, 5, 'David Kim', 504, 'david@perrineheights.com', 'david_perrine', '208-555-0154',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2023-09-01', TRUE, 3004, 18.00, 'hourly', '{}'),
(505, 5, 'Sarah Chen', 505, 'sarah@perrineheights.com', 'sarah_perrine', '208-555-0155',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2024-02-01', TRUE, 3005, 16.00, 'hourly', '{}');

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
INSERT INTO supplier (
    supplier_id, restaurant_id, name, type, region, contact_info, rating,
    website, is_active, supplier_feedback, contract_status, contract_start_date, contract_end_date
) VALUES
(501, 5, 'Premium Produce Co', 'produce', 'Idaho', 'orders@premiumproduce.com', 4.90,
 'https://premiumproduce.com', TRUE, 'Exceptional quality organic produce', 'Active', '2024-01-01', '2025-12-31'),
(502, 5, 'Heritage Meats', 'protein', 'Idaho', 'sales@heritagemeats.com', 4.85,
 'https://heritagemeats.com', TRUE, 'Grass-fed beef, heritage pork', 'Active', '2024-01-01', '2025-12-31'),
(503, 5, 'Artisan Dairy', 'dairy', 'Regional', 'orders@artisandairy.com', 4.75,
 'https://artisandairy.com', TRUE, 'Local cheese and butter', 'Active', '2024-01-01', '2025-12-31'),
(504, 5, 'Fine Foods Distributor', 'distributor', 'National', 'west@finefoods.com', 4.60,
 'https://finefoods.com', TRUE, 'Specialty and imported items', 'Active', '2024-01-01', '2025-12-31');

-- ============================================================================
-- INGREDIENTS (30 ingredients for fine dining)
-- ============================================================================
INSERT INTO ingredients (
    ingredient_id, restaurant_id, name, unit, category, average_weight_per_unit,
    abc_class, max_stock_level, is_active
) VALUES
-- Produce (IDs 501-512)
(501, 5, 'Garlic', 'lb', 'Produce', 1.00, 'A', 15.00, TRUE),
(502, 5, 'Shallots', 'lb', 'Produce', 1.00, 'A', 10.00, TRUE),
(503, 5, 'Fresh Thyme', 'bunch', 'Produce', 0.10, 'B', 20.00, TRUE),
(504, 5, 'Fresh Rosemary', 'bunch', 'Produce', 0.10, 'B', 20.00, TRUE),
(505, 5, 'Italian Parsley', 'bunch', 'Produce', 0.15, 'B', 25.00, TRUE),
(506, 5, 'Baby Arugula', 'lb', 'Produce', 1.00, 'B', 15.00, TRUE),
(507, 5, 'Fingerling Potatoes', 'lb', 'Produce', 1.00, 'A', 40.00, TRUE),
(508, 5, 'Cremini Mushrooms', 'lb', 'Produce', 1.00, 'B', 20.00, TRUE),
(509, 5, 'Lemons', 'each', 'Produce', 0.20, 'B', 50.00, TRUE),
(510, 5, 'Chives', 'bunch', 'Produce', 0.05, 'C', 15.00, TRUE),
(511, 5, 'Red Wine Vinegar', 'oz', 'Produce', 0.0625, 'C', 64.00, TRUE),
(512, 5, 'Olive Oil Extra Virgin', 'oz', 'Produce', 0.0625, 'A', 128.00, TRUE),

-- Proteins (IDs 513-518)
(513, 5, 'Prime Ribeye', 'lb', 'Protein', 1.00, 'A', 30.00, TRUE),
(514, 5, 'Duck Breast', 'lb', 'Protein', 1.00, 'A', 20.00, TRUE),
(515, 5, 'Lamb Rack', 'lb', 'Protein', 1.00, 'A', 15.00, TRUE),
(516, 5, 'Sea Bass Fillet', 'lb', 'Protein', 1.00, 'A', 15.00, TRUE),
(517, 5, 'Veal Bones', 'lb', 'Protein', 1.00, 'B', 20.00, TRUE),
(518, 5, 'Chicken Stock', 'qt', 'Protein', 2.00, 'B', 20.00, TRUE),

-- Dairy (IDs 519-523)
(519, 5, 'European Butter', 'lb', 'Dairy', 1.00, 'A', 20.00, TRUE),
(520, 5, 'Heavy Cream', 'qt', 'Dairy', 2.00, 'A', 15.00, TRUE),
(521, 5, 'Gruyere Cheese', 'lb', 'Dairy', 1.00, 'B', 10.00, TRUE),
(522, 5, 'Parmesan Reggiano', 'lb', 'Dairy', 1.00, 'B', 10.00, TRUE),
(523, 5, 'Creme Fraiche', 'lb', 'Dairy', 1.00, 'B', 8.00, TRUE),

-- Specialty (IDs 524-530)
(524, 5, 'Black Truffle Oil', 'oz', 'Specialty', 0.0625, 'A', 16.00, TRUE),
(525, 5, 'Aged Balsamic', 'oz', 'Specialty', 0.0625, 'B', 32.00, TRUE),
(526, 5, 'Dijon Mustard', 'oz', 'Condiments', 0.0625, 'C', 32.00, TRUE),
(527, 5, 'Capers', 'oz', 'Condiments', 0.0625, 'C', 16.00, TRUE),
(528, 5, 'Fleur de Sel', 'oz', 'Seasonings', 0.0625, 'C', 16.00, TRUE),
(529, 5, 'Black Peppercorns', 'oz', 'Seasonings', 0.0625, 'C', 16.00, TRUE),
(530, 5, 'Dry Red Wine', 'oz', 'Wine/Spirits', 0.0625, 'B', 128.00, TRUE);

-- ============================================================================
-- INGREDIENT_SUPPLIER (30 mappings)
-- ============================================================================
INSERT INTO ingredient_supplier (
    ingredient_supplier_id, ingredient_id, supplier_id, restaurant_id,
    cost_per_unit, lead_time_days, spoilage_rate, shelf_life_days,
    preferred, min_order_quantity, supplier_priority, unit, pack_size, quantity_per_pack_item, is_active
) VALUES
-- Premium Produce Co (supplier 501)
(501, 501, 501, 5, 8.00, 1, 0.010, 30, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),   -- Garlic
(502, 502, 501, 5, 6.00, 1, 0.020, 21, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),   -- Shallots
(503, 503, 501, 5, 3.00, 1, 0.100, 5, TRUE, 10, 1, 'bunch', 1, 1.00, TRUE),-- Fresh Thyme
(504, 504, 501, 5, 3.00, 1, 0.100, 5, TRUE, 10, 1, 'bunch', 1, 1.00, TRUE),-- Fresh Rosemary
(505, 505, 501, 5, 2.50, 1, 0.100, 5, TRUE, 10, 1, 'bunch', 1, 1.00, TRUE),-- Italian Parsley
(506, 506, 501, 5, 12.00, 1, 0.080, 5, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),   -- Baby Arugula
(507, 507, 501, 5, 4.00, 1, 0.020, 14, TRUE, 20, 1, 'lb', 1, 1.00, TRUE),  -- Fingerling Potatoes
(508, 508, 501, 5, 8.00, 1, 0.050, 7, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),   -- Cremini Mushrooms
(509, 509, 501, 5, 0.50, 1, 0.020, 21, TRUE, 30, 1, 'each', 1, 1.00, TRUE),-- Lemons
(510, 510, 501, 5, 2.00, 1, 0.100, 5, TRUE, 10, 1, 'bunch', 1, 1.00, TRUE),-- Chives

-- Heritage Meats (supplier 502)
(513, 513, 502, 5, 32.00, 2, 0.010, 5, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),  -- Prime Ribeye
(514, 514, 502, 5, 24.00, 2, 0.015, 5, TRUE, 8, 1, 'lb', 1, 1.00, TRUE),   -- Duck Breast
(515, 515, 502, 5, 28.00, 2, 0.010, 5, TRUE, 6, 1, 'lb', 1, 1.00, TRUE),   -- Lamb Rack
(516, 516, 502, 5, 22.00, 2, 0.020, 3, TRUE, 8, 1, 'lb', 1, 1.00, TRUE),   -- Sea Bass Fillet
(517, 517, 502, 5, 4.00, 2, 0.005, 5, TRUE, 10, 1, 'lb', 1, 1.00, TRUE),   -- Veal Bones
(518, 518, 502, 5, 6.00, 2, 0.010, 7, TRUE, 8, 1, 'qt', 1, 1.00, TRUE),    -- Chicken Stock

-- Artisan Dairy (supplier 503)
(519, 519, 503, 5, 12.00, 1, 0.010, 30, TRUE, 10, 1, 'lb', 1, 1.00, TRUE), -- European Butter
(520, 520, 503, 5, 8.00, 1, 0.030, 10, TRUE, 8, 1, 'qt', 1, 1.00, TRUE),   -- Heavy Cream
(521, 521, 503, 5, 18.00, 1, 0.010, 45, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),  -- Gruyere Cheese
(522, 522, 503, 5, 22.00, 1, 0.005, 60, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),  -- Parmesan Reggiano
(523, 523, 503, 5, 10.00, 1, 0.040, 14, TRUE, 5, 1, 'lb', 1, 1.00, TRUE),  -- Creme Fraiche

-- Fine Foods Distributor (supplier 504)
(511, 511, 504, 5, 0.40, 3, 0.002, 365, TRUE, 32, 1, 'oz', 1, 1.00, TRUE), -- Red Wine Vinegar
(512, 512, 504, 5, 0.80, 3, 0.002, 365, TRUE, 64, 1, 'oz', 1, 1.00, TRUE), -- Olive Oil EV
(524, 524, 504, 5, 8.00, 3, 0.005, 180, TRUE, 4, 1, 'oz', 1, 1.00, TRUE),  -- Black Truffle Oil
(525, 525, 504, 5, 3.00, 3, 0.002, 365, TRUE, 16, 1, 'oz', 1, 1.00, TRUE), -- Aged Balsamic
(526, 526, 504, 5, 0.30, 3, 0.002, 365, TRUE, 16, 1, 'oz', 1, 1.00, TRUE), -- Dijon Mustard
(527, 527, 504, 5, 0.80, 3, 0.002, 365, TRUE, 8, 1, 'oz', 1, 1.00, TRUE),  -- Capers
(528, 528, 504, 5, 2.00, 3, 0.001, 730, TRUE, 8, 1, 'oz', 1, 1.00, TRUE),  -- Fleur de Sel
(529, 529, 504, 5, 0.60, 3, 0.001, 730, TRUE, 8, 1, 'oz', 1, 1.00, TRUE),  -- Black Peppercorns
(530, 530, 504, 5, 0.50, 3, 0.005, 180, TRUE, 32, 1, 'oz', 1, 1.00, TRUE); -- Dry Red Wine

-- ============================================================================
-- BATCH RECIPES (4 batches with nesting: Chimichurri uses Garlic Confit)
-- ============================================================================
INSERT INTO batch_recipes (
    batch_recipe_id, restaurant_id, name, description, yield_quantity,
    yield_unit, estimated_prep_time_minutes, shelf_life_days
) VALUES
(501, 5, 'Garlic Confit', 'Slow-roasted garlic in olive oil', 2.00, 'cups', 90, 14),
(502, 5, 'Demi-Glace', 'Classic French brown sauce reduction', 4.00, 'cups', 480, 7),
(503, 5, 'Herb Chimichurri', 'Fresh herb sauce with garlic confit', 3.00, 'cups', 15, 5),
(504, 5, 'Truffle Butter', 'Compound butter with black truffle oil', 2.00, 'lb', 20, 14);

-- ============================================================================
-- BATCH RECIPE INGREDIENTS (new schema with ingredient_type and reference_id)
-- ============================================================================
INSERT INTO batch_recipe_ingredients (
    batch_recipe_ingredient_id, batch_recipe_id, restaurant_id, reference_id,
    ingredient_type, quantity_used, unit
) VALUES
-- Garlic Confit (batch 501) - raw ingredients
(501, 501, 5, 501, 'ingredient', 1.00, 'lb'),     -- Garlic
(502, 501, 5, 512, 'ingredient', 16.00, 'oz'),    -- Olive Oil EV
(503, 501, 5, 503, 'ingredient', 2.00, 'bunch'),  -- Fresh Thyme

-- Demi-Glace (batch 502) - raw ingredients
(504, 502, 5, 517, 'ingredient', 10.00, 'lb'),    -- Veal Bones
(505, 502, 5, 530, 'ingredient', 32.00, 'oz'),    -- Dry Red Wine
(506, 502, 5, 502, 'ingredient', 0.50, 'lb'),     -- Shallots
(507, 502, 5, 518, 'ingredient', 4.00, 'qt'),     -- Chicken Stock

-- Herb Chimichurri (batch 503) - uses Garlic Confit (nested batch!)
(508, 503, 5, 505, 'ingredient', 4.00, 'bunch'),  -- Italian Parsley
(509, 503, 5, 504, 'ingredient', 2.00, 'bunch'),  -- Fresh Rosemary
(510, 503, 5, 501, 'batch', 0.50, 'cups'),        -- Garlic Confit (reference to batch 501!)
(511, 503, 5, 511, 'ingredient', 4.00, 'oz'),     -- Red Wine Vinegar
(512, 503, 5, 512, 'ingredient', 8.00, 'oz'),     -- Olive Oil EV

-- Truffle Butter (batch 504) - raw ingredients
(513, 504, 5, 519, 'ingredient', 2.00, 'lb'),     -- European Butter
(514, 504, 5, 524, 'ingredient', 2.00, 'oz'),     -- Black Truffle Oil
(515, 504, 5, 528, 'ingredient', 0.50, 'oz');     -- Fleur de Sel

-- ============================================================================
-- RECIPES (4 recipes for fine dining)
-- ============================================================================
INSERT INTO recipes (recipe_id, restaurant_id, name, description) VALUES
(501, 5, 'Prime Ribeye', 'Pan-seared ribeye with demi-glace'),
(502, 5, 'Duck Breast', 'Pan-roasted duck with herb chimichurri'),
(503, 5, 'Lamb Rack', 'Herb-crusted lamb with truffle butter'),
(504, 5, 'Sea Bass', 'Pan-seared sea bass with garlic confit');

-- ============================================================================
-- RECIPE INGREDIENTS (uses both raw ingredients and batch outputs)
-- ============================================================================
INSERT INTO recipe_ingredients (
    recipe_ingredient_id, recipe_id, restaurant_id, reference_id,
    ingredient_type, quantity_used, unit, fallback_ingredient_id
) VALUES
-- Prime Ribeye (recipe 501)
(501, 501, 5, 513, 'ingredient', 1.00, 'lb', NULL),   -- Prime Ribeye
(502, 501, 5, 502, 'batch', 0.25, 'cups', NULL),      -- Demi-Glace
(503, 501, 5, 507, 'ingredient', 0.50, 'lb', NULL),   -- Fingerling Potatoes
(504, 501, 5, 519, 'ingredient', 0.10, 'lb', NULL),   -- European Butter

-- Duck Breast (recipe 502)
(505, 502, 5, 514, 'ingredient', 0.75, 'lb', NULL),   -- Duck Breast
(506, 502, 5, 503, 'batch', 0.25, 'cups', NULL),      -- Herb Chimichurri
(507, 502, 5, 506, 'ingredient', 0.15, 'lb', NULL),   -- Baby Arugula
(508, 502, 5, 525, 'ingredient', 1.00, 'oz', NULL),   -- Aged Balsamic

-- Lamb Rack (recipe 503)
(509, 503, 5, 515, 'ingredient', 1.00, 'lb', NULL),   -- Lamb Rack
(510, 503, 5, 504, 'batch', 0.15, 'lb', NULL),        -- Truffle Butter
(511, 503, 5, 504, 'ingredient', 1.00, 'bunch', NULL),-- Fresh Rosemary
(512, 503, 5, 508, 'ingredient', 0.25, 'lb', NULL),   -- Cremini Mushrooms

-- Sea Bass (recipe 504)
(513, 504, 5, 516, 'ingredient', 0.50, 'lb', NULL),   -- Sea Bass Fillet
(514, 504, 5, 501, 'batch', 0.25, 'cups', NULL),      -- Garlic Confit
(515, 504, 5, 509, 'ingredient', 2.00, 'each', NULL), -- Lemons
(516, 504, 5, 510, 'ingredient', 0.25, 'bunch', NULL);-- Chives

-- ============================================================================
-- MENU ITEMS
-- ============================================================================
INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) VALUES
(501, 5, 'Prime Ribeye', 58.00, 'Entrees', TRUE),
(502, 5, 'Pan-Roasted Duck', 42.00, 'Entrees', TRUE),
(503, 5, 'Herb-Crusted Lamb', 52.00, 'Entrees', TRUE),
(504, 5, 'Pan-Seared Sea Bass', 38.00, 'Entrees', TRUE);

-- ============================================================================
-- MENU ITEM RECIPES
-- ============================================================================
INSERT INTO menu_item_recipes (menu_item_id, recipe_id, restaurant_id) VALUES
(501, 501, 5),  -- Prime Ribeye -> Prime Ribeye recipe
(502, 502, 5),  -- Pan-Roasted Duck -> Duck Breast recipe
(503, 503, 5),  -- Herb-Crusted Lamb -> Lamb Rack recipe
(504, 504, 5);  -- Pan-Seared Sea Bass -> Sea Bass recipe

-- ============================================================================
-- INVENTORY (34 rows: 30 ingredients + 4 batches)
-- ============================================================================
INSERT INTO inventory (
    inventory_id, restaurant_id, ingredient_id, quantity_on_hand, min_stock_level,
    last_delivery_date, spoilage_expected_date, shelf_life_days, spoilage_rate,
    last_audit_timestamp, last_audit_quantity, unit
) VALUES
-- Produce
(501, 5, 501, 8.00, 3.00, '2025-12-23', '2026-01-22', 30, 0.010, '2025-12-24 07:00:00', 8.00, 'lb'),
(502, 5, 502, 5.00, 2.00, '2025-12-23', '2026-01-13', 21, 0.020, '2025-12-24 07:00:00', 5.00, 'lb'),
(503, 5, 503, 10.00, 4.00, '2025-12-24', '2025-12-29', 5, 0.100, '2025-12-24 07:00:00', 10.00, 'bunch'),
(504, 5, 504, 10.00, 4.00, '2025-12-24', '2025-12-29', 5, 0.100, '2025-12-24 07:00:00', 10.00, 'bunch'),
(505, 5, 505, 12.00, 5.00, '2025-12-24', '2025-12-29', 5, 0.100, '2025-12-24 07:00:00', 12.00, 'bunch'),
(506, 5, 506, 8.00, 3.00, '2025-12-24', '2025-12-29', 5, 0.080, '2025-12-24 07:00:00', 8.00, 'lb'),
(507, 5, 507, 20.00, 8.00, '2025-12-23', '2026-01-06', 14, 0.020, '2025-12-24 07:00:00', 20.00, 'lb'),
(508, 5, 508, 10.00, 4.00, '2025-12-23', '2025-12-30', 7, 0.050, '2025-12-24 07:00:00', 10.00, 'lb'),
(509, 5, 509, 30.00, 10.00, '2025-12-23', '2026-01-13', 21, 0.020, '2025-12-24 07:00:00', 30.00, 'each'),
(510, 5, 510, 8.00, 3.00, '2025-12-24', '2025-12-29', 5, 0.100, '2025-12-24 07:00:00', 8.00, 'bunch'),
(511, 5, 511, 40.00, 16.00, '2025-12-15', '2026-12-15', 365, 0.002, '2025-12-24 07:00:00', 40.00, 'oz'),
(512, 5, 512, 80.00, 32.00, '2025-12-15', '2026-12-15', 365, 0.002, '2025-12-24 07:00:00', 80.00, 'oz'),
-- Proteins
(513, 5, 513, 15.00, 6.00, '2025-12-23', '2025-12-28', 5, 0.010, '2025-12-24 07:00:00', 15.00, 'lb'),
(514, 5, 514, 10.00, 4.00, '2025-12-23', '2025-12-28', 5, 0.015, '2025-12-24 07:00:00', 10.00, 'lb'),
(515, 5, 515, 8.00, 3.00, '2025-12-23', '2025-12-28', 5, 0.010, '2025-12-24 07:00:00', 8.00, 'lb'),
(516, 5, 516, 8.00, 3.00, '2025-12-24', '2025-12-27', 3, 0.020, '2025-12-24 07:00:00', 8.00, 'lb'),
(517, 5, 517, 10.00, 4.00, '2025-12-23', '2025-12-28', 5, 0.005, '2025-12-24 07:00:00', 10.00, 'lb'),
(518, 5, 518, 10.00, 4.00, '2025-12-23', '2025-12-30', 7, 0.010, '2025-12-24 07:00:00', 10.00, 'qt'),
-- Dairy
(519, 5, 519, 10.00, 4.00, '2025-12-20', '2026-01-19', 30, 0.010, '2025-12-24 07:00:00', 10.00, 'lb'),
(520, 5, 520, 8.00, 3.00, '2025-12-23', '2026-01-02', 10, 0.030, '2025-12-24 07:00:00', 8.00, 'qt'),
(521, 5, 521, 5.00, 2.00, '2025-12-20', '2026-02-03', 45, 0.010, '2025-12-24 07:00:00', 5.00, 'lb'),
(522, 5, 522, 5.00, 2.00, '2025-12-20', '2026-02-18', 60, 0.005, '2025-12-24 07:00:00', 5.00, 'lb'),
(523, 5, 523, 4.00, 2.00, '2025-12-23', '2026-01-06', 14, 0.040, '2025-12-24 07:00:00', 4.00, 'lb'),
-- Specialty
(524, 5, 524, 8.00, 2.00, '2025-12-15', '2026-06-13', 180, 0.005, '2025-12-24 07:00:00', 8.00, 'oz'),
(525, 5, 525, 16.00, 8.00, '2025-12-15', '2026-12-15', 365, 0.002, '2025-12-24 07:00:00', 16.00, 'oz'),
(526, 5, 526, 20.00, 8.00, '2025-12-15', '2026-12-15', 365, 0.002, '2025-12-24 07:00:00', 20.00, 'oz'),
(527, 5, 527, 10.00, 4.00, '2025-12-15', '2026-12-15', 365, 0.002, '2025-12-24 07:00:00', 10.00, 'oz'),
(528, 5, 528, 8.00, 4.00, '2025-12-15', '2027-12-15', 730, 0.001, '2025-12-24 07:00:00', 8.00, 'oz'),
(529, 5, 529, 8.00, 4.00, '2025-12-15', '2027-12-15', 730, 0.001, '2025-12-24 07:00:00', 8.00, 'oz'),
(530, 5, 530, 64.00, 24.00, '2025-12-15', '2026-06-13', 180, 0.005, '2025-12-24 07:00:00', 64.00, 'oz'),
-- Batch outputs
(531, 5, NULL, 1.50, 0.50, '2025-12-24', '2026-01-07', 14, 0.020, '2025-12-24 10:00:00', 1.50, 'cups'),
(532, 5, NULL, 2.00, 1.00, '2025-12-24', '2025-12-31', 7, 0.030, '2025-12-24 14:00:00', 2.00, 'cups'),
(533, 5, NULL, 2.00, 0.75, '2025-12-24', '2025-12-29', 5, 0.050, '2025-12-24 10:30:00', 2.00, 'cups'),
(534, 5, NULL, 1.50, 0.50, '2025-12-24', '2026-01-07', 14, 0.020, '2025-12-24 11:00:00', 1.50, 'lb');

-- ============================================================================
-- INVENTORY LOTS
-- ============================================================================
INSERT INTO inventory_lots (
    lot_id, inventory_id, restaurant_id, ingredient_supplier_id,
    delivery_date, spoilage_expected_date, quantity, total_received, unit,
    ingredient_id, batch_recipe_id, status
) VALUES
-- Raw ingredient lots
(501, 501, 5, 501, '2025-12-23', '2026-01-22', 8.00, 8.00, 'lb', 501, NULL, 'available'),
(502, 513, 5, 513, '2025-12-23', '2025-12-28', 15.00, 15.00, 'lb', 513, NULL, 'available'),
(503, 514, 5, 514, '2025-12-23', '2025-12-28', 10.00, 10.00, 'lb', 514, NULL, 'available'),
(504, 515, 5, 515, '2025-12-23', '2025-12-28', 8.00, 8.00, 'lb', 515, NULL, 'available'),
(505, 516, 5, 516, '2025-12-24', '2025-12-27', 8.00, 8.00, 'lb', 516, NULL, 'available'),
(506, 519, 5, 519, '2025-12-20', '2026-01-19', 10.00, 10.00, 'lb', 519, NULL, 'available'),

-- Batch-produced lots (NULL ingredient_supplier_id)
(507, 531, 5, NULL, '2025-12-24', '2026-01-07', 1.50, 1.50, 'cups', NULL, 501, 'available'),  -- Garlic Confit
(508, 532, 5, NULL, '2025-12-24', '2025-12-31', 2.00, 2.00, 'cups', NULL, 502, 'available'),  -- Demi-Glace
(509, 533, 5, NULL, '2025-12-24', '2025-12-29', 2.00, 2.00, 'cups', NULL, 503, 'available'),  -- Herb Chimichurri
(510, 534, 5, NULL, '2025-12-24', '2026-01-07', 1.50, 1.50, 'lb', NULL, 504, 'available');   -- Truffle Butter

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
INSERT INTO purchase_orders (
    order_id, restaurant_id, supplier_id, order_date, expected_delivery_date,
    actual_delivery_date, status, total_order_price, notes
) VALUES
(501, 5, 501, '2025-12-22', '2025-12-23', '2025-12-23', 'received', 180.00, 'Weekly produce'),
(502, 5, 502, '2025-12-22', '2025-12-24', NULL, 'in_transit', 420.00, 'Protein order'),
(503, 5, 503, '2025-12-23', '2025-12-24', NULL, 'pending', 165.00, 'Dairy restock');

-- ============================================================================
-- PURCHASE ORDER ITEMS
-- ============================================================================
INSERT INTO purchase_order_items (
    order_item_id, restaurant_id, order_id, ingredient_id, ingredient_supplier_id,
    quantity_ordered, unit, unit_price, total_item_price
) VALUES
-- PO 501 (Premium Produce)
(501, 5, 501, 501, 501, 5.00, 'lb', 8.00, 40.00),     -- Garlic
(502, 5, 501, 505, 505, 12.00, 'bunch', 2.50, 30.00), -- Italian Parsley
(503, 5, 501, 507, 507, 20.00, 'lb', 4.00, 80.00),    -- Fingerling Potatoes
(504, 5, 501, 509, 509, 30.00, 'each', 0.50, 15.00),  -- Lemons
-- PO 502 (Heritage Meats)
(505, 5, 502, 513, 513, 10.00, 'lb', 32.00, 320.00),  -- Prime Ribeye
(506, 5, 502, 514, 514, 5.00, 'lb', 24.00, 120.00),   -- Duck Breast
-- PO 503 (Artisan Dairy)
(507, 5, 503, 519, 519, 10.00, 'lb', 12.00, 120.00),  -- European Butter
(508, 5, 503, 523, 523, 5.00, 'lb', 10.00, 50.00);    -- Creme Fraiche

-- ============================================================================
-- INVENTORY USAGE LOG
-- ============================================================================
INSERT INTO inventory_usage_log (
    usage_id, restaurant_id, inventory_id, lot_id, ingredient_id,
    used_quantity, unit, used_date, usage_type, reference_type, reference_id, notes
) VALUES
-- Garlic Confit batch production
(501, 5, 501, 501, 501, 1.00, 'lb', '2025-12-24 09:00:00', 'batch_production', 'batch', 501, 'Garlic Confit prep'),
(502, 5, 512, NULL, 512, 16.00, 'oz', '2025-12-24 09:00:00', 'batch_production', 'batch', 501, 'Garlic Confit prep'),
-- Garlic Confit output
(503, 5, 531, 507, 501, 2.00, 'cups', '2025-12-24 10:00:00', 'batch_output', 'batch', 501, 'Garlic Confit output'),
-- Chimichurri batch production (uses Garlic Confit!)
(504, 5, 505, NULL, 505, 4.00, 'bunch', '2025-12-24 10:15:00', 'batch_production', 'batch', 503, 'Chimichurri prep'),
(505, 5, 531, 507, 501, 0.50, 'cups', '2025-12-24 10:15:00', 'batch_production', 'batch', 503, 'Chimichurri - garlic confit'),
-- Chimichurri output
(506, 5, 533, 509, 505, 3.00, 'cups', '2025-12-24 10:30:00', 'batch_output', 'batch', 503, 'Chimichurri output'),
-- Sale deductions
(507, 5, 513, 502, 513, 1.00, 'lb', '2025-12-24 18:30:00', 'sale', 'sale', 501, 'Prime Ribeye order'),
(508, 5, 532, 508, 517, 0.25, 'cups', '2025-12-24 18:30:00', 'sale', 'sale', 501, 'Demi-glace for ribeye'),
-- Waste
(509, 5, 506, NULL, 506, 0.50, 'lb', '2025-12-24 22:00:00', 'waste', 'waste_report', 1, 'Wilted arugula');

-- ============================================================================
-- SAMPLE ORDERS
-- ============================================================================
INSERT INTO orders (
    order_id, restaurant_id, external_id, employee_id, order_timestamp,
    order_status, sales_channel, subtotal, tax, discount, total,
    order_metadata, inventory_deduction_state
) VALUES
(501, 5, NULL, 505, '2025-12-24 13:00:00', 'completed', 'in-house', 44.00, 2.64, 0.00, 46.64, '{}', 'completed'),
(502, 5, NULL, 505, '2025-12-24 12:30:00', 'completed', 'in-house', 35.50, 2.13, 0.00, 37.63, '{}', 'completed'),
(503, 5, NULL, 505, '2025-12-24 19:15:00', 'completed', 'in-house', 27.50, 1.65, 0.00, 29.15, '{}', 'completed'),
(504, 5, NULL, 505, '2025-12-24 19:45:00', 'open', 'in-house', 58.00, 3.48, 0.00, 61.48, '{}', 'pending'),
(505, 5, NULL, 502, '2025-12-24 20:00:00', 'preparing', 'in-house', 100.00, 6.00, 0.00, 106.00, '{}', 'pending'),
(506, 5, NULL, 505, '2025-12-24 17:45:00', 'cancelled', 'in-house', 23.00, 1.38, 0.00, 24.38, '{"cancellation_reason": "Customer no-show"}', 'pending');

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
INSERT INTO order_items (
    order_item_id, order_id, restaurant_id, menu_item_id, quantity,
    unit_price, line_total, instructions, recipe_snapshot
) VALUES
-- Order 501: Sea Bass + Chimichurri
(5101, 501, 5, 504, 1, 38.00, 38.00, 'Extra lemon', NULL),
(5102, 501, 5, 504, 1, 6.00, 6.00, NULL, NULL),  -- Note: might be side or extra

-- Order 502: Duck + Lamb dessert
(5103, 502, 5, 502, 1, 42.00, 42.00, NULL, NULL),

-- Order 503: Ribeye with special instructions
(5104, 503, 5, 501, 1, 58.00, 58.00, 'Medium rare, extra chimichurri', NULL),

-- Order 504: Currently open - Ribeye
(5105, 504, 5, 501, 1, 58.00, 58.00, 'Rare', NULL),

-- Order 505: Large party - multiple items
(5106, 505, 5, 501, 1, 58.00, 58.00, NULL, NULL),
(5107, 505, 5, 502, 1, 42.00, 42.00, NULL, NULL),

-- Order 506: Cancelled
(5108, 506, 5, 502, 1, 42.00, 42.00, NULL, NULL);

-- =========================================================================
-- SALES (mirror order_items for sales reporting table)
-- =========================================================================
INSERT INTO sales (
    sale_id, restaurant_id, sale_timestamp, menu_item_id, quantity_sold, sales_channel
) VALUES
-- Order 501 (2025-12-24 13:00:00)
(5001, 5, '2025-12-24 13:00:00', 504, 1, 'in-house'),
(5002, 5, '2025-12-24 13:00:00', 504, 1, 'in-house'),
-- Order 502 (2025-12-24 12:30:00)
(5003, 5, '2025-12-24 12:30:00', 502, 1, 'in-house'),
-- Order 503 (2025-12-24 19:15:00)
(5004, 5, '2025-12-24 19:15:00', 501, 1, 'in-house'),
-- Order 504 (2025-12-24 19:45:00)
(5005, 5, '2025-12-24 19:45:00', 501, 1, 'in-house'),
-- Order 505 (2025-12-24 20:00:00)
(5006, 5, '2025-12-24 20:00:00', 501, 1, 'in-house'),
(5007, 5, '2025-12-24 20:00:00', 502, 1, 'in-house'),
-- Order 506 (2025-12-24 17:45:00) – cancelled order still logged for history
(5008, 5, '2025-12-24 17:45:00', 502, 1, 'in-house');

-- ============================================================================
-- ORDER ITEM MODIFIERS (Master tier has modifier support)
-- Note: target_type uses 'ingredient' or 'modifier', not 'batch'
-- ============================================================================
INSERT INTO order_item_modifiers (
    modifier_id, order_item_id, restaurant_id, mod_type, target_type,
    reference_id, quantity, unit, note
) VALUES
(501, 5102, 5, 'remove', 'ingredient', 503, 1.00, NULL, 'No chimichurri'),
(502, 5103, 5, 'add', 'ingredient', 501, 1.00, NULL, 'Extra garlic confit');

-- ============================================================================
-- PAYMENTS (Master tier has full payment processing)
-- ============================================================================
INSERT INTO payments (
    payment_id, order_id, restaurant_id, payment_timestamp, amount,
    tip_amount, cash_tendered, change_given, terminal_reader_id,
    currency, method, provider, provider_payment_id, status, payment_metadata
) VALUES
(501, 501, 5, '2025-12-24 13:15:00', 46.64, 8.00, NULL, NULL, 501,
 'USD', 'card', 'stripe', 'pi_501_test', 'succeeded', '{}'),
(502, 502, 5, '2025-12-24 12:45:00', 37.63, 6.00, NULL, NULL, 501,
 'USD', 'card', 'stripe', 'pi_502_test', 'succeeded', '{}'),
(503, 503, 5, '2025-12-24 19:30:00', 29.15, 5.00, NULL, NULL, 501,
 'USD', 'card', 'stripe', 'pi_503_test', 'succeeded', '{}'),
(504, 506, 5, '2025-12-24 18:00:00', 24.38, 0.00, NULL, NULL, 501,
 'USD', 'card', 'stripe', 'pi_504_test', 'refunded', '{"refund_reason": "Order cancelled"}');

-- ============================================================================
-- DEVICES (Master tier has device management)
-- ============================================================================
INSERT INTO devices (
    device_id, restaurant_id, name, device_type, device_metadata, device_settings,
    device_fingerprint
) VALUES
(501, 5, 'Kitchen Display 1', 'kitchen_display',
 '{"location": "main_kitchen", "screen_size": "24inch"}',
 '{"screen_timeout": 300, "order_alert_sound": true}',
 'kds-001-perrine'),
(502, 5, 'Counter POS', 'pos_terminal',
 '{"location": "front_counter"}',
 '{"receipt_printer": true, "cash_drawer": true}',
 'pos-001-perrine'),
(503, 5, 'Manager Tablet', 'management',
 '{"location": "office"}',
 '{}',
 'mgr-001-perrine');

-- ============================================================================
-- STRIPE TERMINAL READERS (Master tier with internal POS)
-- ============================================================================
INSERT INTO stripe_terminal_readers (
    reader_id, restaurant_id, stripe_reader_id, label, device_type,
    serial_number, status, ip_address, last_seen_at, registered_at
) VALUES
(501, 5, 'tmr_perrine_001', 'Counter Reader', 'bbpos_wisepos_e',
 'WPEPOS-001-PERRINE', 'online', '192.168.1.100', '2025-12-24 20:00:00', '2024-06-01 10:00:00');

-- ============================================================================
-- SUPPLIER PREFERENCES (Master tier - no supplier_preference_id, restaurant_id is PK)
-- ============================================================================
INSERT INTO supplier_preferences (
    restaurant_id, weight_cost, weight_lead_time, weight_spoilage, weight_rating
) VALUES
(5, 0.35, 0.25, 0.20, 0.20);

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
-- - Master tier includes: all Pro features + devices, payments, modifiers, POS
-- - Herb Chimichurri batch references Garlic Confit batch (nested batch support)
-- - Batch-produced inventory lots have NULL ingredient_supplier_id
-- - Stripe terminal reader is configured for internal POS mode
-- - order_item_modifiers.target_type uses 'ingredient' not 'batch' per ORM enum
-- ============================================================================
