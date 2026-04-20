from sqlalchemy import select, func, asc, delete, or_
from app.db.models.sales_orm import Sales
from datetime import  date, timedelta, datetime, time
from app.repositories.base_repository import BaseRepository
from typing import List, Dict, Optional, Sequence, Tuple
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

    async def get_sales_date_bounds(self) -> Tuple[Optional[date], Optional[date]]:
        result = await self.db.execute(
            select(
                func.min(Sales.sale_timestamp),
                func.max(Sales.sale_timestamp)
            ).filter(Sales.restaurant_id == self.restaurant_id)
        )
        min_ts, max_ts = result.one()
        min_date = min_ts.date() if min_ts else None
        max_date = max_ts.date() if max_ts else None
        return min_date, max_date
    
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

    def _build_channel_conditions(self, channels: Sequence[Optional[str]]):
        conditions = []
        for ch in channels:
            if ch is None:
                conditions.append(Sales.sales_channel.is_(None))
            else:
                conditions.append(Sales.sales_channel == ch)
        return conditions

    async def create_many(self, sales_rows: Sequence[dict]) -> List[Sales]:
        if not sales_rows:
            return []

        sales = []
        for row in sales_rows:
            payload = self._to_dict(row)
            payload["restaurant_id"] = self.restaurant_id
            sales.append(self.model(**payload))

        self.db.add_all(sales)
        await self.db.flush()
        return sales
        
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

    async def get_sales_channels_counts_for_date(self, d: date) -> List[Tuple[Optional[str], int]]:
        """Return list of (sales_channel, count) for a given date."""
        stmt = (
            select(Sales.sales_channel, func.count(Sales.sale_id))
            .where(
                Sales.restaurant_id == self.restaurant_id,
                func.date(Sales.sale_timestamp) == d,
            )
            .group_by(Sales.sales_channel)
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        return [(row[0], row[1]) for row in rows]

    async def sales_exist_for_date_and_channels(self, d: date, channels: Sequence[Optional[str]]) -> bool:
        if not channels:
            return False

        conditions = self._build_channel_conditions(channels)
        stmt = select(func.count(Sales.sale_id)).where(
            Sales.restaurant_id == self.restaurant_id,
            func.date(Sales.sale_timestamp) == d,
            or_(*conditions),
        )
        res = await self.db.execute(stmt)
        return (res.scalar() or 0) > 0

    async def count_sales_for_date_and_channels(self, d: date, channels: Sequence[Optional[str]]) -> int:
        if not channels:
            return 0

        conditions = self._build_channel_conditions(channels)
        stmt = select(func.count(Sales.sale_id)).where(
            Sales.restaurant_id == self.restaurant_id,
            func.date(Sales.sale_timestamp) == d,
            or_(*conditions),
        )
        res = await self.db.execute(stmt)
        return int(res.scalar() or 0)

    async def delete_sales_for_date_and_channels(
        self,
        d: date,
        channels: Sequence[Optional[str]],
        auto_commit: bool = True,
    ) -> int:
        if not channels:
            return 0

        conditions = self._build_channel_conditions(channels)
        stmt = delete(Sales).where(
            Sales.restaurant_id == self.restaurant_id,
            func.date(Sales.sale_timestamp) == d,
            or_(*conditions),
        )
        result = await self.db.execute(stmt)
        if auto_commit:
            await self.db.commit()
        return int(result.rowcount or 0)

    async def get_sales_by_date_range(self, start_date: date, end_date: date) -> List[Sales]:
        """Get all sales within a date range."""
        start_dt = datetime.combine(start_date, time.min)
        end_dt = datetime.combine(end_date, time.max)
        
        result = await self.db.execute(
            select(Sales).filter(
                Sales.restaurant_id == self.restaurant_id,
                Sales.sale_timestamp >= start_dt,
                Sales.sale_timestamp <= end_dt,
            )
            .order_by(asc(Sales.sale_timestamp))
        )
        return result.scalars().all()
