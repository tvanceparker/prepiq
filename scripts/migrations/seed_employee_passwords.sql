-- scripts/migrations/seed_employee_passwords.sql
-- Set argon2id password hashes for all seed employees in restaurants 3, 4, and 5
-- Plaintext: Test!2345
-- Run after seeding the restaurants: mysql -u user -p prepiq < scripts/migrations/seed_employee_passwords.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Single shared hash generated via app.utils.security.get_password_hash("Test!2345")
SET @pwd := '$argon2id$v=19$m=65536,t=3,p=4$m1Nq7b23ttb6P0cIgVDqHQ$4PU2CLuz2Qn0VHvi0hyYHmMr+/cEtgPe7AjlccleUSo';

-- Restaurant 3 (Basic): employees 301-302
UPDATE employees SET password_hash = @pwd WHERE employee_id IN (301, 302);

-- Restaurant 4 (Pro): employees 401-403
UPDATE employees SET password_hash = @pwd WHERE employee_id IN (401, 402, 403);

-- Restaurant 5 (Master): employees 501-505
UPDATE employees SET password_hash = @pwd WHERE employee_id IN (501, 502, 503, 504, 505);

SET FOREIGN_KEY_CHECKS = 1;

-- Optional: verify
-- SELECT employee_id, username, password_hash FROM employees WHERE employee_id IN (301,302,401,402,403,501,502,503,504,505);
