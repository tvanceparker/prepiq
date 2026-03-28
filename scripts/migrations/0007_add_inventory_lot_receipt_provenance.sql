ALTER TABLE inventory_lots
    ADD COLUMN receipt_source VARCHAR(50) NULL,
    ADD COLUMN purchase_order_id INT NULL,
    ADD COLUMN purchase_order_item_id INT NULL;

CREATE INDEX idx_inventory_lots_purchase_order_id
    ON inventory_lots (purchase_order_id);

CREATE INDEX idx_inventory_lots_purchase_order_item_id
    ON inventory_lots (purchase_order_item_id);

ALTER TABLE inventory_lots
    ADD CONSTRAINT fk_inventory_lots_purchase_order_id
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(order_id),
    ADD CONSTRAINT fk_inventory_lots_purchase_order_item_id
        FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(order_item_id);