-- Seed data for Restaurant 3 (Basic Tier)
-- Canyon Rim Grill

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
    3,
    'Canyon Rim Grill',
    '208-555-3300',
    'info@canyonrim.test',
    '1250 Blue Lakes Blvd N',
    'Twin Falls',
    'ID',
    '83301',
    42.5970,
    -114.4597,
    'America/Boise',
    'basic',
    'active',
    '2027-06-25',
    6.00,
    7,
    '["in-house", "takeout", "doordash"]',
    '{"monday":{"open":"11:00","close":"21:00"},"tuesday":{"open":"11:00","close":"21:00"},"wednesday":{"open":"11:00","close":"21:00"},"thursday":{"open":"11:00","close":"21:00"},"friday":{"open":"11:00","close":"22:00"},"saturday":{"open":"11:00","close":"22:00"},"sunday":{"open":"11:00","close":"20:00"}}',
    1,
    45,
    0,
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
    (301, 3, 'view_menu', 'View menu items'),
    (302, 3, 'edit_menu', 'Edit menu items'),
    (303, 3, 'view_orders', 'View orders'),
    (304, 3, 'create_orders', 'Create new orders'),
    (305, 3, 'manage_orders', 'Manage order status'),
    (306, 3, 'view_sales', 'View sales reports'),
    (307, 3, 'view_employees', 'View employee list'),
    (308, 3, 'manage_employees', 'Manage employees'),
    (309, 3, 'view_settings', 'View settings'),
    (310, 3, 'edit_settings', 'Edit settings');

INSERT INTO roles (role_id, restaurant_id, name, description) VALUES
    (301, 3, 'Manager', 'Full access to all features'),
    (302, 3, 'Cashier', 'Order entry, view menu/sales');

INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
    (301, 301, 3), (301, 302, 3), (301, 303, 3), (301, 304, 3), (301, 305, 3),
    (301, 306, 3), (301, 307, 3), (301, 308, 3), (301, 309, 3), (301, 310, 3),
    (302, 301, 3), (302, 303, 3), (302, 304, 3), (302, 305, 3), (302, 306, 3);

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
    (301, 3, 'Marcus Chen', 'marcus@canyonrimgrill.com', 'marcus_canyon',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     1001, 301, 1),
    (302, 3, 'Amy Tran', 'amy@canyonrimgrill.com', 'amy_canyon',
     '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo',
     1002, 302, 1);

INSERT INTO menu_items (menu_item_id, restaurant_id, name, price, category, is_active) VALUES
    (301, 3, 'Canyon Smash Burger', 12.50, 'Burgers', 1),
    (302, 3, 'Hand-Cut Fries', 4.25, 'Sides', 1),
    (303, 3, 'Huckleberry Lemonade', 3.95, 'Drinks', 1),
    (304, 3, 'BBQ Bacon Burger', 14.75, 'Burgers', 1),
    (305, 3, 'Onion Rings', 5.50, 'Sides', 1),
    (306, 3, 'Chocolate Shake', 5.95, 'Drinks', 1);

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
    (301, 3, 302, 'completed', 'skipped', 'in-house', 16.75, 1.01, 17.76),
    (302, 3, 302, 'completed', 'skipped', 'takeout', 12.50, 0.75, 13.25),
    (303, 3, 301, 'completed', 'skipped', 'doordash', 20.70, 1.24, 21.94),
    (304, 3, 302, 'completed', 'skipped', 'in-house', 25.25, 1.52, 26.77),
    (305, 3, 302, 'completed', 'skipped', 'takeout', 19.00, 1.14, 20.14);

INSERT INTO order_items (
    order_item_id,
    order_id,
    restaurant_id,
    menu_item_id,
    quantity,
    unit_price,
    line_total
) VALUES
    (3001, 301, 3, 301, 1, 12.50, 12.50),
    (3002, 301, 3, 302, 1, 4.25, 4.25),
    (3003, 302, 3, 301, 1, 12.50, 12.50),
    (3004, 303, 3, 304, 1, 14.75, 14.75),
    (3005, 303, 3, 303, 1, 3.95, 3.95),
    (3006, 303, 3, 305, 1, 2.00, 2.00),
    (3007, 304, 3, 301, 2, 12.50, 25.00),
    (3008, 304, 3, 302, 1, 4.25, 4.25),
    (3009, 305, 3, 304, 1, 14.75, 14.75),
    (3010, 305, 3, 302, 1, 4.25, 4.25);

COMMIT;
