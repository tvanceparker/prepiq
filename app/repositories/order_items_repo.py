# app/repositories/order_items_repo.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.order_items_orm import OrderItem
from app.repositories.base_repository import BaseRepository


class OrderItemsRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, OrderItem, restaurant_id, pk_field="order_item_id")

    async def get_by_id(self, obj_id: int):
        result = await self.db.execute(
            select(OrderItem).join(OrderItem.order).filter(
                OrderItem.order_item_id == obj_id,
                OrderItem.order.restaurant_id == self.restaurant_id
            )
        )
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 0):
        query = select(OrderItem).join(OrderItem.order).filter(
            OrderItem.order.restaurant_id == self.restaurant_id
        ).offset(skip)
        if limit > 0:
            query = query.limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def update(self, obj_id: int, update_data):
        result = await self.db.execute(
            select(OrderItem).join(OrderItem.order).filter(
                OrderItem.order_item_id == obj_id,
                OrderItem.order.restaurant_id == self.restaurant_id
            )
        )
        obj = result.scalars().first()
        if not obj:
            return None

        update_dict = self._to_dict(update_data)
        for field, value in update_dict.items():
            setattr(obj, field, value)

        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def get_by_order_id(self, order_id: int):
        result = await self.db.execute(
            select(OrderItem).join(OrderItem.order).filter(
                OrderItem.order_id == order_id,
                OrderItem.order.restaurant_id == self.restaurant_id
            )
        )
        return result.scalars().all()

    async def delete(self, obj_id: int) -> bool:
        result = await self.db.execute(
            select(OrderItem).join(OrderItem.order).filter(
                OrderItem.order_item_id == obj_id,
                OrderItem.order.restaurant_id == self.restaurant_id
            )
        )
        obj = result.scalars().first()
        if not obj:
            return False

        await self.db.delete(obj)
        return True
