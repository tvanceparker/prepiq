-- Migration: Add POS Merchant Mappings Table
-- Purpose: Map external POS merchant IDs to PrepIQ restaurants for webhook routing
-- Date: 2025-11-26

USE prep_iq3;

CREATE TABLE IF NOT EXISTS pos_merchant_mappings (
  mapping_id INT(11) PRIMARY KEY AUTO_INCREMENT,
  merchant_id VARCHAR(255) NOT NULL,
  pos_provider ENUM('square', 'toast', 'clover') NOT NULL,
  restaurant_id INT(11) NOT NULL,
  location_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  UNIQUE KEY unique_merchant (merchant_id, pos_provider),
  INDEX idx_merchant_lookup (merchant_id, pos_provider),
  INDEX idx_restaurant (restaurant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
