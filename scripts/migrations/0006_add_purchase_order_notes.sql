-- Adds missing notes column to purchase_orders to align with ORM and DTOs
ALTER TABLE purchase_orders
    ADD COLUMN notes TEXT NULL AFTER total_order_price;
