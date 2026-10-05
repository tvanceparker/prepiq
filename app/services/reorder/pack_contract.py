"""PO quantities are physical amounts in supplier units; packs are metadata."""
from decimal import Decimal, ROUND_CEILING
from app.services.utils.unit_conversion import convert_unit


def pack_order(decision, *, stock_unit, supplier_unit, pack_size,
               quantity_per_pack_item, minimum_quantity=0):
    pack_quantity = Decimal(str(pack_size)) * Decimal(str(quantity_per_pack_item))
    if not pack_quantity.is_finite() or pack_quantity <= 0:
        raise ValueError('Pack quantity must be finite and positive')
    required = convert_unit(decision['final_quantity'], stock_unit, supplier_unit)
    floor = Decimal(str(minimum_quantity))
    if not required.is_finite() or required < 0 or not floor.is_finite() or floor < 0:
        raise ValueError('Required quantity and MOQ must be finite and nonnegative')
    count = int((max(required, floor) / pack_quantity).to_integral_value(rounding=ROUND_CEILING)) if required > 0 else 0
    quantity = pack_quantity * count
    in_stock_unit = convert_unit(quantity, supplier_unit, stock_unit)
    cap = decision.get('effective_constraint_cap')
    violations = []
    if cap is not None and in_stock_unit > Decimal(str(cap)):
        violations.append('Whole packs exceed the stock or shelf-life cap; approval required')
    if decision.get('inventory_reconciliation_required'):
        violations.append('Lot balances require reconciliation before ordering')
    return {'pack_count': count, 'pack_quantity': pack_quantity,
            'quantity': quantity, 'quantity_in_stock_unit': in_stock_unit,
            'review_required': bool(violations) or bool(decision.get('review_required')),
            'warnings': violations}
