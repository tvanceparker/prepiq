-- Contract fixture from fd6486b ORM. Unrelated foreign keys are omitted.
-- Legacy String-without-length declarations use VARCHAR(255) for MySQL DDL.

CREATE TABLE batch_recipe_forecast_breakdown (
	batch_breakdown_id INTEGER NOT NULL AUTO_INCREMENT, 
	forecast_id INTEGER NOT NULL, 
	forecast_date DATE NOT NULL, 
	batch_recipe_id INTEGER NOT NULL, 
	quantity DECIMAL(10, 2) NOT NULL, 
	source_menu_item_id INTEGER, 
	restaurant_id INTEGER, 
	created_at DATETIME DEFAULT now(), 
	PRIMARY KEY (batch_breakdown_id)
)

;

CREATE TABLE batch_recipe_ingredients (
	batch_recipe_ingredient_id INTEGER NOT NULL AUTO_INCREMENT, 
	batch_recipe_id INTEGER NOT NULL, 
	restaurant_id INTEGER NOT NULL, 
	reference_id INTEGER NOT NULL, 
	ingredient_type ENUM('ingredient','batch') NOT NULL, 
	quantity_used DECIMAL(10, 2), 
	unit VARCHAR(20), 
	PRIMARY KEY (batch_recipe_ingredient_id)
)

;

CREATE TABLE batch_recipes (
	batch_recipe_id INTEGER NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER NOT NULL, 
	name VARCHAR(100) NOT NULL, 
	description VARCHAR(255), 
	yield_quantity DECIMAL(10, 2), 
	yield_unit VARCHAR(20), 
	estimated_prep_time_minutes INTEGER, 
	shelf_life_days INTEGER, 
	is_active BOOL NOT NULL, 
	PRIMARY KEY (batch_recipe_id)
)

;

CREATE TABLE daily_forecast_accuracy (
	accuracy_id INTEGER NOT NULL AUTO_INCREMENT, 
	breakdown_id INTEGER NOT NULL, 
	menu_item_id INTEGER NOT NULL, 
	restaurant_id INTEGER NOT NULL, 
	forecast_date DATE NOT NULL, 
	predicted_quantity INTEGER NOT NULL, 
	actual_quantity INTEGER NOT NULL, 
	forecast_error INTEGER NOT NULL, 
	error_percentage DECIMAL(5, 2) NOT NULL, 
	created_at DATETIME NOT NULL DEFAULT now(), 
	PRIMARY KEY (accuracy_id)
)

;

CREATE TABLE eod_purchase_order_suggestions (
	suggestion_id INTEGER NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER NOT NULL, 
	run_date DATE NOT NULL, 
	supplier_id INTEGER NOT NULL, 
	ingredient_id INTEGER NOT NULL, 
	ingredient_supplier_id INTEGER NOT NULL, 
	lead_demand DECIMAL(12, 2) NOT NULL, 
	shelf_demand DECIMAL(12, 2) NOT NULL, 
	forecast_unit VARCHAR(20), 
	converted_quantity_needed DECIMAL(12, 2) NOT NULL, 
	suggested_packs_to_order INTEGER NOT NULL, 
	total_quantity_ordered DECIMAL(12, 2) NOT NULL, 
	supplier_unit VARCHAR(20) NOT NULL, 
	inventory_unit VARCHAR(20), 
	lead_time_days INTEGER NOT NULL, 
	shelf_life_days INTEGER NOT NULL, 
	pack_size INTEGER NOT NULL, 
	quantity_per_pack_item DECIMAL(12, 2) NOT NULL, 
	min_order_quantity DECIMAL(12, 2) NOT NULL, 
	purchase_order_id INTEGER, 
	written_at DATETIME, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (suggestion_id), 
	CONSTRAINT uq_eod_po_suggestions_restaurant_date_supplier_ingredient UNIQUE (restaurant_id, run_date, supplier_id, ingredient_id)
)

;

CREATE TABLE forecast_breakdown (
	breakdown_id INTEGER NOT NULL AUTO_INCREMENT, 
	forecast_id INTEGER NOT NULL, 
	menu_item_id INTEGER NOT NULL, 
	restaurant_id INTEGER NOT NULL, 
	forecast_date DATE NOT NULL, 
	forecasted_quantity INTEGER NOT NULL, 
	PRIMARY KEY (breakdown_id)
)

;

