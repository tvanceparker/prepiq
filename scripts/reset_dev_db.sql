-- Danger: Run this via unix socket with OS root:  sudo mariadb -S /run/mysqld/mysqld.sock -e "SOURCE scripts/reset_dev_db.sql"

-- 0) Ensure root has a password for TCP connections
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;

-- 1) Reset dev database
DROP DATABASE IF EXISTS `prep_iq3`;
CREATE DATABASE `prep_iq3` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2) Create a wide-open dev user for local development
DROP USER IF EXISTS 'devuser'@'%';
CREATE USER 'devuser'@'%' IDENTIFIED BY 'devuser';
GRANT ALL PRIVILEGES ON `prep_iq3`.* TO 'devuser'@'%';
FLUSH PRIVILEGES;
