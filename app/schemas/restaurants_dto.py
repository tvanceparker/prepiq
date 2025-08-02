# app/schemas/restaurants_dto.py

from pydantic import BaseModel
from typing import Optional


class RestaurantBase(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


class RestaurantCreate(RestaurantBase):
    pass


class RestaurantUpdate(RestaurantBase):
    pass


class Restaurant(RestaurantBase):
    restaurant_id: int

    class Config:
        orm_mode = True
