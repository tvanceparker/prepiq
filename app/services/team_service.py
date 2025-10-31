import random
import string
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.employees_repo import EmployeeRepository
from app.repositories.clock_events_repo import ClockEventRepository
from app.repositories.scheduled_shifts_repo import ScheduledShiftRepository
from app.utils.security import get_password_hash
from app.schemas.team_dto import (
    EmployeeCreateDTO,
    EmployeeReadDTO,
    EmployeeUpdateDTO,
    ClockEventCreateDTO,
    ClockEventReadDTO,
    ShiftCreateDTO,
    ShiftReadDTO,
    ClockEventUpdateDTO,
    ShiftScheduleRequest,
    ShiftScheduleResponse,
)


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

    async def create_scheduled_shift(
        self, shift_data: ShiftScheduleRequest
    ) -> ShiftScheduleResponse:
        """
        Create a scheduled shift for an employee.
        """
        from datetime import datetime, timedelta
        
        # Get employee details
        employee = await self.employee_repo.get_by_id(shift_data.employee_id)
        if not employee:
            raise ValueError(f"Employee with ID {shift_data.employee_id} not found")
        
        # Combine date and time to create datetime objects
        shift_start = datetime.combine(
            shift_data.shift_date,
            datetime.strptime(shift_data.shift_start_time, "%H:%M").time()
        )
        shift_end = datetime.combine(
            shift_data.shift_date,
            datetime.strptime(shift_data.shift_end_time, "%H:%M").time()
        )
        
        # If shift_end is before shift_start, it crosses midnight
        if shift_end < shift_start:
            shift_end += timedelta(days=1)
        
        # Create the shift
        shift_dict = {
            "employee_id": shift_data.employee_id,
            "shift_start": shift_start,
            "shift_end": shift_end,
            "shift_type": shift_data.shift_type,
            "restaurant_id": self.restaurant_id,
        }
        
        new_shift = await self.shift_repo.create(shift_dict)
        
        # Calculate duration
        duration_hours = (shift_end - shift_start).total_seconds() / 3600
        
        return ShiftScheduleResponse(
            shift_id=new_shift.shift_id,
            employee_id=new_shift.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}",
            shift_date=shift_data.shift_date,
            shift_start_time=shift_data.shift_start_time,
            shift_end_time=shift_data.shift_end_time,
            shift_type=new_shift.shift_type,
            duration_hours=round(duration_hours, 2),
        )

    async def get_weekly_schedule(
        self, start_date: str, end_date: str = None
    ) -> list[ShiftScheduleResponse]:
        """
        Get all scheduled shifts for a date range.
        """
        from datetime import datetime, timedelta
        
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        if end_date:
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        else:
            end = start + timedelta(days=6)  # Default to 7 days
        
        # Query shifts within the date range
        shifts = await self.shift_repo.get_shifts_by_date_range(start, end)
        
        # Get all employees to map names
        employees_dict = {}
        for shift in shifts:
            if shift.employee_id not in employees_dict:
                employee = await self.employee_repo.get_by_id(shift.employee_id)
                if employee:
                    employees_dict[shift.employee_id] = f"{employee.first_name} {employee.last_name}"
        
        # Build response
        schedule = []
        for shift in shifts:
            duration_hours = (shift.shift_end - shift.shift_start).total_seconds() / 3600
            
            schedule.append(
                ShiftScheduleResponse(
                    shift_id=shift.shift_id,
                    employee_id=shift.employee_id,
                    employee_name=employees_dict.get(shift.employee_id, "Unknown"),
                    shift_date=shift.shift_start.date(),
                    shift_start_time=shift.shift_start.strftime("%H:%M"),
                    shift_end_time=shift.shift_end.strftime("%H:%M"),
                    shift_type=shift.shift_type,
                    duration_hours=round(duration_hours, 2),
                )
            )
        
        return schedule

    async def update_scheduled_shift(
        self, shift_id: int, shift_data: ShiftScheduleRequest
    ) -> ShiftScheduleResponse:
        """
        Update an existing scheduled shift.
        """
        from datetime import datetime, timedelta
        
        # Get existing shift
        existing_shift = await self.shift_repo.get_by_id(shift_id)
        if not existing_shift:
            raise ValueError(f"Shift with ID {shift_id} not found")
        
        # Get employee details
        employee = await self.employee_repo.get_by_id(shift_data.employee_id)
        if not employee:
            raise ValueError(f"Employee with ID {shift_data.employee_id} not found")
        
        # Combine date and time
        shift_start = datetime.combine(
            shift_data.shift_date,
            datetime.strptime(shift_data.shift_start_time, "%H:%M").time()
        )
        shift_end = datetime.combine(
            shift_data.shift_date,
            datetime.strptime(shift_data.shift_end_time, "%H:%M").time()
        )
        
        if shift_end < shift_start:
            shift_end += timedelta(days=1)
        
        # Update the shift
        update_dict = {
            "employee_id": shift_data.employee_id,
            "shift_start": shift_start,
            "shift_end": shift_end,
            "shift_type": shift_data.shift_type,
        }
        
        updated_shift = await self.shift_repo.update(shift_id, update_dict)
        
        duration_hours = (shift_end - shift_start).total_seconds() / 3600
        
        return ShiftScheduleResponse(
            shift_id=updated_shift.shift_id,
            employee_id=updated_shift.employee_id,
            employee_name=f"{employee.first_name} {employee.last_name}",
            shift_date=shift_data.shift_date,
            shift_start_time=shift_data.shift_start_time,
            shift_end_time=shift_data.shift_end_time,
            shift_type=updated_shift.shift_type,
            duration_hours=round(duration_hours, 2),
        )

    async def delete_scheduled_shift(self, shift_id: int) -> bool:
        """
        Delete a scheduled shift.
        """
        existing_shift = await self.shift_repo.get_by_id(shift_id)
        if not existing_shift:
            raise ValueError(f"Shift with ID {shift_id} not found")
        
        await self.shift_repo.delete(shift_id)
        return True

    async def get_team_insights(self, start_date: str, end_date: str):
        """
        Get team analytics and insights for a date range.
        """
        from datetime import datetime, timedelta
        from collections import defaultdict
        from app.schemas.team_dto import TeamInsightsResponse, EmployeePerformanceDTO
        
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        # Get all employees
        employees = await self.employee_repo.get_all()
        active_employees = [e for e in employees if e.is_active]
        
        # Get clock events in date range
        clock_events = await self.clock_event_repo.get_by_date_range(start, end)
        
        # Get shifts in date range
        shifts = await self.shift_repo.get_shifts_by_date_range(start.date(), end.date())
        
        # Calculate metrics
        total_hours = 0
        total_labor_cost = 0
        employee_stats = defaultdict(lambda: {
            'hours': 0, 
            'shifts': 0, 
            'on_time': 0, 
            'late': 0,
            'name': '',
            'role': '',
            'pay_rate': 0
        })
        
        hours_by_day = defaultdict(float)
        shifts_by_type = defaultdict(int)
        
        # Process clock events for actual hours worked
        for event in clock_events:
            if event.clock_in and event.clock_out:
                duration = (event.clock_out - event.clock_in).total_seconds() / 3600
                total_hours += duration
                
                employee = next((e for e in employees if e.employee_id == event.employee_id), None)
                if employee:
                    employee_stats[event.employee_id]['hours'] += duration
                    employee_stats[event.employee_id]['name'] = f"{employee.first_name} {employee.last_name}"
                    employee_stats[event.employee_id]['role'] = employee.role_id  # You may want to map this to role name
                    employee_stats[event.employee_id]['pay_rate'] = float(employee.pay_rate) if employee.pay_rate else 0
                    
                    # Calculate labor cost
                    labor_cost = duration * (float(employee.pay_rate) if employee.pay_rate else 0)
                    total_labor_cost += labor_cost
                    
                    # Track hours by day
                    day_key = event.clock_in.strftime('%Y-%m-%d')
                    hours_by_day[day_key] += duration
        
        # Process shifts for scheduling analysis
        late_count = 0
        for shift in shifts:
            duration = (shift.shift_end - shift.shift_start).total_seconds() / 3600
            
            employee_stats[shift.employee_id]['shifts'] += 1
            shifts_by_type[shift.shift_type] += 1
            
            # Check if employee clocked in on time (within 5 minutes of shift start)
            matching_clock = next((c for c in clock_events 
                                  if c.employee_id == shift.employee_id 
                                  and abs((c.clock_in - shift.shift_start).total_seconds()) < 300), None)
            
            if matching_clock:
                if matching_clock.clock_in <= shift.shift_start + timedelta(minutes=5):
                    employee_stats[shift.employee_id]['on_time'] += 1
                else:
                    employee_stats[shift.employee_id]['late'] += 1
                    late_count += 1
        
        # Calculate employee performance metrics
        top_performers = []
        for emp_id, stats in employee_stats.items():
            if stats['shifts'] > 0:
                on_time_pct = (stats['on_time'] / stats['shifts']) * 100 if stats['shifts'] > 0 else 0
                avg_shift = stats['hours'] / stats['shifts'] if stats['shifts'] > 0 else 0
                
                top_performers.append(EmployeePerformanceDTO(
                    employee_id=emp_id,
                    employee_name=stats['name'],
                    total_hours=round(stats['hours'], 2),
                    total_shifts=stats['shifts'],
                    avg_shift_duration=round(avg_shift, 2),
                    on_time_percentage=round(on_time_pct, 1),
                    role=str(stats['role'])
                ))
        
        # Sort by total hours
        top_performers.sort(key=lambda x: x.total_hours, reverse=True)
        
        # Calculate overall metrics
        total_shifts_count = sum(1 for s in shifts)
        on_time_total = sum(stats['on_time'] for stats in employee_stats.values())
        on_time_rate = (on_time_total / total_shifts_count * 100) if total_shifts_count > 0 else 0
        
        avg_hours_per_employee = total_hours / len(active_employees) if len(active_employees) > 0 else 0
        avg_cost_per_hour = total_labor_cost / total_hours if total_hours > 0 else 0
        
        return TeamInsightsResponse(
            total_employees=len(employees),
            active_employees=len(active_employees),
            total_hours_worked=round(total_hours, 2),
            total_shifts=total_shifts_count,
            avg_hours_per_employee=round(avg_hours_per_employee, 2),
            total_labor_cost=round(total_labor_cost, 2),
            avg_cost_per_hour=round(avg_cost_per_hour, 2),
            labor_cost_percentage=None,  # Could be calculated with revenue data
            on_time_rate=round(on_time_rate, 1),
            late_clock_ins=late_count,
            missed_shifts=0,  # Would need additional logic to detect missed shifts
            top_performers=top_performers[:10],  # Top 10
            hours_by_day=dict(hours_by_day),
            shifts_by_type=dict(shifts_by_type)
        )
