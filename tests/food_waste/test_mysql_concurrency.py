"""Opt-in disposable-MySQL tests. Never point PREPIQ_TEST_MYSQL_URL at customer data.

This module creates/drops only its contract test tables in the provided test schema.
Normal tests use SQLite; CI supplies a disposable MySQL service for these cases. Tables are recreated per test.
"""
import asyncio
import os
from datetime import date
from decimal import Decimal
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import MetaData, String, ForeignKeyConstraint, select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.engine import make_url
from app.db.models.ingredients_orm import Ingredient
from app.db.models.ingredient_supplier_orm import IngredientSupplier
from app.db.models.purchase_orders_orm import PurchaseOrder
from app.db.models.purchase_order_items_orm import PurchaseOrderItem
from app.db.models.batch_recipes_orm import BatchRecipe
from app.db.models.batch_recipe_ingredients_orm import BatchRecipeIngredient
from app.db.models.prep_schedule_orm import PrepSchedule
from app.services.inventory_service import InventoryService
from app.services.prep_service import PrepService
from app.db.models.inventory_orm import Inventory
from app.db.models.inventory_lot_orm import InventoryLot
from app.db.models.inventory_usage_log_orm import InventoryUsageLog
from app.services.utils.inventory_consumption import InventoryConsumption
from app.utils.job_lock import job_lock

pytestmark = pytest.mark.mysql


