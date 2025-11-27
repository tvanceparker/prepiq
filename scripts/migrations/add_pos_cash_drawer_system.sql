-- =============================================================================
-- Migration: POS Cash Drawer & Stripe Terminal System
-- Database: prep_iq3 (MariaDB)
-- Date: 2025-11-26
-- Description: Adds cash drawer sessions, transactions, Stripe Terminal readers,
--              POS mode selection, and enhanced payment fields
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ALTER restaurants table - Add POS mode and Stripe Terminal fields
-- -----------------------------------------------------------------------------
ALTER TABLE restaurants
    ADD COLUMN pos_mode ENUM('none', 'internal', 'external') NOT NULL DEFAULT 'none'
        COMMENT 'POS operation mode: none=no POS, internal=PrepIQ POS, external=Square/Toast/Clover'
        AFTER pos_sync_menu,
    ADD COLUMN stripe_terminal_location_id VARCHAR(255) NULL
        COMMENT 'Stripe Terminal Location ID for reader registration'
        AFTER pos_mode,
    ADD COLUMN cash_drawer_enabled BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'Whether cash drawer tracking is enabled for this restaurant'
        AFTER stripe_terminal_location_id;

-- -----------------------------------------------------------------------------
-- 2. ALTER payments table - Add tip, cash handling, and terminal reader fields
-- -----------------------------------------------------------------------------
ALTER TABLE payments
    ADD COLUMN tip_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        COMMENT 'Tip/gratuity amount'
        AFTER amount,
    ADD COLUMN cash_tendered DECIMAL(10, 2) NULL
        COMMENT 'Amount of cash given by customer (for cash payments)'
        AFTER tip_amount,
    ADD COLUMN change_given DECIMAL(10, 2) NULL
        COMMENT 'Change returned to customer (for cash payments)'
        AFTER cash_tendered,
    ADD COLUMN terminal_reader_id BIGINT NULL
        COMMENT 'FK to stripe_terminal_readers for card-present payments'
        AFTER change_given;

-- -----------------------------------------------------------------------------
-- 3. CREATE stripe_terminal_readers table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stripe_terminal_readers (
    reader_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT(11) NOT NULL,
    stripe_reader_id VARCHAR(255) NOT NULL
        COMMENT 'Stripe reader ID (e.g., tmr_xxx)',
    label VARCHAR(100) NULL
        COMMENT 'Human-readable label (e.g., Front Counter Reader)',
    device_type VARCHAR(50) NULL
        COMMENT 'Reader model (e.g., stripe_s700, bbpos_wisepos_e)',
    serial_number VARCHAR(100) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'offline'
        COMMENT 'Reader status: online, offline',
    ip_address VARCHAR(45) NULL
        COMMENT 'Reader IP address on local network',
    last_seen_at DATETIME NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_str_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
        ON DELETE CASCADE,
    
    UNIQUE KEY uk_stripe_reader (stripe_reader_id),
    INDEX idx_str_restaurant (restaurant_id),
    INDEX idx_str_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stripe Terminal physical card readers';

-- -----------------------------------------------------------------------------
-- 4. CREATE cash_drawer_sessions table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT(11) NOT NULL,
    device_id BIGINT NULL
        COMMENT 'FK to devices table (which POS terminal opened this drawer)',
    opened_by_employee_id INT(11) NOT NULL
        COMMENT 'Employee who opened the drawer',
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opening_float DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        COMMENT 'Starting cash amount in drawer',
    closed_by_employee_id INT(11) NULL
        COMMENT 'Employee who closed the drawer',
    closed_at DATETIME NULL,
    closing_float DECIMAL(10, 2) NULL
        COMMENT 'Cash amount at drawer close (for next shift)',
    expected_cash DECIMAL(10, 2) NULL
        COMMENT 'System-calculated expected cash (opening + cash sales - payouts)',
    actual_cash DECIMAL(10, 2) NULL
        COMMENT 'Actual counted cash at close',
    variance DECIMAL(10, 2) NULL
        COMMENT 'Difference: actual_cash - expected_cash',
    cash_sales_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        COMMENT 'Running total of cash payments received',
    card_sales_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        COMMENT 'Running total of card payments',
    tip_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        COMMENT 'Running total of tips (cash + card)',
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    notes TEXT NULL
        COMMENT 'Manager notes on variance or issues',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cds_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cds_device
        FOREIGN KEY (device_id) REFERENCES devices(device_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_cds_opened_by
        FOREIGN KEY (opened_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_cds_closed_by
        FOREIGN KEY (closed_by_employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL,
    
    INDEX idx_cds_restaurant_status (restaurant_id, status),
    INDEX idx_cds_opened_at (opened_at),
    INDEX idx_cds_device (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Cash drawer sessions for shift-based cash tracking';

-- -----------------------------------------------------------------------------
-- 5. CREATE cash_drawer_transactions table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
    transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL
        COMMENT 'FK to cash_drawer_sessions',
    restaurant_id INT(11) NOT NULL,
    transaction_type ENUM('cash_sale', 'card_sale', 'cash_refund', 'card_refund', 'pay_in', 'pay_out', 'no_sale') NOT NULL
        COMMENT 'Type of drawer transaction',
    amount DECIMAL(10, 2) NOT NULL
        COMMENT 'Transaction amount (positive for in, negative for out)',
    tip_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    payment_id INT(11) NULL
        COMMENT 'FK to payments table (if tied to a payment)',
    order_id INT(11) NULL
        COMMENT 'FK to orders table (if tied to an order)',
    employee_id INT(11) NULL
        COMMENT 'Employee who performed the transaction',
    note VARCHAR(500) NULL
        COMMENT 'Optional note (e.g., reason for pay_out)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cdt_session
        FOREIGN KEY (session_id) REFERENCES cash_drawer_sessions(session_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cdt_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_cdt_payment
        FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_cdt_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_cdt_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL,
    
    INDEX idx_cdt_session (session_id),
    INDEX idx_cdt_restaurant (restaurant_id),
    INDEX idx_cdt_type (transaction_type),
    INDEX idx_cdt_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Individual cash drawer transactions within a session';

-- -----------------------------------------------------------------------------
-- 6. Add FK from payments to stripe_terminal_readers (after reader table exists)
-- -----------------------------------------------------------------------------
ALTER TABLE payments
    ADD CONSTRAINT fk_payments_terminal_reader
        FOREIGN KEY (terminal_reader_id) REFERENCES stripe_terminal_readers(reader_id)
        ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 7. Create index for common queries
-- -----------------------------------------------------------------------------
-- Find open drawer sessions for a restaurant
CREATE INDEX idx_cds_open_sessions ON cash_drawer_sessions(restaurant_id, status, device_id);

-- Find today's transactions
CREATE INDEX idx_cdt_daily ON cash_drawer_transactions(restaurant_id, created_at);
