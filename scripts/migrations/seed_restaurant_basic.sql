-- scripts/migrations/seed_restaurant_basic.sql
-- Seed data for Restaurant ID 3: Canyon Rim Grill (Basic Tier)
-- Basic tier: Menu items + sales only (no ingredients, recipes, inventory)
-- 
-- Run: mysql -u user -p database < scripts/migrations/seed_restaurant_basic.sql
-- After seeding: python scripts/backfill_weather.py --start 2025-06-25 --end 2025-12-24

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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
    3, 'Canyon Rim Grill', '208-555-0103', '567 Canyon View Dr', 'Twin Falls', 'ID', '83301',
    42.5610, -114.4780, 'basic', 'info@canyonrimgrill.com', 'active',
    '2026-12-31', 7,
    '{"mon": {"open": "11:00", "close": "21:00"}, "tue": {"open": "11:00", "close": "21:00"}, "wed": {"open": "11:00", "close": "21:00"}, "thu": {"open": "11:00", "close": "21:00"}, "fri": {"open": "11:00", "close": "22:00"}, "sat": {"open": "11:00", "close": "22:00"}, "sun": {"open": "10:00", "close": "20:00"}}',
    6.00, 'America/Boise', TRUE, 60,
    '["in-house", "take-out"]', NULL,
    '{}', FALSE, FALSE, 'auto',
    'none', FALSE, 'none'
);

-- ============================================================================
-- PERMISSIONS (Basic tier: 10 permissions)
-- ============================================================================
INSERT INTO permissions (permission_id, restaurant_id, name, description) VALUES
(301, 3, 'view_menu', 'View menu items'),
(302, 3, 'view_dashboard', 'View dashboard'),
(303, 3, 'view_orders', 'View orders'),
(304, 3, 'create_orders', 'Create new orders'),
(305, 3, 'view_reports', 'View sales reports'),
(306, 3, 'manage_menu', 'Add/edit/delete menu items'),
(307, 3, 'manage_orders', 'Modify and manage orders'),
(308, 3, 'manage_employees', 'Manage employee records'),
(309, 3, 'manage_settings', 'Manage restaurant settings'),
(310, 3, 'view_employees', 'View employee list');

-- ============================================================================
-- ROLES
-- ============================================================================
INSERT INTO roles (role_id, restaurant_id, name, description) VALUES
(301, 3, 'Owner', 'Full access to all features'),
(302, 3, 'Server', 'Order management and basic views');

-- ============================================================================
-- ROLE_PERMISSIONS
-- ============================================================================
-- Owner gets all permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(301, 301, 3), (301, 302, 3), (301, 303, 3), (301, 304, 3), (301, 305, 3),
(301, 306, 3), (301, 307, 3), (301, 308, 3), (301, 309, 3), (301, 310, 3);

-- Server gets limited permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
(302, 301, 3), (302, 302, 3), (302, 303, 3), (302, 304, 3);