CREATE TABLE forecast_run_ledger (
	forecast_ledger_id BIGINT NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER(11) NOT NULL, 
	run_date DATE NOT NULL, 
	running BOOL, 
	lock_token VARCHAR(40), 
	started_at DATETIME, 
	finished_at DATETIME, 
	accuracy_evaluated BOOL, 
	daily_accuracy_evaluated BOOL, 
	forecasts_generated BOOL, 
	batch_breakdown_calculated BOOL, 
	ingredient_breakdown_calculated BOOL, 
	finalized BOOL, 
	menu_items_processed BIGINT, 
	menu_items_total BIGINT, 
	durations JSON, 
	errors JSON, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (forecast_ledger_id), 
	CONSTRAINT uq_forecast_run_ledger_restaurant_date UNIQUE (restaurant_id, run_date)
)

;

CREATE TABLE ingredient_forecast_breakdown (
	ingredient_breakdown_id INTEGER NOT NULL AUTO_INCREMENT, 
	forecast_id INTEGER NOT NULL, 
	forecast_date DATE NOT NULL, 
	ingredient_id INTEGER NOT NULL, 
	restaurant_id INTEGER, 
	quantity DECIMAL(10, 2) NOT NULL, 
	source_type ENUM('menu_item','batch_recipe') NOT NULL, 
	source_id INTEGER NOT NULL, 
	created_at DATETIME DEFAULT now(), 
	PRIMARY KEY (ingredient_breakdown_id)
)

;

CREATE TABLE ingredient_supplier (
	ingredient_supplier_id INTEGER NOT NULL AUTO_INCREMENT, 
	ingredient_id INTEGER NOT NULL, 
	supplier_id INTEGER NOT NULL, 
	restaurant_id INTEGER NOT NULL, 
	cost_per_unit DECIMAL(10, 2) NOT NULL, 
	lead_time_days INTEGER NOT NULL, 
	review_period_days INTEGER, 
	order_schedule_type VARCHAR(32), 
	allowed_order_days JSON, 
	allowed_delivery_days JSON, 
	cadence_source VARCHAR(16), 
	cadence_confidence_score DECIMAL(5, 4), 
	spoilage_rate DECIMAL(4, 3), 
	shelf_life_days INTEGER, 
	preferred BOOL, 
	min_order_quantity INTEGER, 
	supplier_priority INTEGER, 
	unit VARCHAR(255) NOT NULL, 
	pack_size INTEGER, 
	quantity_per_pack_item DECIMAL(10, 2), 
	is_active BOOL, 
	PRIMARY KEY (ingredient_supplier_id)
)

;

CREATE TABLE inventory (
	inventory_id INTEGER NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER NOT NULL, 
	ingredient_id INTEGER, 
	quantity_on_hand FLOAT, 
	min_stock_level FLOAT, 
	last_delivery_date DATE, 
	spoilage_expected_date DATE, 
	shelf_life_days INTEGER, 
	spoilage_rate DECIMAL(4, 3), 
	last_audit_timestamp DATETIME, 
	last_audit_quantity FLOAT, 
	unit VARCHAR(20) NOT NULL, 
	PRIMARY KEY (inventory_id)
)

;

CREATE TABLE inventory_lots (
	lot_id INTEGER NOT NULL AUTO_INCREMENT, 
	inventory_id INTEGER NOT NULL, 
	restaurant_id INTEGER NOT NULL, 
	ingredient_supplier_id INTEGER, 
	receipt_source VARCHAR(50), 
	purchase_order_id INTEGER, 
	purchase_order_item_id INTEGER, 
	delivery_date DATE NOT NULL, 
	spoilage_expected_date DATE, 
	quantity FLOAT NOT NULL, 
	total_received DECIMAL(10, 2) NOT NULL, 
	unit VARCHAR(255) NOT NULL, 
	ingredient_id INTEGER, 
	batch_recipe_id INTEGER, 
	status ENUM('available','used','expired') NOT NULL, 
	PRIMARY KEY (lot_id), 
	CONSTRAINT uq_inventory_lots_purchase_order_item_id UNIQUE (purchase_order_item_id)
)

;

