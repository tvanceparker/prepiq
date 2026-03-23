-- Migration: Create token blacklist table (Optional - for v2 logout revocation)
-- Purpose: Track revoked tokens for server-side logout + token rotation
-- Date: 2026-03-23
-- Target: MariaDB
-- Status: OPTIONAL - Use this when implementing full token revocation in v2

-- Only run this migration if you decide to implement server-side token revocation
CREATE TABLE IF NOT EXISTS token_blacklist (
  blacklist_id CHAR(36) PRIMARY KEY COMMENT 'UUID primary key',
  token_jti CHAR(36) NOT NULL UNIQUE COMMENT 'JWT ID claim (unique token identifier)',
  restaurant_id BIGINT NOT NULL COMMENT 'Multi-tenant scoping',
  employee_id BIGINT COMMENT 'Employee who owned the token',
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When token was revoked',
  expires_at TIMESTAMP NOT NULL COMMENT 'When token actually expires (for cleanup reference)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for efficient cleanup and lookups
CREATE INDEX idx_token_blacklist_restaurant_revoked ON token_blacklist(restaurant_id, revoked_at);
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX idx_token_blacklist_employee ON token_blacklist(employee_id);

-- Add comment
ALTER TABLE token_blacklist COMMENT = 'Tracks revoked JWT tokens for server-side logout and token rotation support';
