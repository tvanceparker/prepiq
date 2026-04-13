-- Migration 0012: expand recipe_ingredients to support nested recipe references
-- This mirrors the polymorphic reference pattern already used by batch_recipe_ingredients.

CREATE TABLE IF NOT EXISTS recipe_ingredients_backup AS
SELECT * FROM recipe_ingredients;

ALTER TABLE recipe_ingredients
    DROP FOREIGN KEY fk_reference_to_ingredients,
    DROP FOREIGN KEY fk_reference_to_batch_recipes;

ALTER TABLE recipe_ingredients
    MODIFY COLUMN ingredient_type ENUM('ingredient', 'batch', 'recipe') NOT NULL DEFAULT 'ingredient';

-- Verification
-- DESCRIBE recipe_ingredients;
-- SELECT COUNT(*) AS total, ingredient_type FROM recipe_ingredients GROUP BY ingredient_type;