"""Generate a small repeatable launch dataset; does not connect to a database."""
import csv
import json
from datetime import date, timedelta
from pathlib import Path


def main():
    root = Path('fixtures/demo_food_waste')
    root.mkdir(parents=True, exist_ok=True)
    origin = date(2026, 10, 5)
    with (root / 'sales.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=['sale_timestamp', 'menu_item_name', 'quantity_sold', 'sales_channel'])
        writer.writeheader()
        for offset in range(90):
            day = origin - timedelta(days=89 - offset)
            quantities = [('Tomato salad', 10 + day.weekday()), ('Salsa bowl', 8 + 2 * (day.weekday() >= 4)),
                          ('Weekend special', 4 if day.weekday() in [4, 5] else 0)]
            for name, quantity in quantities:
                if quantity:
                    writer.writerow({'sale_timestamp': f'{day.isoformat()}T18:00:00',
                                     'menu_item_name': name, 'quantity_sold': quantity, 'sales_channel': 'demo'})
    setup = {'origin_date': origin.isoformat(), 'timezone': 'America/Boise',
        'settings': {'sales_history_coverage': {'start_date': (origin - timedelta(days=89)).isoformat(), 'end_date': origin.isoformat()}, 'sales_observations': {}},
        'tenants': [{'name': 'PrepIQ Basic Demo', 'tier': 'basic'}, {'name': 'PrepIQ Full Demo', 'tier': 'full'}],
        'ingredients': [{'name': 'Tomato', 'unit': 'kg', 'policy_type': 'fresh_perishable', 'service_level_z': 1.28},
                        {'name': 'Rice', 'unit': 'kg', 'policy_type': 'stable_stocked', 'service_level_z': 1.65}],
        'supplier': {'unit': 'kg', 'lead_time_days': 2, 'review_period_days': 2,
                     'pack_size': 5, 'quantity_per_pack_item': 2, 'min_order_quantity': 10, 'shelf_life_days': 3},
        'batch': {'name': 'Salsa', 'yield_quantity': 5, 'yield_unit': 'kg', 'shelf_life_days': 2,
                  'inputs': [{'name': 'Tomato', 'quantity_used': 4000, 'unit': 'g'}]},
        'menu_recipes': [{'menu_item_name': 'Tomato salad', 'raw': [{'name': 'Tomato', 'quantity_used': 100, 'unit': 'g'}]},
                        {'menu_item_name': 'Salsa bowl', 'prepared': [{'name': 'Salsa', 'quantity_used': 200, 'unit': 'g'}]},
                        {'menu_item_name': 'Weekend special', 'raw': [{'name': 'Rice', 'quantity_used': 75, 'unit': 'g'}]}],
        'validation_cases': ['one expiring and one fresh raw lot', '4 kg prepared Salsa carried into the next day',
                             'one scheduled Salsa prep task', 'pending PO 20 kg with 5 kg received',
                             'an infeasible 10 kg pack for a 1 kg demand item', 'another tenant with the same ingredient names']}
    (root / 'setup.json').write_text(json.dumps(setup, indent=2))
    print(root)


if __name__ == '__main__':
    main()
