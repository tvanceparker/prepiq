-- Migration 0016: Add assistant settings secret fields to restaurants table

ALTER TABLE restaurants
ADD COLUMN assistant_openai_api_key TEXT NULL AFTER pos_mode,
ADD COLUMN assistant_openai_api_key_last4 VARCHAR(4) NULL AFTER assistant_openai_api_key,
ADD COLUMN assistant_openai_api_key_updated_at DATETIME NULL AFTER assistant_openai_api_key_last4;