CREATE TABLE IF NOT EXISTS mcp_action_audit (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    employee_id INT NULL,
    tool_name VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'started',
    risk_level VARCHAR(32) NOT NULL DEFAULT 'standard',
    requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
    confirmation_token_hash VARCHAR(64) NULL,
    outcome_code VARCHAR(64) NULL,
    error_code VARCHAR(64) NULL,
    input_summary JSON NULL,
    result_summary JSON NULL,
    error_message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    CONSTRAINT uq_mcp_action_audit_idempotency
        UNIQUE (restaurant_id, tool_name, idempotency_key),
    INDEX ix_mcp_action_audit_restaurant_tool (restaurant_id, tool_name),
    INDEX ix_mcp_action_audit_status (status),
    CONSTRAINT fk_mcp_action_audit_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id),
    CONSTRAINT fk_mcp_action_audit_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);
