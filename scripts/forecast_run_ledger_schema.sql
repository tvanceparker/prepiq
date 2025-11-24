-- MariaDB schema for forecast_run_ledger table
-- Tracks execution state of the forecasting pipeline per restaurant per date
-- Provides idempotency, progress tracking, and error recording

-- Note: If foreign key constraint fails, the restaurants.restaurant_id column
-- might be BIGINT UNSIGNED AUTO_INCREMENT. Check with:
-- SHOW CREATE TABLE restaurants;

CREATE TABLE IF NOT EXISTS forecast_run_ledger (
    forecast_ledger_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT(11) NOT NULL,
    run_date DATE NOT NULL,
    
    -- Execution state flags
    running BOOLEAN NOT NULL DEFAULT FALSE,
    lock_token VARCHAR(100),
    started_at DATETIME(6),
    finished_at DATETIME(6),
    
    -- Stage completion flags
    accuracy_evaluated BOOLEAN NOT NULL DEFAULT FALSE,
    daily_accuracy_evaluated BOOLEAN NOT NULL DEFAULT FALSE,
    forecasts_generated BOOLEAN NOT NULL DEFAULT FALSE,
    batch_breakdown_calculated BOOLEAN NOT NULL DEFAULT FALSE,
    ingredient_breakdown_calculated BOOLEAN NOT NULL DEFAULT FALSE,
    finalized BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Progress tracking
    menu_items_processed INT UNSIGNED NOT NULL DEFAULT 0,s
    menu_items_total INT UNSIGNED NOT NULL DEFAULT 0,
    
    -- Performance and error tracking (JSON columns)
    durations JSON,  -- Maps stage_name -> duration_ms
    errors JSON,     -- Array of {stage, message, timestamp}
    
    -- Audit timestamps
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    -- Constraints
    UNIQUE KEY unique_restaurant_run_date (restaurant_id, run_date),
    INDEX idx_restaurant_running (restaurant_id, running),
    INDEX idx_run_date (run_date),
    INDEX idx_finalized (finalized),
    INDEX idx_restaurant_id (restaurant_id),
    
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
