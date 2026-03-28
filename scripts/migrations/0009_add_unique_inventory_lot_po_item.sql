ALTER TABLE inventory_lots
    ADD CONSTRAINT uq_inventory_lots_purchase_order_item_id
    UNIQUE (purchase_order_item_id);
