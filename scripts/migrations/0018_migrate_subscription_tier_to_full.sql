-- Migrate restaurant subscription tiers from legacy basic/pro/master to basic/full.
-- MySQL ENUM columns must temporarily include the new value before updating rows.

ALTER TABLE restaurants
    MODIFY COLUMN subscription_tier ENUM('basic', 'pro', 'master', 'full') NOT NULL DEFAULT 'basic';

UPDATE restaurants
SET subscription_tier = 'full'
WHERE subscription_tier IN ('pro', 'master');

ALTER TABLE restaurants
    MODIFY COLUMN subscription_tier ENUM('basic', 'full') NOT NULL DEFAULT 'basic';
