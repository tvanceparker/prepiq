-- Apply once to MySQL before running this version. Take a backup first.
-- Receipt quantities remain physical supplier-unit amounts; never rewrite historical
-- quantities by multiplying pack metadata. Audit old duplicated receipts separately.
ALTER TABLE inventory_usage_log
    MODIFY ingredient_id INT NULL,
    MODIFY reference_type ENUM('sale','order','batch','prep','user','lot','waste_report','eod_sales','other') NULL;
ALTER TABLE inventory_lots
    ADD COLUMN prep_id INT NULL,
    ADD CONSTRAINT fk_inventory_lots_prep FOREIGN KEY (prep_id) REFERENCES prep_schedule(prep_id),
    ADD UNIQUE KEY uq_inventory_lots_prep (restaurant_id, prep_id);
ALTER TABLE purchase_order_items
    ADD COLUMN pack_quantity DECIMAL(10,2) NULL,
    ADD COLUMN pack_count INT NULL;
ALTER TABLE ingredient_supplier ADD COLUMN order_schedule_anchor_date DATE NULL;
ALTER TABLE forecast_run_ledger ADD COLUMN result_snapshot JSON NULL;

ALTER TABLE eod_purchase_order_suggestions ADD COLUMN suggestion_snapshot JSON NULL;

ALTER TABLE sales ADD COLUMN business_date DATE NULL, ADD INDEX ix_sales_business_date (business_date);
ALTER TABLE inventory_usage_log ADD COLUMN business_date DATE NULL, ADD INDEX ix_usage_business_date (business_date);
-- NULL legacy dates retain their previous DATE(timestamp) behavior. Reconcile
-- old POS UTC timestamps against tenant hours before backfilling business_date.

ALTER TABLE forecast_breakdown MODIFY forecasted_quantity DECIMAL(16,6) NOT NULL;

CREATE TABLE waste_reports (
 report_id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
 restaurant_id INTEGER NOT NULL,
 request_key VARCHAR(64) NOT NULL,
 payload JSON NOT NULL,
 result JSON NULL,
 CONSTRAINT uq_waste_report_request UNIQUE (restaurant_id, request_key),
 FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
);
ALTER TABLE inventory MODIFY quantity_on_hand DECIMAL(16,6) NULL;
ALTER TABLE inventory MODIFY last_audit_quantity DECIMAL(16,6) NULL;
ALTER TABLE inventory_lots MODIFY quantity DECIMAL(16,6) NOT NULL;
ALTER TABLE inventory_lots MODIFY total_received DECIMAL(16,6) NOT NULL;
ALTER TABLE inventory_usage_log MODIFY used_quantity DECIMAL(16,6) NOT NULL;
ALTER TABLE recipe_ingredients MODIFY quantity_used DECIMAL(16,6) NOT NULL;
ALTER TABLE batch_recipe_ingredients MODIFY quantity_used DECIMAL(16,6) NULL;
ALTER TABLE batch_recipes MODIFY yield_quantity DECIMAL(16,6) NULL;
ALTER TABLE purchase_order_items MODIFY pack_quantity DECIMAL(16,6) NULL;
ALTER TABLE purchase_order_items MODIFY quantity_ordered DECIMAL(16,6) NULL;
ALTER TABLE purchase_order_items MODIFY quantity_received DECIMAL(16,6) NULL;
ALTER TABLE ingredient_forecast_breakdown MODIFY quantity DECIMAL(16,6) NULL;

ALTER TABLE daily_forecast_accuracy MODIFY predicted_quantity DECIMAL(16,6) NULL, MODIFY forecast_error DECIMAL(16,6) NULL;

ALTER TABLE prep_schedule MODIFY quantity_needed DECIMAL(16,6) NULL, MODIFY quantity_prepped DECIMAL(16,6) NULL, MODIFY prep_batch_count DECIMAL(16,6) NULL;
ALTER TABLE batch_recipe_forecast_breakdown MODIFY quantity DECIMAL(16,6) NOT NULL;

ALTER TABLE ingredient_supplier MODIFY min_order_quantity DECIMAL(16,6) NULL, MODIFY quantity_per_pack_item DECIMAL(16,6) NULL;
ALTER TABLE eod_purchase_order_suggestions
 MODIFY lead_demand DECIMAL(16,6) NOT NULL DEFAULT 0,
 MODIFY shelf_demand DECIMAL(16,6) NOT NULL DEFAULT 0,
 MODIFY converted_quantity_needed DECIMAL(16,6) NOT NULL DEFAULT 0,
 MODIFY total_quantity_ordered DECIMAL(16,6) NOT NULL DEFAULT 0,
 MODIFY quantity_per_pack_item DECIMAL(16,6) NOT NULL DEFAULT 1,
 MODIFY min_order_quantity DECIMAL(16,6) NOT NULL DEFAULT 0;
