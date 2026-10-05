"""Apply the migration to a baseline contract schema in disposable MySQL only."""
import os
from pathlib import Path
import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

pytestmark = pytest.mark.mysql


@pytest.mark.asyncio
async def test_food_waste_migration_preserves_stock_and_adds_contracts():
    url = os.environ.get('PREPIQ_TEST_MYSQL_URL')
    if not url:
        pytest.skip('Set PREPIQ_TEST_MYSQL_URL to the disposable prepiq_validation schema')
    assert make_url(url).database == 'prepiq_validation', 'Migration test requires prepiq_validation; never use customer data'
    engine = create_async_engine(url)
    root = Path(__file__).resolve().parents[2]
    baseline = Path(__file__).with_name('baseline_migration_schema.sql').read_text()
    migration = (root / 'scripts/migrations/0016_food_waste_pipeline_contracts.sql').read_text()
    names = ['waste_reports', 'inventory_lots', 'prep_schedule', 'restaurants', 'inventory',
             'inventory_usage_log', 'purchase_order_items', 'ingredient_supplier', 'forecast_run_ledger',
             'eod_purchase_order_suggestions', 'sales', 'forecast_breakdown', 'recipe_ingredients',
             'batch_recipe_ingredients', 'batch_recipes', 'ingredient_forecast_breakdown',
             'daily_forecast_accuracy', 'batch_recipe_forecast_breakdown']
    def statements(script):
        script = '\n'.join(line for line in script.splitlines() if not line.lstrip().startswith('--'))
        return [part.strip() for part in script.split(';') if part.strip()]
    async with engine.connect() as connection:
        async def clean():
            await connection.execute(text('SET FOREIGN_KEY_CHECKS=0'))
            for name in names:
                await connection.execute(text(f'DROP TABLE IF EXISTS `{name}`'))
            await connection.execute(text('SET FOREIGN_KEY_CHECKS=1'))
        await clean()
        try:
            for statement in statements(baseline):
                await connection.execute(text(statement))
            await connection.execute(text("INSERT INTO inventory (inventory_id, restaurant_id, ingredient_id, quantity_on_hand, unit) VALUES (1,1,1,10,'kg')"))
            for statement in statements(migration):
                await connection.execute(text(statement))
            assert await connection.scalar(text('SELECT quantity_on_hand FROM inventory WHERE inventory_id=1')) == 10
            await connection.execute(text("UPDATE inventory SET quantity_on_hand=0.001001 WHERE inventory_id=1"))
            assert str(await connection.scalar(text('SELECT quantity_on_hand FROM inventory WHERE inventory_id=1'))) == '0.001001'
            await connection.execute(text("INSERT INTO inventory_usage_log (restaurant_id, inventory_id, ingredient_id, used_quantity, unit, usage_type, reference_type, business_date, used_date) VALUES (1,1,NULL,0.000001,'kg','sale','order','2026-10-05','2026-10-05 12:00:00')"))
            assert str(await connection.scalar(text('SELECT used_quantity FROM inventory_usage_log'))) == '0.000001'
            columns = (await connection.execute(text("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()"))).all()
            assert {('inventory_lots','prep_id'),('forecast_run_ledger','result_snapshot'),
                    ('eod_purchase_order_suggestions','suggestion_snapshot'),('purchase_order_items','pack_count'),
                    ('ingredient_supplier','order_schedule_anchor_date'),('sales','business_date')} <= set(columns)
            create_lots = (await connection.execute(text('SHOW CREATE TABLE inventory_lots'))).first()[1]
            assert 'uq_inventory_lots_prep' in create_lots and 'fk_inventory_lots_prep' in create_lots
        finally:
            await clean()
    await engine.dispose()
