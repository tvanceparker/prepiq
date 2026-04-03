INSERT INTO inventory_deduction_discrepancies (
    restaurant_id,
    alert_id,
    message,
    severity,
    status,
    is_acknowledged,
    date_created,
    date_resolved,
    item_kind,
    ingredient_id,
    batch_recipe_id,
    item_name,
    unit,
    required_quantity,
    available_quantity,
    current_quantity_on_hand,
    shortfall_quantity,
    reference_type,
    reference_id,
    attempted_day
)
SELECT
    a.restaurant_id,
    a.alert_id,
    a.message,
    COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.severity')), a.severity, 'urgent') AS severity,
    a.status,
    COALESCE(a.is_acknowledged, FALSE) AS is_acknowledged,
    a.date_created,
    a.date_resolved,
    CASE
        WHEN JSON_EXTRACT(a.meta, '$.ingredient_id') IS NOT NULL THEN 'ingredient'
        WHEN JSON_EXTRACT(a.meta, '$.batch_recipe_id') IS NOT NULL THEN 'batch'
        ELSE 'unknown'
    END AS item_kind,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.ingredient_id')) AS SIGNED) AS ingredient_id,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.batch_recipe_id')) AS SIGNED) AS batch_recipe_id,
    COALESCE(
        JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.ingredient_name')),
        JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.batch_recipe_name'))
    ) AS item_name,
    JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.unit')) AS unit,
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.required_quantity')) AS DECIMAL(10,2)), 0.00) AS required_quantity,
    COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.available_quantity')) AS DECIMAL(10,2)), 0.00) AS available_quantity,
    COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.current_quantity_on_hand')) AS DECIMAL(10,2)),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.available_quantity')) AS DECIMAL(10,2)),
        0.00
    ) AS current_quantity_on_hand,
    COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.shortfall_quantity')) AS DECIMAL(10,2)),
        GREATEST(
            COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.required_quantity')) AS DECIMAL(10,2)), 0.00)
            - COALESCE(
                CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.current_quantity_on_hand')) AS DECIMAL(10,2)),
                CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.available_quantity')) AS DECIMAL(10,2)),
                0.00
            ),
            0.00
        )
    ) AS shortfall_quantity,
    JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.reference_type')) AS reference_type,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.reference_id')) AS SIGNED) AS reference_id,
    CAST(JSON_UNQUOTE(JSON_EXTRACT(a.meta, '$.attempted_day')) AS DATE) AS attempted_day
FROM alerts a
LEFT JOIN inventory_deduction_discrepancies d
    ON d.alert_id = a.alert_id
WHERE a.alert_type = 'Inventory:DeductionFailed'
  AND d.discrepancy_id IS NULL;