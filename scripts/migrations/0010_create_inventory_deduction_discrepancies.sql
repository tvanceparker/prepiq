CREATE TABLE IF NOT EXISTS inventory_deduction_discrepancies (
    discrepancy_id INT NOT NULL AUTO_INCREMENT,
    restaurant_id INT NOT NULL,
    alert_id INT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'urgent',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_resolved DATETIME NULL,
    item_kind VARCHAR(20) NOT NULL DEFAULT 'unknown',
    ingredient_id INT NULL,
    batch_recipe_id INT NULL,
    item_name VARCHAR(100) NULL,
    unit VARCHAR(20) NULL,
    required_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    available_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    current_quantity_on_hand DECIMAL(10, 2) NOT NULL DEFAULT 0,
    shortfall_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reference_type VARCHAR(50) NULL,
    reference_id INT NULL,
    attempted_day DATE NULL,
    PRIMARY KEY (discrepancy_id),
    KEY ix_inventory_deduction_discrepancies_restaurant_status (restaurant_id, status),
    KEY ix_inventory_deduction_discrepancies_alert_id (alert_id),
    KEY ix_inventory_deduction_discrepancies_ingredient_id (ingredient_id),
    KEY ix_inventory_deduction_discrepancies_batch_recipe_id (batch_recipe_id),
    KEY ix_inventory_deduction_discrepancies_reference (restaurant_id, reference_type, reference_id),
    CONSTRAINT fk_inventory_deduction_discrepancies_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants (restaurant_id),
    CONSTRAINT fk_inventory_deduction_discrepancies_alert
        FOREIGN KEY (alert_id) REFERENCES alerts (alert_id),
    CONSTRAINT fk_inventory_deduction_discrepancies_ingredient
        FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id),
    CONSTRAINT fk_inventory_deduction_discrepancies_batch_recipe
        FOREIGN KEY (batch_recipe_id) REFERENCES batch_recipes (batch_recipe_id)
);