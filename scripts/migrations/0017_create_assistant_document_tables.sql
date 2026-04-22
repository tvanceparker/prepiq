-- Migration 0017: Create assistant document and chunk storage tables

CREATE TABLE assistant_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    source_type VARCHAR(24) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    source_path TEXT NULL,
    storage_path TEXT NULL,
    content_type VARCHAR(120) NULL,
    content_hash VARCHAR(64) NOT NULL,
    metadata_json JSON NULL,
    is_uploaded BOOLEAN NOT NULL DEFAULT FALSE,
    index_status VARCHAR(24) NOT NULL DEFAULT 'pending',
    last_error TEXT NULL,
    indexed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assistant_documents_restaurant (restaurant_id),
    INDEX idx_assistant_documents_source_type (source_type),
    INDEX idx_assistant_documents_hash (content_hash),
    CONSTRAINT fk_assistant_documents_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
        ON DELETE CASCADE
);

CREATE TABLE assistant_document_chunks (
    chunk_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    document_id INT NOT NULL,
    chunk_index INT NOT NULL,
    heading_trail JSON NULL,
    chunk_checksum VARCHAR(64) NOT NULL,
    text LONGTEXT NOT NULL,
    token_count INT NOT NULL DEFAULT 0,
    embedding JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_assistant_chunks_restaurant (restaurant_id),
    INDEX idx_assistant_chunks_document (document_id),
    INDEX idx_assistant_chunks_checksum (chunk_checksum),
    CONSTRAINT fk_assistant_chunks_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_assistant_chunks_document
        FOREIGN KEY (document_id) REFERENCES assistant_documents(document_id)
        ON DELETE CASCADE
);