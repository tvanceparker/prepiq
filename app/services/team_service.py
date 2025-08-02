import random
import string
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.employees_repo import EmployeeRepository
from app.repositories.clock_events_repo import ClockEventRepository
from app.repositories.scheduled_shifts_repo import ScheduledShiftRepository
from app.utils.security import get_password_hash
from app.schemas.team_dto import (EmployeeCreateDTO,EmployeeReadDTO,EmployeeUpdateDTO,ClockEventCreateDTO,ClockEventReadDTO,ShiftCreateDTO,ShiftReadDTO, ClockEventUpdateDTO)


def generate_login_code(length: int = 6) -> str:
    """Generate a random 6-digit login code."""
    return ''.join(random.choices('0123456789', k=length))

class TeamService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier:int, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.employee_repo = EmployeeRepository(db, restaurant_id)
        self.clock_event_repo = ClockEventRepository(db, restaurant_id)
        self.shift_repo = ScheduledShiftRepository(db, restaurant_id)


    

    async def create_employee(self, dto: EmployeeCreateDTO) -> EmployeeReadDTO:
        async with self.db.begin():
            # Hash the password before passing to repository
            hashed_password = get_password_hash(dto.password)
            
            # If no login_code is provided, generate one
            login_code = dto.login_code or generate_login_code() 

            # Exclude password from being stored in the employee data directly
            employee_data = dto.model_dump(exclude={"password"})
            employee_data["password_hash"] = hashed_password 
            employee_data["login_code"] = login_code  # Ensure login_code is passed
            
            # Pass the hashed password to repository for creation
            employee = await self.employee_repo.create(employee_data)
            
            # Update the employee record with the hashed password
            await self.employee_repo.update_password(employee.employee_id, hashed_password)
        
        return EmployeeReadDTO.model_validate(employee)

    async def update_employee(self, employee_id: int, dto: EmployeeUpdateDTO) -> EmployeeReadDTO:
        async with self.db.begin():
            # Exclude unset values and password from the update data
            update_data = dto.model_dump(exclude_unset=True, exclude={"password"})
            
            # If there is any update data, update the employee record
            if update_data:
                await self.employee_repo.update(employee_id, update_data)

            # If password is provided, hash it and update the password_hash field
            if dto.password is not None:
                hashed_password = get_password_hash(dto.password)
                # Ensure password_hash is updated
                await self.employee_repo.update_password(employee_id, hashed_password)
            
            # Fetch the updated employee record
            updated_employee = await self.employee_repo.get_by_id(employee_id)

        return EmployeeReadDTO.model_validate(updated_employee)

    async def get_all_employees(self) -> List[EmployeeReadDTO]:
        employees = await self.employee_repo.get_all()
        return [EmployeeReadDTO.model_validate(emp) for emp in employees]

    async def get_employee_by_id(self, employee_id: int) -> EmployeeReadDTO:
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        return EmployeeReadDTO.model_validate(employee)
    

    async def create_shift(self, dto: ShiftCreateDTO) -> ShiftReadDTO:
        async with self.db.begin():
            shift_data = dto.model_dump()
            shift = await self.shift_repo.create(shift_data)
        return ShiftReadDTO.model_validate(shift)

    async def get_all_shifts_for_employee(self, employee_id: int) -> List[ShiftReadDTO]:
        shifts = await self.shift_repo.get_by_employee_id(employee_id)
        return [ShiftReadDTO.model_validate(shift) for shift in shifts]
    
    async def create_clock_event(self, dto: ClockEventCreateDTO) -> ClockEventReadDTO:
        async with self.db.begin():
            clock_event_data = dto.model_dump()
            clock_event = await self.clock_event_repo.create(clock_event_data)
        return ClockEventReadDTO.model_validate(clock_event)

    async def get_clock_events_for_employee(self, employee_id: int) -> List[ClockEventReadDTO]:
        clock_events = await self.clock_event_repo.get_by_employee_id(employee_id)
        return [ClockEventReadDTO.model_validate(event) for event in clock_events]
    
    async def update_clock_event(self, clock_event_id: int, dto: ClockEventUpdateDTO) -> ClockEventReadDTO:
        async with self.db.begin():
            # Update an existing clock event
            update_data = dto.model_dump(exclude_unset=True)
            if not update_data:
                raise HTTPException(status_code=400, detail="No valid data to update.")

            clock_event = await self.clock_event_repo.get_by_id(clock_event_id)
            if not clock_event:
                raise HTTPException(status_code=404, detail="Clock event not found.")

            # Update the clock event
            await self.clock_event_repo.update(clock_event_id, update_data)

            updated_clock_event = await self.clock_event_repo.get_by_id(clock_event_id)
            return ClockEventReadDTO.model_validate(updated_clock_event)