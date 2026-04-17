-- Migration 0015: add forecast model strategy metadata

ALTER TABLE forecasts
    ADD COLUMN model_type_used VARCHAR(32) NULL AFTER forecast_version,
    ADD COLUMN model_source VARCHAR(32) NULL AFTER model_type_used,
    ADD COLUMN model_metadata JSON NULL AFTER model_source;

-- Verification
-- DESCRIBE forecasts;