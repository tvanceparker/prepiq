-- Migration: Add POS Item Mappings Table
-- Purpose: Map external POS item IDs to PrepIQ menu items
-- Date: 2025-11-26

USE prep_iq3;

CREATE TABLE IF NOT EXISTS pos_item_mappings (
  mapping_id INT(11) PRIMARY KEY AUTO_INCREMENT,
  restaurant_id INT(11) NOT NULL,
  pos_provider ENUM('square', 'toast', 'clover') NOT NULL,
  external_item_id VARCHAR(255) NOT NULL,
  external_item_name VARCHAR(255),
  menu_item_id INT(11),
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  mapping_status ENUM('auto', 'manual', 'unmapped') DEFAULT 'unmapped',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(menu_item_id) ON DELETE SET NULL,
  UNIQUE KEY unique_external_item (restaurant_id, pos_provider, external_item_id),
  INDEX idx_restaurant_provider (restaurant_id, pos_provider),
  INDEX idx_menu_item (menu_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
