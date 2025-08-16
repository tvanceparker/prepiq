-- idempotent migration: add latitude and longitude to restaurants
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6) NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6) NULL;
