-- Migration 0013: add archive flags for recipes and batch recipes

ALTER TABLE recipes
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

ALTER TABLE batch_recipes
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;

-- Verification
-- DESCRIBE recipes;
-- DESCRIBE batch_recipes;
-- SELECT COUNT(*) AS total, is_active FROM recipes GROUP BY is_active;
-- SELECT COUNT(*) AS total, is_active FROM batch_recipes GROUP BY is_active;