CREATE TABLE inventory_usage_log (
	usage_id INTEGER NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER NOT NULL, 
	inventory_id INTEGER NOT NULL, 
	lot_id INTEGER, 
	ingredient_id INTEGER NOT NULL, 
	used_quantity DECIMAL(10, 2) NOT NULL, 
	unit VARCHAR(20) NOT NULL, 
	used_date DATETIME NOT NULL, 
	usage_type ENUM('sale','waste','spoilage','manual_adjustment','batch_production','batch_output') NOT NULL, 
	reference_type ENUM('sale','batch','user','lot','waste_report','eod_sales','other'), 
	reference_id INTEGER, 
	notes VARCHAR(255), 
	PRIMARY KEY (usage_id)
)

;

CREATE TABLE prep_schedule (
	prep_id INTEGER NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER NOT NULL, 
	batch_recipe_id INTEGER NOT NULL, 
	prep_date DATE NOT NULL, 
	quantity_needed DECIMAL(10, 2), 
	quantity_prepped DECIMAL(10, 2), 
	prep_batch_count DECIMAL(10, 2), 
	prep_time_minutes_estimated INTEGER, 
	prep_time_minutes_actual INTEGER, 
	assigned_employee_id INTEGER, 
	status VARCHAR(20), 
	created_at DATETIME, 
	PRIMARY KEY (prep_id)
)

;

CREATE TABLE purchase_order_items (
	order_item_id INTEGER NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER NOT NULL, 
	order_id INTEGER NOT NULL, 
	ingredient_id INTEGER NOT NULL, 
	ingredient_supplier_id INTEGER, 
	quantity_ordered DECIMAL(10, 2), 
	quantity_received DECIMAL(10, 2), 
	unit VARCHAR(20), 
	unit_price DECIMAL(10, 2), 
	total_item_price DECIMAL(10, 2), 
	PRIMARY KEY (order_item_id)
)

;

CREATE TABLE recipe_ingredients (
	recipe_ingredient_id INTEGER NOT NULL AUTO_INCREMENT, 
	recipe_id INTEGER NOT NULL, 
	restaurant_id INTEGER NOT NULL, 
	reference_id INTEGER NOT NULL, 
	ingredient_type ENUM('ingredient','batch','recipe') NOT NULL, 
	quantity_used DECIMAL(10, 2) NOT NULL, 
	unit VARCHAR(20), 
	fallback_ingredient_id INTEGER, 
	PRIMARY KEY (recipe_ingredient_id)
)

;

CREATE TABLE restaurants (
	restaurant_id INTEGER(11) NOT NULL AUTO_INCREMENT, 
	name VARCHAR(100) NOT NULL, 
	phone VARCHAR(20), 
	address VARCHAR(255), 
	city VARCHAR(50), 
	state VARCHAR(50), 
	zip_code VARCHAR(20), 
	latitude DECIMAL(9, 6), 
	longitude DECIMAL(9, 6), 
	subscription_tier ENUM('basic','pro','master','full') NOT NULL, 
	email VARCHAR(255), 
	subscription_status VARCHAR(20), 
	expiry_date DATE, 
	forecast_length BIGINT, 
	hours_of_operation JSON, 
	tax_rate DECIMAL(5, 2), 
	timezone VARCHAR(100), 
	eod_run_when_closed BOOL, 
	eod_run_after_close_mins INTEGER UNSIGNED, 
	sales_channels JSON, 
	last_eod_run_date DATE, 
	settings JSON, 
	has_pos_display BOOL, 
	has_kitchen_display BOOL, 
	default_ui_layout VARCHAR(16), 
	pos_provider ENUM('none','square','toast','clover') NOT NULL, 
	pos_connected BOOL, 
	pos_access_token VARCHAR(255), 
	pos_refresh_token VARCHAR(255), 
	pos_location_id VARCHAR(255), 
	pos_merchant_id VARCHAR(255), 
	pos_last_sync DATETIME, 
	pos_sync_enabled BOOL, 
	pos_webhook_secret VARCHAR(255), 
	pos_sync_orders BOOL, 
	pos_sync_payments BOOL, 
	pos_sync_menu BOOL, 
	pos_mode ENUM('none','external') NOT NULL, 
	PRIMARY KEY (restaurant_id)
)

;

CREATE TABLE sales (
	sale_id INTEGER NOT NULL AUTO_INCREMENT, 
	restaurant_id INTEGER NOT NULL, 
	sale_timestamp DATETIME NOT NULL, 
	menu_item_id INTEGER NOT NULL, 
	quantity_sold INTEGER NOT NULL, 
	sales_channel VARCHAR(50), 
	PRIMARY KEY (sale_id)
)

;