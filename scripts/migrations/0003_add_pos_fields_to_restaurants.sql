-- Migration 0003: Add POS and UI configuration fields to restaurants table

-- Add settings JSON column
ALTER TABLE restaurants
ADD COLUMN settings LONGTEXT DEFAULT '{}' AFTER last_eod_run_date;

-- Add pos_mode column (default to 'full' for full app access)
ALTER TABLE restaurants
ADD COLUMN pos_mode VARCHAR(16) DEFAULT 'full' AFTER settings;

-- Add kitchen_mode column (default to 'full' for full kitchen access)
ALTER TABLE restaurants
ADD COLUMN kitchen_mode VARCHAR(16) DEFAULT 'full' AFTER pos_mode;

-- Add ui_layout_size column
ALTER TABLE restaurants
ADD COLUMN ui_layout_size VARCHAR(16) DEFAULT 'auto' AFTER kitchen_mode;
