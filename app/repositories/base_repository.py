from typing import Generic, TypeVar, Type, Optional, List, Union
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

T = TypeVar("T")


class BaseRepository(Generic[T]):
    def __init__(
        self, db: AsyncSession, model: Type[T], restaurant_id: int, pk_field: str = "id"
    ):
        self.db = db
        self.model = model
        self.restaurant_id = restaurant_id
        self.pk_field = pk_field  # dynamic primary key field

    def _to_dict(self, data: Union[dict, BaseModel]) -> dict:
        if isinstance(data, BaseModel):
            return data.dict(exclude_unset=True)
        elif isinstance(data, dict):
            return data
        else:
            raise TypeError("Data must be a dict or a Pydantic BaseModel")

    def _pk_filter(self, obj_id: int):
        return getattr(self.model, self.pk_field) == obj_id

    async def get_by_id(self, obj_id: int) -> Optional[T]:
        result = await self.db.execute(
            select(self.model).filter(
                self._pk_filter(obj_id), self.model.restaurant_id == self.restaurant_id
            )
        )
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 0) -> List[T]:
        query = select(self.model).filter(self.model.restaurant_id == self.restaurant_id).offset(skip)
        if limit > 0:
            query = query.limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()


    async def create(self, obj_data: dict) -> T:
        try:
            obj_dict = self._to_dict(obj_data)
            obj_dict["restaurant_id"] = self.restaurant_id

            # Remove created_at if present to let DB default work
            if "created_at" in obj_dict:
                del obj_dict["created_at"]

            # Creating the object
            obj = self.model(**obj_dict)
            self.db.add(obj)

            await self.db.flush()  # Ensure the object is flushed to the session
            await self.db.refresh(obj)  # Refresh the object after flush to get any defaults set by DB
            return obj
        except Exception as e:
            print(f"Error in creating: {e}")
            raise e


    async def update(
        self, obj_id: int, update_data: Union[dict, BaseModel]
    ) -> Optional[T]:
        result = await self.db.execute(
            select(self.model).filter(
                self._pk_filter(obj_id), self.model.restaurant_id == self.restaurant_id
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

    async def delete(self, obj_id: int) -> bool:
        result = await self.db.execute(
            select(self.model).filter(
                self._pk_filter(obj_id), self.model.restaurant_id == self.restaurant_id
            )
        )
        obj = result.scalars().first()
        if not obj:
            return False

        await self.db.delete(obj)
        return True
