CREATE TABLE IF NOT EXISTS eod_purchase_order_suggestions (
    suggestion_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    run_date DATE NOT NULL,
    supplier_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    ingredient_supplier_id INT NOT NULL,
    lead_demand DECIMAL(12, 2) NOT NULL DEFAULT 0,
    shelf_demand DECIMAL(12, 2) NOT NULL DEFAULT 0,
    forecast_unit VARCHAR(20) NULL,
    converted_quantity_needed DECIMAL(12, 2) NOT NULL DEFAULT 0,
    suggested_packs_to_order INT NOT NULL DEFAULT 0,
    total_quantity_ordered DECIMAL(12, 2) NOT NULL DEFAULT 0,
    supplier_unit VARCHAR(20) NOT NULL,
    inventory_unit VARCHAR(20) NULL,
    lead_time_days INT NOT NULL DEFAULT 0,
    shelf_life_days INT NOT NULL DEFAULT 0,
    pack_size INT NOT NULL DEFAULT 1,
    quantity_per_pack_item DECIMAL(12, 2) NOT NULL DEFAULT 1,
    min_order_quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
    purchase_order_id INT NULL,
    written_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_eod_po_suggestions_restaurant_date_supplier_ingredient
        UNIQUE (restaurant_id, run_date, supplier_id, ingredient_id),
    CONSTRAINT fk_eod_po_suggestions_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants (restaurant_id),
    CONSTRAINT fk_eod_po_suggestions_supplier
        FOREIGN KEY (supplier_id) REFERENCES supplier (supplier_id),
    CONSTRAINT fk_eod_po_suggestions_ingredient
        FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id),
    CONSTRAINT fk_eod_po_suggestions_ingredient_supplier
        FOREIGN KEY (ingredient_supplier_id) REFERENCES ingredient_supplier (ingredient_supplier_id),
    CONSTRAINT fk_eod_po_suggestions_purchase_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders (order_id)
);

CREATE INDEX ix_eod_po_suggestions_restaurant_run_date
    ON eod_purchase_order_suggestions (restaurant_id, run_date);
