-- Patch permissions/roles for restaurant_id=5 to match app defaults
START TRANSACTION;

-- Ensure roles are aligned with defaults
UPDATE roles
SET name = 'Admin', description = 'Admin access'
WHERE role_id = 501 AND restaurant_id = 5;

UPDATE roles
SET name = 'Manager', description = 'Full access'
WHERE role_id = 502 AND restaurant_id = 5;

UPDATE roles
SET name = 'Cook', description = 'Can view and edit orders'
WHERE role_id = 503 AND restaurant_id = 5;

INSERT INTO roles (role_id, restaurant_id, name, description)
SELECT 504, 5, 'Waiter', 'Can view orders only'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_id = 504 AND restaurant_id = 5
);

-- Clear old role-permissions and permissions for restaurant 5
DELETE FROM role_permissions WHERE restaurant_id = 5;
DELETE FROM permissions WHERE restaurant_id = 5;

-- Insert default permissions for full tier
INSERT INTO permissions (permission_id, restaurant_id, name, description) VALUES
  (501, 5, 'manage_employees', 'Can manage employees'),
  (502, 5, 'upload_sales', 'Can upload sales data'),
  (503, 5, 'alerts', 'Can resolve & fix alerts'),
  (504, 5, 'edit_menu', 'Can edit & create menu items'),
  (505, 5, 'tenant_info', 'Can edit tenant info'),
  (506, 5, 'activity_logs', 'Can view activity logs'),
  (507, 5, 'system_check', 'Can run Sales data check'),
  (508, 5, 'employees', 'Can create & edit employee info'),
  (509, 5, 'roles', 'Can edit roles & permissions'),
  (510, 5, 'restaurant_settings', 'Can edit restaurant settings'),
  (511, 5, 'sales', 'Can create/edit sale info.'),
  (512, 5, 'add_recipe', 'Can add recipes'),
  (513, 5, 'edit_recipe', 'Can edit recipes'),
  (514, 5, 'delete_recipe', 'Can delete recipes'),
  (515, 5, 'add_prep', 'Can add prep items'),
  (516, 5, 'batch_create_recipe', 'Can batch create recipes'),
  (517, 5, 'batch_edit_recipe', 'Can batch edit recipes'),
  (518, 5, 'batch_delete_recipe', 'Can batch delete recipes'),
  (519, 5, 'view_analytics', 'Can view detailed analytics'),
  (520, 5, 'generate_ordering', 'Can generate ordering recommendations');

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
  (501, 501, 5), (501, 502, 5), (501, 503, 5), (501, 504, 5), (501, 505, 5),
  (501, 506, 5), (501, 507, 5), (501, 508, 5), (501, 509, 5), (501, 510, 5),
  (501, 511, 5), (501, 512, 5), (501, 513, 5), (501, 514, 5), (501, 515, 5),
  (501, 516, 5), (501, 517, 5), (501, 518, 5), (501, 519, 5), (501, 520, 5);

-- Manager permissions (all except roles)
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
  (502, 501, 5), (502, 502, 5), (502, 503, 5), (502, 504, 5), (502, 505, 5),
  (502, 506, 5), (502, 507, 5), (502, 508, 5), (502, 510, 5), (502, 511, 5),
  (502, 512, 5), (502, 513, 5), (502, 514, 5), (502, 515, 5), (502, 516, 5),
  (502, 517, 5), (502, 518, 5), (502, 519, 5), (502, 520, 5);

-- Cook + Waiter permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
  (503, 502, 5), (503, 504, 5),
  (504, 506, 5);

-- Align employee role assignments
UPDATE employees
SET role_id = 503
WHERE restaurant_id = 5 AND username = 'maria_perrine';

UPDATE employees
SET role_id = 504
WHERE restaurant_id = 5 AND username IN ('david_perrine', 'sarah_perrine');

COMMIT;
