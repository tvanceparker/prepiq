# Inventory Deduction Review — Restaurant 4 (Run Date: 2026-01-22)

## Summary

The inventory deduction errors for restaurant_id=4 are **expected** given current on-hand quantities and batch lot availability. The math behind the required quantities matches the sales + recipe definitions for 2026-01-22. No unit conversions were needed because recipe units align with inventory units for all affected ingredients/batches.

## Sources Used

- Alerts table (Inventory:DeductionFailed)
- Sales for 2026-01-22
- Menu item → recipe mappings
- Recipe ingredients (ingredient + batch components)
- Inventory on-hand and batch lots

## Alerts Observed (Most Recent)

The most recent EOD run uses reference_id **20260122** and produced these errors:

- Ingredient shortages (examples):
  - ingredient_id=404 required **282 ea**, available **200 ea**
  - ingredient_id=402 required **13.5 lb**, available **3.12 lb**
  - ingredient_id=408 required **151.2 oz**, available **64 oz**
- Batch shortages:
  - batch_recipe_id=401 required **242.5 oz**, available **80 oz**
  - batch_recipe_id=402 required **109 oz**, available **60 oz**
  - batch_recipe_id=403 **no lots found**

SQL used:

```sql
SELECT alert_id, alert_type, severity, status, date_created, message, meta
FROM alerts
WHERE restaurant_id=4
ORDER BY date_created DESC
LIMIT 50;
```

## Sales Totals for 2026-01-22

Sales quantities used for the EOD aggregation:

```sql
SELECT menu_item_id, SUM(quantity_sold) AS qty
FROM sales
WHERE restaurant_id=4 AND DATE(sale_timestamp)='2026-01-22'
GROUP BY menu_item_id
ORDER BY menu_item_id;
```

Result:

- menu_item_id=401 → 75
- menu_item_id=402 → 66
- menu_item_id=403 → 32
- menu_item_id=404 → 15

## Recipe Mappings

Each menu item maps 1:1 to its recipe:

```sql
SELECT menu_item_id, recipe_id
FROM menu_item_recipes
WHERE restaurant_id=4 AND menu_item_id IN (401,402,403,404)
ORDER BY menu_item_id, recipe_id;
```

Recipes and components:

```sql
SELECT recipe_id, ingredient_type, reference_id, quantity_used, unit
FROM recipe_ingredients
WHERE restaurant_id=4 AND recipe_id IN (401,402,403,404)
ORDER BY recipe_id, ingredient_type, reference_id;
```

Key components:

- Recipe 401 uses: 402(lb), 404(ea), 408(oz), 409(ea), batch 401(oz)
- Recipe 402 uses: 401(lb), 404(ea), 408(oz), batch 401(oz), batch 403(oz)
- Recipe 403 uses: 403(lb), 405(ea), 408(oz), batch 401(oz), batch 402(oz)
- Recipe 404 uses: 421(oz), batch 402(oz)

## Expected Ingredient Usage (Calculated)

Based on sales × recipe quantities:

| Ingredient | Unit | Required Qty | Inventory On Hand |
| ---------: | ---- | -----------: | ----------------: |
|        401 | lb   |        11.88 |              1.28 |
|        402 | lb   |        13.50 |              3.12 |
|        403 | lb   |         9.60 |              5.70 |
|        404 | ea   |       282.00 |            200.00 |
|        405 | ea   |        32.00 |             27.00 |
|        408 | oz   |       151.20 |             64.00 |
|        409 | ea   |        75.00 |              9.00 |
|        421 | oz   |        60.00 |             44.00 |

Inventory query:

```sql
SELECT inventory_id, ingredient_id, quantity_on_hand, unit
FROM inventory
WHERE restaurant_id=4 AND ingredient_id IN (401,402,403,404,405,408,409,421);
```

✅ These required quantities **match the alert metadata** exactly, which means the aggregation math is correct.

## Expected Batch Usage (Calculated)

Based on sales × recipe batch components:

| Batch Recipe | Unit | Required Qty | Batch Inventory Available |
| -----------: | ---- | -----------: | ------------------------: |
|   401 (Pico) | oz   |        242.5 |                      80.0 |
|   402 (Guac) | oz   |        109.0 |                      60.0 |
|  403 (Adobo) | oz   |         79.2 |             0.0 (no lots) |

Batch lot availability:

```sql
SELECT lot_id, inventory_id, batch_recipe_id, quantity, unit, delivery_date, status
FROM inventory_lots
WHERE restaurant_id=4 AND batch_recipe_id IN (401,402,403)
ORDER BY delivery_date;
```

Inventory for batch lots:

```sql
SELECT inventory_id, ingredient_id, quantity_on_hand, unit
FROM inventory
WHERE restaurant_id=4 AND inventory_id IN (422,423);
```

✅ Batch requirements also **match the alert metadata**, confirming the batch side math is correct.

## Unit Conversion Check

- All recipe units **match inventory units** for the affected items:
  - lb ↔ lb
  - oz ↔ oz
  - ea ↔ ea
- Therefore no conversion was needed in the helper for this run.

If a mismatch existed (e.g., recipe in oz but inventory in lb), the helper would call `convert_unit(...)` and then compare to on-hand. That did not apply here.

## Why Deductions Failed

- The required quantities are **greater than on-hand** for multiple ingredients.
- Two batch recipes (401, 402) are short, and **batch 403 has no lots** at all.
- The helper logs an alert and **skips deduction** for each insufficient item/batch.

There are no EOD usage logs for reference_id 20260122:

```sql
SELECT usage_id, inventory_id, ingredient_id, used_quantity, unit, usage_type, reference_type, reference_id
FROM inventory_usage_log
WHERE restaurant_id=4 AND reference_type='eod_sales' AND reference_id=20260122;
```

## Conclusion

The EOD inventory deduction math for restaurant_id=4 on 2026-01-22 is **correct**. The failures are due to genuine shortages and missing batch lots, not calculation or unit conversion errors.

If you want, I can:

- Reconstruct the deduction per menu item step-by-step
- Add a report for a different date
- Check batch production logs to see why batch lots are low or missing
