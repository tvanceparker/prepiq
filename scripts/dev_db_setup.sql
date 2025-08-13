-- Quick dev DB setup for MariaDB/MySQL
-- Usage (from repo root):
--   mysql -u root -p < scripts/dev_db_setup.sql

-- Create database matching the seed dump header
CREATE DATABASE IF NOT EXISTS `prep_iq3` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Create a dev user with full privileges on the dev DB
CREATE USER IF NOT EXISTS 'devuser'@'%' IDENTIFIED BY 'devuser';
GRANT ALL PRIVILEGES ON `prep_iq3`.* TO 'devuser'@'%';
-- Also grant global dev access (optional)
GRANT ALL PRIVILEGES ON *.* TO 'devuser'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
