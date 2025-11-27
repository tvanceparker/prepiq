-- =============================================================================
-- Rollback: POS Cash Drawer & Stripe Terminal System
-- Database: prep_iq3 (MariaDB)
-- Date: 2025-11-26
-- Description: Reverts changes from add_pos_cash_drawer_system.sql
-- =============================================================================

-- Drop FK from payments first
ALTER TABLE payments DROP FOREIGN KEY fk_payments_terminal_reader;

-- Drop indexes
DROP INDEX idx_cds_open_sessions ON cash_drawer_sessions;
DROP INDEX idx_cdt_daily ON cash_drawer_transactions;

-- Drop new tables (in correct order due to FKs)
DROP TABLE IF EXISTS cash_drawer_transactions;
DROP TABLE IF EXISTS cash_drawer_sessions;
DROP TABLE IF EXISTS stripe_terminal_readers;

-- Remove new columns from payments
ALTER TABLE payments
    DROP COLUMN tip_amount,
    DROP COLUMN cash_tendered,
    DROP COLUMN change_given,
    DROP COLUMN terminal_reader_id;

-- Remove new columns from restaurants
ALTER TABLE restaurants
    DROP COLUMN pos_mode,
    DROP COLUMN stripe_terminal_location_id,
    DROP COLUMN cash_drawer_enabled;