-- ============================================================================
-- EMPLOYEES
-- Password hash is bcrypt of 'password123' - generate fresh hashes in production!
-- ============================================================================
INSERT INTO employees (
    employee_id, restaurant_id, name, role_id, email, username, phone,
    password_hash, hire_date, is_active, login_code, pay_rate, employment_type, preferences
) VALUES
(301, 3, 'Marcus Chen', 301, 'marcus@canyonrimgrill.com', 'marcus_canyon', '208-555-0131',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2022-03-15', TRUE, 1001, 0.00, 'salary', '{}'),
(302, 3, 'Amy Tran', 302, 'amy@canyonrimgrill.com', 'amy_canyon', '208-555-0132',
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4u.VQXXjQXXjQXXj', '2024-01-10', TRUE, 1002, 15.00, 'hourly', '{}');

-- ============================================================================
-- MENU ITEMS (Basic tier: menu items only, no recipes)
-- ============================================================================
INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) VALUES
(301, 3, 'Canyon Burger', 14.99, 'Entrees', TRUE),
(302, 3, 'Grilled Chicken Sandwich', 13.99, 'Entrees', TRUE),
(303, 3, 'Caesar Salad', 11.99, 'Salads', TRUE),
(304, 3, 'French Fries', 4.99, 'Sides', TRUE),
(305, 3, 'Chocolate Brownie', 6.99, 'Desserts', TRUE),
(306, 3, 'Soft Drink', 2.99, 'Beverages', TRUE);

-- ============================================================================
-- SAMPLE ORDERS (for 6 months of historical data, include a few examples)
-- In production, generate programmatically for better coverage
-- ============================================================================
INSERT INTO orders (
    order_id, restaurant_id, external_id, employee_id, order_timestamp,
    order_status, sales_channel, subtotal, tax, discount, total,
    order_metadata, inventory_deduction_state
) VALUES
(301, 3, NULL, 302, '2025-12-24 12:15:00', 'completed', 'in-house', 33.96, 2.04, 0.00, 36.00, '{}', 'completed'),
(302, 3, NULL, 302, '2025-12-24 12:30:00', 'completed', 'in-house', 24.97, 1.50, 0.00, 26.47, '{}', 'completed'),
(303, 3, NULL, 302, '2025-12-24 13:00:00', 'completed', 'take-out', 19.98, 1.20, 0.00, 21.18, '{}', 'completed'),
(304, 3, NULL, 302, '2025-12-24 18:30:00', 'completed', 'in-house', 41.95, 2.52, 0.00, 44.47, '{}', 'completed'),
(305, 3, NULL, 302, '2025-12-24 19:00:00', 'completed', 'in-house', 28.97, 1.74, 0.00, 30.71, '{}', 'completed');

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================
INSERT INTO order_items (
    order_item_id, order_id, restaurant_id, menu_item_id, quantity,
    unit_price, line_total, instructions, recipe_snapshot
) VALUES
-- Order 301: 2 Canyon Burgers + 1 French Fries
(3001, 301, 3, 301, 2, 14.99, 29.98, NULL, NULL),
(3002, 301, 3, 304, 1, 4.99, 4.99, NULL, NULL),

-- Order 302: 1 Grilled Chicken + 1 Caesar Salad + 1 Soft Drink
(3003, 302, 3, 302, 1, 13.99, 13.99, NULL, NULL),
(3004, 302, 3, 303, 1, 11.99, 11.99, NULL, NULL),

-- Order 303: 1 Canyon Burger + 1 French Fries
(3005, 303, 3, 301, 1, 14.99, 14.99, NULL, NULL),
(3006, 303, 3, 304, 1, 4.99, 4.99, NULL, NULL),

-- Order 304: 2 Grilled Chicken + 1 Caesar Salad + 1 Brownie
(3007, 304, 3, 302, 2, 13.99, 27.98, NULL, NULL),
(3008, 304, 3, 303, 1, 11.99, 11.99, NULL, NULL),
(3009, 304, 3, 305, 1, 6.99, 6.99, NULL, NULL),

-- Order 305: 1 Canyon Burger + 1 Caesar Salad + 1 Brownie
(3010, 305, 3, 301, 1, 14.99, 14.99, NULL, NULL),
(3011, 305, 3, 303, 1, 11.99, 11.99, NULL, NULL),
(3012, 305, 3, 305, 1, 6.99, 6.99, NULL, NULL);

-- =========================================================================
-- SALES (mirror order_items for sales reporting table)
-- =========================================================================
INSERT INTO sales (
    sale_id, restaurant_id, sale_timestamp, menu_item_id, quantity_sold, sales_channel
) VALUES
-- Order 301 (2025-12-24 12:15:00)
(3001, 3, '2025-12-24 12:15:00', 301, 2, 'in-house'),
(3002, 3, '2025-12-24 12:15:00', 304, 1, 'in-house'),
-- Order 302 (2025-12-24 12:30:00)
(3003, 3, '2025-12-24 12:30:00', 302, 1, 'in-house'),
(3004, 3, '2025-12-24 12:30:00', 303, 1, 'in-house'),
-- Order 303 (2025-12-24 13:00:00)
(3005, 3, '2025-12-24 13:00:00', 301, 1, 'take-out'),
(3006, 3, '2025-12-24 13:00:00', 304, 1, 'take-out'),
-- Order 304 (2025-12-24 18:30:00)
(3007, 3, '2025-12-24 18:30:00', 302, 2, 'in-house'),
(3008, 3, '2025-12-24 18:30:00', 303, 1, 'in-house'),
(3009, 3, '2025-12-24 18:30:00', 305, 1, 'in-house'),
-- Order 305 (2025-12-24 19:00:00)
(3010, 3, '2025-12-24 19:00:00', 301, 1, 'in-house'),
(3011, 3, '2025-12-24 19:00:00', 303, 1, 'in-house'),
(3012, 3, '2025-12-24 19:00:00', 305, 1, 'in-house');

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
-- - Basic tier does NOT have: ingredients, suppliers, recipes, batches, inventory
-- - Menu items are standalone without recipe linkage
-- ============================================================================
