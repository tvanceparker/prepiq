UPDATE restaurants
SET pos_mode = 'none'
WHERE pos_mode = 'internal';

ALTER TABLE restaurants
    MODIFY COLUMN pos_mode ENUM('none', 'external') NOT NULL DEFAULT 'none'
    COMMENT 'POS operation mode: none=no POS, external=Square/Toast/Clover';

SET @schema_name = DATABASE();

SET @has_payments_fk = (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE constraint_schema = @schema_name
      AND table_name = 'payments'
      AND constraint_name = 'fk_payments_terminal_reader'
      AND constraint_type = 'FOREIGN KEY'
);
SET @payments_fk_sql = IF(
    @has_payments_fk > 0,
    'ALTER TABLE payments DROP FOREIGN KEY fk_payments_terminal_reader',
    'SET @migration_noop = 1'
);
PREPARE payments_fk_stmt FROM @payments_fk_sql;
EXECUTE payments_fk_stmt;
DEALLOCATE PREPARE payments_fk_stmt;

SET @has_terminal_reader_column = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @schema_name
      AND table_name = 'payments'
      AND column_name = 'terminal_reader_id'
);
SET @payments_column_sql = IF(
    @has_terminal_reader_column > 0,
    'ALTER TABLE payments DROP COLUMN terminal_reader_id',
    'SET @migration_noop = 1'
);
PREPARE payments_column_stmt FROM @payments_column_sql;
EXECUTE payments_column_stmt;
DEALLOCATE PREPARE payments_column_stmt;

SET @has_terminal_location_column = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @schema_name
      AND table_name = 'restaurants'
      AND column_name = 'stripe_terminal_location_id'
);
SET @restaurants_terminal_sql = IF(
    @has_terminal_location_column > 0,
    'ALTER TABLE restaurants DROP COLUMN stripe_terminal_location_id',
    'SET @migration_noop = 1'
);
PREPARE restaurants_terminal_stmt FROM @restaurants_terminal_sql;
EXECUTE restaurants_terminal_stmt;
DEALLOCATE PREPARE restaurants_terminal_stmt;

SET @has_cash_drawer_column = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = @schema_name
      AND table_name = 'restaurants'
      AND column_name = 'cash_drawer_enabled'
);
SET @restaurants_cash_drawer_sql = IF(
    @has_cash_drawer_column > 0,
    'ALTER TABLE restaurants DROP COLUMN cash_drawer_enabled',
    'SET @migration_noop = 1'
);
PREPARE restaurants_cash_drawer_stmt FROM @restaurants_cash_drawer_sql;
EXECUTE restaurants_cash_drawer_stmt;
DEALLOCATE PREPARE restaurants_cash_drawer_stmt;

DROP TABLE IF EXISTS stripe_terminal_readers;
DROP TABLE IF EXISTS cash_drawer_transactions;
DROP TABLE IF EXISTS cash_drawer_sessions;