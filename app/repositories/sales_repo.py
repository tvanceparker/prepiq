from sqlalchemy import select, func, asc, delete
from app.db.models.sales_orm import Sales
from datetime import  date, timedelta, datetime, time
from app.repositories.base_repository import BaseRepository
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession


class SalesRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Sales, restaurant_id, pk_field="sale_id")

    async def get_total_quantity_sold_by_item_and_date(
        self, menu_item_id: int, sale_date: date
    ) -> int:
        result = await self.db.execute(
            select(func.sum(Sales.quantity_sold)).filter(
                Sales.restaurant_id == self.restaurant_id,
                Sales.menu_item_id == menu_item_id,
                func.date(Sales.sale_timestamp) == sale_date,
            )
        )
        total_quantity = result.scalar()
        return total_quantity or 0

    async def get_sales_by_menu_item(self, menu_item_id: int) -> List[Sales]:
        result = await self.db.execute(
            select(Sales).filter(
                Sales.menu_item_id == menu_item_id,
                Sales.restaurant_id == self.restaurant_id,
            )
        )
        return result.scalars().all()

    async def get_by_date(self, sale_date: date) -> List[Sales]:
        result = await self.db.execute(
            select(Sales).filter(
                Sales.restaurant_id == self.restaurant_id,
                func.date(Sales.sale_timestamp) == sale_date,
            )
        )
        return result.scalars().all()
    
    async def get_sales_between_dates(self, start_date: date, end_date: date) -> List[Sales]:
        result = await self.db.execute(
            select(Sales).filter(
                Sales.restaurant_id == self.restaurant_id,
                Sales.sale_timestamp >= start_date,
                Sales.sale_timestamp < end_date + timedelta(days=1),
            )
        )
        return result.scalars().all()
    
    async def get_sales_grouped_by_day(self, start_date: date, end_date: date):
        print('inside get sales grouped in sales repo')

        start_dt = datetime.combine(start_date,time.min)
        end_dt = datetime.combine(end_date,time.max)
        stmt = (
            select(
                func.date(Sales.sale_timestamp).label("sale_date"),
                Sales.menu_item_id,
                func.sum(Sales.quantity_sold).label("quantity_sold")
            )
            .where(
                Sales.restaurant_id == self.restaurant_id,
                Sales.sale_timestamp >= start_dt,
                Sales.sale_timestamp <= end_dt,
            )
            .group_by(func.date(Sales.sale_timestamp), Sales.menu_item_id)
        )
        print(f'stmt: {stmt}')
        result = await self.db.execute(stmt)
        print(f'result: {result}')
        return result.all()

    async def delete_sales_for_dates(self, dates: List[date]):
        if not dates:
            return

        stmt = delete(Sales).where(
            Sales.restaurant_id == self.restaurant_id,
            func.date(Sales.sale_timestamp).in_(dates)
        )
        await self.db.execute(stmt)
        await self.db.commit()
        
    # In sales_repo.py
    async def sales_exist_for_dates(self, dates: List[date]) -> bool:
        if not dates:
            return False

        stmt = select(func.count(Sales.sale_id)).filter(
            Sales.restaurant_id == self.restaurant_id,
            func.date(Sales.sale_timestamp).in_(dates)
        )
        result = await self.db.execute(stmt)
        count = result.scalar()
        return count > 0
