ALTER TABLE purchase_order_items
ADD COLUMN quantity_received DECIMAL(10, 2) NULL AFTER quantity_ordered;

UPDATE purchase_order_items poi
LEFT JOIN inventory_lots il ON il.purchase_order_item_id = poi.order_item_id
SET poi.quantity_received = COALESCE(il.total_received, poi.quantity_ordered)
WHERE poi.quantity_received IS NULL
  AND EXISTS (
    SELECT 1
    FROM purchase_orders po
    WHERE po.order_id = poi.order_id
      AND po.status = 'delivered'
  );