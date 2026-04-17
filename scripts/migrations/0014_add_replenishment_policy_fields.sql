-- Migration 0014: add cadence-aware replenishment policy fields

ALTER TABLE ingredients
    ADD COLUMN policy_type VARCHAR(32) NULL AFTER max_stock_level,
    ADD COLUMN policy_assignment_mode VARCHAR(16) NULL AFTER policy_type,
    ADD COLUMN target_service_level DECIMAL(5, 4) NULL AFTER policy_assignment_mode,
    ADD COLUMN service_level_z DECIMAL(8, 4) NULL AFTER target_service_level,
    ADD COLUMN policy_override_reason TEXT NULL AFTER service_level_z;

ALTER TABLE ingredient_supplier
    ADD COLUMN review_period_days INT NULL AFTER lead_time_days,
    ADD COLUMN order_schedule_type VARCHAR(32) NULL AFTER review_period_days,
    ADD COLUMN allowed_order_days JSON NULL AFTER order_schedule_type,
    ADD COLUMN allowed_delivery_days JSON NULL AFTER allowed_order_days,
    ADD COLUMN cadence_source VARCHAR(16) NULL AFTER allowed_delivery_days,
    ADD COLUMN cadence_confidence_score DECIMAL(5, 4) NULL AFTER cadence_source;

-- Verification
-- DESCRIBE ingredients;
-- DESCRIBE ingredient_supplier;