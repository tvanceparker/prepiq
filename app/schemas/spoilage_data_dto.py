# app/schemas/spoilage_data_dto.py
from pydantic import BaseModel
from typing import Optional, Literal


class SpoilageDataBase(BaseModel):
    restaurant_id: int
    ingredient_id: int
    spoilage_date: str
    spoilage_rate: Optional[float] = None
    spoiled_quantity: Optional[float] = None
    source: Optional[Literal["auto", "manual"]] = "auto"


class SpoilageDataCreate(SpoilageDataBase):
    pass


class SpoilageDataUpdate(SpoilageDataBase):
    pass


class SpoilageData(SpoilageDataBase):
    spoilage_id: int

    class Config:
        orm_mode = True
