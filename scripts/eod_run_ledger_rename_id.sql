-- MariaDB schema for eod_run_ledger table (for reference)
-- ALTER TABLE command to rename id column to eod_ledger_id

ALTER TABLE eod_run_ledger 
CHANGE COLUMN id eod_ledger_id BIGINT UNSIGNED AUTO_INCREMENT;
