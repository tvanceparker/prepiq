-- Migration 0003: Add nested batch support to batch_recipe_ingredients
-- Also makes inventory_lot.ingredient_supplier_id nullable for batch-produced lots
-- Run this migration against your database before using the updated ORM models

-- ============================================================================
-- STEP 1: Backup existing batch_recipe_ingredients data
-- ============================================================================

CREATE TABLE IF NOT EXISTS batch_recipe_ingredients_backup AS 
SELECT * FROM batch_recipe_ingredients;

-- ============================================================================
-- STEP 2: Drop existing composite primary key and foreign key constraints
-- ============================================================================

-- First, find and drop the foreign key constraints
ALTER TABLE batch_recipe_ingredients 
    DROP FOREIGN KEY batch_recipe_ingredients_ibfk_1,
    DROP FOREIGN KEY batch_recipe_ingredients_ibfk_2,
    DROP FOREIGN KEY batch_recipe_ingredients_ibfk_3;

-- Drop the composite primary key
ALTER TABLE batch_recipe_ingredients DROP PRIMARY KEY;

-- ============================================================================
-- STEP 3: Add new columns and restructure table
-- ============================================================================

-- Add auto-increment primary key
ALTER TABLE batch_recipe_ingredients 
    ADD COLUMN batch_recipe_ingredient_id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- Rename ingredient_id to reference_id
ALTER TABLE batch_recipe_ingredients 
    CHANGE COLUMN ingredient_id reference_id INT NOT NULL;

-- Add ingredient_type enum column
ALTER TABLE batch_recipe_ingredients 
    ADD COLUMN ingredient_type ENUM('ingredient', 'batch') NOT NULL DEFAULT 'ingredient' 
    AFTER reference_id;

-- Add index on batch_recipe_id for faster lookups
ALTER TABLE batch_recipe_ingredients 
    ADD INDEX idx_batch_recipe_id (batch_recipe_id);

-- ============================================================================
-- STEP 4: Re-add foreign key constraints (only for batch_recipe_id and restaurant_id)
-- Note: reference_id is not FK'd because it can point to ingredients OR batch_recipes
-- ============================================================================

ALTER TABLE batch_recipe_ingredients
    ADD CONSTRAINT fk_bri_batch_recipe 
        FOREIGN KEY (batch_recipe_id) REFERENCES batch_recipes(batch_recipe_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_bri_restaurant 
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: Fix inventory_lots to allow NULL ingredient_supplier_id
-- (for batch-produced lots that have no external supplier)
-- ============================================================================

ALTER TABLE inventory_lots 
    MODIFY COLUMN ingredient_supplier_id INT NULL;

-- ============================================================================
-- STEP 6: Verification queries (run these to confirm migration success)
-- ============================================================================

-- Check the new table structure
-- DESCRIBE batch_recipe_ingredients;

-- Verify data was preserved (all existing rows should have ingredient_type='ingredient')
-- SELECT COUNT(*) as total, ingredient_type FROM batch_recipe_ingredients GROUP BY ingredient_type;

-- Verify backup exists
-- SELECT COUNT(*) FROM batch_recipe_ingredients_backup;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
/*
-- To rollback this migration:

-- 1. Drop the modified table
DROP TABLE batch_recipe_ingredients;

-- 2. Restore from backup
CREATE TABLE batch_recipe_ingredients AS SELECT * FROM batch_recipe_ingredients_backup;

-- 3. Re-add original constraints
ALTER TABLE batch_recipe_ingredients
    ADD PRIMARY KEY (batch_recipe_id, ingredient_id),
    ADD CONSTRAINT batch_recipe_ingredients_ibfk_1 
        FOREIGN KEY (batch_recipe_id) REFERENCES batch_recipes(batch_recipe_id),
    ADD CONSTRAINT batch_recipe_ingredients_ibfk_2 
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id),
    ADD CONSTRAINT batch_recipe_ingredients_ibfk_3 
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id);

-- 4. Revert inventory_lots change
ALTER TABLE inventory_lots 
    MODIFY COLUMN ingredient_supplier_id INT NOT NULL;

-- 5. Drop backup table
DROP TABLE batch_recipe_ingredients_backup;
*/