@pytest_asyncio.fixture
async def mysql_engine():
    url = os.environ.get('PREPIQ_TEST_MYSQL_URL')
    if not url:
        pytest.skip('Set PREPIQ_TEST_MYSQL_URL to a disposable test schema for real row/advisory lock checks')
    assert make_url(url).database == 'prepiq_validation', 'Use the disposable prepiq_validation schema'
    engine = create_async_engine(url, pool_size=6)
    metadata = MetaData()
    # Relationships stay on the production ORM. Test DDL omits unrelated FKs;
    # old ORM String-without-length declarations need an explicit MySQL length.
    for model in [Inventory, InventoryLot, InventoryUsageLog, Ingredient, IngredientSupplier,
                  PurchaseOrder, PurchaseOrderItem, BatchRecipe, BatchRecipeIngredient, PrepSchedule]:
        table = model.__table__.to_metadata(metadata)
        for constraint in list(table.constraints):
            if isinstance(constraint, ForeignKeyConstraint):
                table.constraints.remove(constraint)
        table.foreign_keys.clear()
        for column in table.columns:
            column.foreign_keys.clear()
            if isinstance(column.type, String) and column.type.length is None:
                column.type = String(255)
    async with engine.begin() as connection:
        await connection.run_sync(metadata.drop_all)
        await connection.run_sync(metadata.create_all)
    yield engine
    async with engine.begin() as connection:
        await connection.run_sync(metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_planning_lock_survives_commit_rejects_concurrent_run_and_releases(mysql_engine):
    sessions = async_sessionmaker(mysql_engine, expire_on_commit=False)
    async with sessions() as first, sessions() as second:
        async with job_lock(first, 1, 'eod'):
            await first.commit()
            # Separate tasks must not inherit the caller's reentrant context.
            async def competing():
                with pytest.raises(HTTPException) as failure:
                    async with job_lock(second, 1, 'forecast'):
                        pytest.fail('Concurrent planning request acquired the lock')
                assert failure.value.status_code == 409
            # A child task inherits ContextVars but must still acquire its own lock.
            await asyncio.create_task(competing())
            async with job_lock(second, 2, 'eod'):
                await second.commit()
        async with job_lock(second, 1, 'eod'):
            await second.commit()


@pytest.mark.asyncio
async def test_concurrent_consumption_of_same_reference_changes_stock_once(mysql_engine):
    sessions = async_sessionmaker(mysql_engine, expire_on_commit=False)
    day = date(2026, 10, 5)
    async with sessions() as seed:
        seed.add(Inventory(inventory_id=1, restaurant_id=1, ingredient_id=1, quantity_on_hand=10, unit='kg'))
        seed.add(InventoryLot(lot_id=1, inventory_id=1, restaurant_id=1, ingredient_id=1,
            quantity=10, total_received=10, unit='kg', delivery_date=day, status='available'))
        await seed.commit()
    ready = asyncio.Barrier(2)
    async def deduct():
        async with sessions() as db:
            await db.execute(select(Inventory))
            await ready.wait()
            result = await InventoryConsumption(db, 1).consume(item_kind='ingredient', item_id=1,
                quantity=Decimal('3'), unit='kg', reference_type='eod_sales', reference_id=20261005, business_date=day)
            await db.commit()
            return result
    results = await asyncio.gather(deduct(), deduct())
    assert sorted(len(result) for result in results) == [0, 1]
    async with sessions() as db:
        assert await db.scalar(select(Inventory.quantity_on_hand)) == Decimal('7')
        assert await db.scalar(select(func.count()).select_from(InventoryUsageLog)) == 1


@pytest.mark.asyncio
async def test_concurrent_receipts_for_new_stock_create_one_summary(mysql_engine):
    sessions = async_sessionmaker(mysql_engine, expire_on_commit=False)
    day = date(2026, 10, 5)
    async with sessions() as seed:
        seed.add(Ingredient(ingredient_id=1, restaurant_id=1, name='Tomato', unit='kg'))
        seed.add(IngredientSupplier(ingredient_supplier_id=1, restaurant_id=1, ingredient_id=1,
            supplier_id=1, unit='kg', cost_per_unit=1, lead_time_days=0, pack_size=10,
            quantity_per_pack_item=1, shelf_life_days=5))
        for order_id in [1, 2]:
            seed.add(PurchaseOrder(order_id=order_id, restaurant_id=1, supplier_id=1, order_date=day, status='pending'))
            seed.add(PurchaseOrderItem(order_item_id=order_id, restaurant_id=1, order_id=order_id,
                ingredient_id=1, ingredient_supplier_id=1, quantity_ordered=10, unit='kg', unit_price=1, total_item_price=10))
        await seed.commit()
    async def receive(order_id):
        async with sessions() as db:
            result = await InventoryService(db, 1, 'full', None).receive_purchase_order(order_id, day)
            await db.commit()
            return result
    await asyncio.gather(receive(1), receive(2))
    # Repeating one of the physical receipts must not add its packs again.
    await asyncio.gather(receive(1), receive(1))
    async with sessions() as db:
        assert await db.scalar(select(func.count()).select_from(Inventory)) == 1
        assert await db.scalar(select(Inventory.quantity_on_hand)) == Decimal('20')
        assert await db.scalar(select(func.count()).select_from(InventoryLot)) == 2


@pytest.mark.asyncio
async def test_concurrent_prep_completion_consumes_inputs_and_creates_output_once(mysql_engine):
    sessions = async_sessionmaker(mysql_engine, expire_on_commit=False)
    day = date(2026, 10, 5)
    async with sessions() as seed:
        seed.add(Ingredient(ingredient_id=1, restaurant_id=1, name='Tomato', unit='kg'))
        seed.add(Inventory(inventory_id=1, restaurant_id=1, ingredient_id=1, quantity_on_hand=4, unit='kg'))
        seed.add(InventoryLot(lot_id=1, restaurant_id=1, inventory_id=1, ingredient_id=1,
            quantity=4, total_received=4, unit='kg', delivery_date=day, status='available'))
        seed.add(BatchRecipe(batch_recipe_id=1, restaurant_id=1, name='Salsa', yield_quantity=5, yield_unit='kg', shelf_life_days=3))
        seed.add(BatchRecipeIngredient(restaurant_id=1, batch_recipe_id=1, ingredient_type='ingredient',
            reference_id=1, quantity_used=2, unit='kg'))
        seed.add(PrepSchedule(prep_id=1, restaurant_id=1, batch_recipe_id=1, prep_date=day,
            prep_batch_count=1, status='scheduled'))
        await seed.commit()
    async def finish():
        async with sessions() as db:
            result = await PrepService(db, 1, 'full', None).update_prep_schedule(1, 'completed')
            await db.commit()
            return result
    await asyncio.gather(finish(), finish())
    async with sessions() as db:
        assert await db.scalar(select(Inventory.quantity_on_hand).where(Inventory.inventory_id == 1)) == Decimal('2')
        assert await db.scalar(select(func.count()).select_from(InventoryLot).where(InventoryLot.prep_id == 1)) == 1
        assert await db.scalar(select(func.count()).select_from(InventoryUsageLog)) == 1
