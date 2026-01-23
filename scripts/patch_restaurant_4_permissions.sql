-- Patch permissions/roles for restaurant_id=4 to match app defaults (pro tier)
START TRANSACTION;

-- Ensure roles are aligned with defaults
UPDATE roles
SET name = 'Admin', description = 'Admin access'
WHERE role_id = 401 AND restaurant_id = 4;

UPDATE roles
SET name = 'Manager', description = 'Full access'
WHERE role_id = 402 AND restaurant_id = 4;

UPDATE roles
SET name = 'Cook', description = 'Can view and edit orders'
WHERE role_id = 403 AND restaurant_id = 4;

INSERT INTO roles (role_id, restaurant_id, name, description)
SELECT 404, 4, 'Waiter', 'Can view orders only'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_id = 404 AND restaurant_id = 4
);

-- Clear old role-permissions and permissions for restaurant 4
DELETE FROM role_permissions WHERE restaurant_id = 4;
DELETE FROM permissions WHERE restaurant_id = 4;

-- Insert default permissions for pro tier
INSERT INTO permissions (permission_id, restaurant_id, name, description) VALUES
  (401, 4, 'manage_employees', 'Can manage employees'),
  (402, 4, 'upload_sales', 'Can upload sales data'),
  (403, 4, 'alerts', 'Can resolve & fix alerts'),
  (404, 4, 'edit_menu', 'Can edit & create menu items'),
  (405, 4, 'tenant_info', 'Can edit tenant info'),
  (406, 4, 'activity_logs', 'Can view activity logs'),
  (407, 4, 'system_check', 'Can run Sales data check'),
  (408, 4, 'employees', 'Can create & edit employee info'),
  (409, 4, 'roles', 'Can edit roles & permissions'),
  (410, 4, 'restaurant_settings', 'Can edit restaurant settings'),
  (411, 4, 'sales', 'Can create/edit sale info.'),
  (412, 4, 'add_recipe', 'Can add recipes'),
  (413, 4, 'edit_recipe', 'Can edit recipes'),
  (414, 4, 'delete_recipe', 'Can delete recipes'),
  (415, 4, 'add_prep', 'Can add prep items'),
  (416, 4, 'batch_create_recipe', 'Can batch create recipes'),
  (417, 4, 'batch_edit_recipe', 'Can batch edit recipes'),
  (418, 4, 'batch_delete_recipe', 'Can batch delete recipes');

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
  (401, 401, 4), (401, 402, 4), (401, 403, 4), (401, 404, 4), (401, 405, 4),
  (401, 406, 4), (401, 407, 4), (401, 408, 4), (401, 409, 4), (401, 410, 4),
  (401, 411, 4), (401, 412, 4), (401, 413, 4), (401, 414, 4), (401, 415, 4),
  (401, 416, 4), (401, 417, 4), (401, 418, 4);

-- Manager permissions (all except roles)
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
  (402, 401, 4), (402, 402, 4), (402, 403, 4), (402, 404, 4), (402, 405, 4),
  (402, 406, 4), (402, 407, 4), (402, 408, 4), (402, 410, 4), (402, 411, 4),
  (402, 412, 4), (402, 413, 4), (402, 414, 4), (402, 415, 4), (402, 416, 4),
  (402, 417, 4), (402, 418, 4);

-- Cook + Waiter permissions
INSERT INTO role_permissions (role_id, permission_id, restaurant_id) VALUES
  (403, 402, 4), (403, 404, 4),
  (404, 406, 4);

COMMIT;
