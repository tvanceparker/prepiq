# app/repositories/employees_repo.py
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.employees_orm import Employee
from app.repositories.base_repository import BaseRepository
from typing import List, Optional
from sqlalchemy.future import select


class EmployeeRepository(BaseRepository):
    def __init__(self, db: AsyncSession, restaurant_id: int = None):
        self.db = db
        self.restaurant_id = restaurant_id
        super().__init__(db, Employee, restaurant_id, pk_field="employee_id")

    async def get_by_username(self, username: str):
        stmt = select(Employee).where(Employee.username == username)

        # If restaurant_id is set, filter by it
        if self.restaurant_id is not None:
            stmt = stmt.where(Employee.restaurant_id == self.restaurant_id)

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_by_role_id(self, role_id: int):
        stmt = select(Employee).filter_by(role_id=role_id)
        if self.restaurant_id:
            stmt = stmt.filter_by(restaurant_id=self.restaurant_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def update_password(self, employee_id: int, hashed_password: str) -> Employee:
        # Update the password field in the employee record
        result = await self.db.execute(
            select(self.model).filter(
                self._pk_filter(employee_id), self.model.restaurant_id == self.restaurant_id
            )
        )
        employee = result.scalars().first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Set the hashed password
        employee.password_hash = hashed_password

        await self.db.flush()
        await self.db.refresh(employee)
        return employee