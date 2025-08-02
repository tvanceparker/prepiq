# app/schemas/menu_items_dto.py

from pydantic import BaseModel
from typing import Optional, List


class MenuItemBase(BaseModel):
    restaurant_id: int
    name: str
    price: float
    category: Optional[str] = None
    is_active: Optional[bool] = True


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(MenuItemBase):
    pass


class MenuItem(MenuItemBase):
    menu_item_id: int

    class Config:
        orm_mode = True


class MenuItemUpdateRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    recipes: Optional[List[int]] = None

    class Config:
        orm_mode = True  # Ensures that this can be used with ORM objects if needed
