import json
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
import asyncio
from passlib.hash import bcrypt
from fastapi import HTTPException
from typing import Any,Dict,List, Optional
from datetime import datetime, date, timedelta
from app.utils.security import get_password_hash
import random
from scipy.stats import zscore
from app.schemas.admin_dto import RoleSyncDTO
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.activity_logs_repo import ActivityLogRepository
from app.repositories.employees_repo import EmployeeRepository
from app.repositories.forecast_accuracy_repo import ForecastAccuracyRepository
from app.repositories.forecast_breakdown_repo import ForecastBreakdownRepository
from app.repositories.forecasts_repo import ForecastRepository
from app.repositories.daily_forecast_accuracy_repo import DailyForecastAccuracyRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.alerts_repo import AlertRepository
from app.repositories.sales_repo import SalesRepository
from app.repositories.role_permissions_repo import RolePermissionRepository
from app.repositories.roles_repo import RoleRepository
from app.repositories.permissions_repo import PermissionRepository
from app.services.utils.subscription_tiers import normalize_subscription_tier
from app.repositories.employees_repo import EmployeeRepository
from app.services.utils.permissions import (DEFAULT_ROLE_PERMISSIONS_BASIC,DEFAULT_ROLE_PERMISSIONS_MASTER,
                                            DEFAULT_ROLE_PERMISSIONS_PRO,DEFAULT_ROLES_BASIC,DEFAULT_ROLES_MASTER,DEFAULT_ROLES_PRO)
from app.core.logging import logger
from app.schemas.admin_dto import (TenantInfoUpdateRequest, TenantInfoResponse, DayHours, ActivityLogResponse, RoleWithPermissionsDTO, PermissionDTO,
                                   PermissionOut, CreateEmployeeDTO, UpdateEmployeeDTO, EmployeeOutDTO, RoleOutDTO, DeleteRoleResponseDTO )
from collections import defaultdict
from app.utils.logger_helpers import log_method

class AdminService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self.activity_log_repo = ActivityLogRepository(db, restaurant_id, employee_id)
        self.employee_repo = EmployeeRepository(db, restaurant_id)
        self.forecast_accuracy_repo = ForecastAccuracyRepository(db,restaurant_id)
        self.forecast_repo = ForecastRepository(db,restaurant_id)
        self.forecast_breakdown_repo = ForecastBreakdownRepository(db,restaurant_id)
        self.daily_forecast_accuracy_repo = DailyForecastAccuracyRepository(db,restaurant_id)
        self.sales_repo = SalesRepository(db,restaurant_id)
        self.menu_item_repo = MenuItemRepository(db,restaurant_id)
        self.alert_repo = AlertRepository(db,restaurant_id)
        self.role_permission_repo = RolePermissionRepository(db,restaurant_id)
        self.role_repo = RoleRepository(db,restaurant_id)
        self.permission_repo = PermissionRepository(db,restaurant_id)
        self.employee_repo = EmployeeRepository(db,restaurant_id)

    async def log_activity(self, action: str, details: Any = None):
        """
        Create an activity log entry safely.
        Converts details to JSON string if possible, else uses str().
        Adds timestamp to the log.
        """
        try:
            if details is None:
                details_str = ""
            else:
                try:
                    details_str = json.dumps(details, default=lambda o: o.__dict__, indent=2)
                except (TypeError, ValueError):
                    details_str = str(details)

            log_entry = {
                "action": action,
                "details": details_str,
                "created_at": datetime.utcnow().isoformat() + "Z"
            }

            await self.activity_log_repo.create(log_entry)
            logger.info(f"Activity logged: {action}")
        except Exception as e:
            logger.error(f"Failed to log activity '{action}': {e}", exc_info=True)

    
    @log_method("Get tenant info")
    async def get_tenant_info(self) -> Optional[TenantInfoResponse]:
        restaurant = await self.restaurant_repo.get_by_id(self.restaurant_id)
        if not restaurant:
            logger.warning(f"Tenant not found: {self.restaurant_id}")
            return None

        logger.info(f"Fetched tenant info for {self.restaurant_id}")

        return TenantInfoResponse.model_validate(restaurant)

    @log_method("Update tenant info")
    async def update_tenant_info(self, data: TenantInfoUpdateRequest):
        # Serialize hours_of_operation to JSON string for DB storage
        hours_serialized = json.dumps([d.dict() for d in data.hours_of_operation])

        # Convert Pydantic model to dict and overwrite hours_of_operation field
        update_data = data.dict()
        update_data["hours_of_operation"] = hours_serialized

        # Call your repo update with the restaurant_id and updated data
        await self.restaurant_repo.update(self.restaurant_id, update_data)
        logger.info(f"Updated tenant info for {self.restaurant_id}")

        # Log activity with the update details (optional)
        details = {"restaurant_id": self.restaurant_id, **update_data}
        await self.log_activity("update_tenant_info", details)

    @log_method("Get activity logs")
    async def get_activity_logs(self, skip: int = 0, limit: int = 0) -> List[ActivityLogResponse]:
        logs = await self.activity_log_repo.get_all(skip=skip, limit=limit)

        # Fetch employees in parallel
        employee_ids = [log.employee_id for log in logs]
        employees = await asyncio.gather(*[
            self.employee_repo.get_by_id(eid) if eid else None for eid in employee_ids
        ])

        results = [
            ActivityLogResponse(
                activity_id=log.activity_id,
                employee_id=log.employee_id,
                employee_name=(employee.name if employee else "Unknown"),
                action=log.action,
                details=log.details,
                created_at=log.created_at,
            )
            for log, employee in zip(logs, employees)
        ]

        logger.info(f"Fetched {len(results)} activity logs for tenant {self.restaurant_id}")
        return results

    
    @log_method("Checking Sales Data Quality")
    async def check_sales_data_quality(self):
        today = datetime.utcnow().date()
        sales = await self.sales_repo.get_sales_between_dates(
            start_date=today - timedelta(days=90),
            end_date=today
        )

        if not sales:
            return []

        alerts = []

        # 1. Pre-filter low-volume menu items
        recent_sales = await self.sales_repo.get_sales_grouped_by_day(
            start_date=today - timedelta(days=30),
            end_date=today
        )

        sales_count_by_item = defaultdict(int)
        for _, menu_item_id, quantity in recent_sales:
            sales_count_by_item[menu_item_id] += quantity

        # 2. Check for bad values
        for sale in sales:
            if sales_count_by_item[sale.menu_item_id] < 5:
                continue  # skip low-volume items

            if sale.quantity_sold is None or sale.quantity_sold == 0:
                alerts.append({
                    "alert_type": "DataQuality:NullOrZeroQuantity",
                    "message": f"Sale with ID {sale.sale_id} has invalid quantity_sold: {sale.quantity_sold}",
                    "meta": {
                        "sale_id": sale.sale_id,
                        "menu_item_id": sale.menu_item_id,
                        "quantity_sold": sale.quantity_sold,
                        "timestamp": sale.sale_timestamp.isoformat()
                    },
                    "severity": "warning"
                })

            if sale.sales_channel is None:
                alerts.append({
                    "alert_type": "DataQuality:MissingChannel",
                    "message": f"Sale with ID {sale.sale_id} has missing sales_channel.",
                    "meta": {
                        "sale_id": sale.sale_id,
                        "timestamp": sale.sale_timestamp.isoformat()
                    },
                    "severity": "info"
                })

        # 3. Outlier detection
        grouped = defaultdict(list)
        indexed_sales = defaultdict(list)

        for sale in sales:
            if sales_count_by_item[sale.menu_item_id] < 5:
                continue

            grouped[sale.menu_item_id].append(sale.quantity_sold)
            indexed_sales[sale.menu_item_id].append(sale)

        for menu_item_id, quantities in grouped.items():
            if len(quantities) < 5:
                continue

            zscores = zscore(quantities)
            for i, z in enumerate(zscores):
                if abs(z) > 2.5:
                    sale = indexed_sales[menu_item_id][i]
                    alerts.append({
                        "alert_type": "DataQuality:QuantityOutlier",
                        "message": f"Outlier detected for menu item {menu_item_id} with quantity {quantities[i]} (z-score: {z:.2f})",
                        "meta": {
                            "sale_id": sale.sale_id,
                            "menu_item_id": menu_item_id,
                            "quantity_sold": quantities[i],
                            "zscore": round(z, 2),
                            "timestamp": sale.sale_timestamp.isoformat()
                        },
                        "severity": "warning"
                    })

        # === NEW: Fetch item names once before saving ===
        menu_item_ids = {a["meta"]["menu_item_id"] for a in alerts if "menu_item_id" in a["meta"]}
        menu_items = {}
        for item_id in menu_item_ids:
            item = await self.menu_item_repo.get_by_id(item_id)
            if item:
                menu_items[item_id] = item.name

        # 4. Save deduplicated alerts (and substitute names in messages)
        created_alerts = []
        for alert in alerts:
            sale_id = alert["meta"].get("sale_id")
            if sale_id and await self.alert_repo.alert_already_exists(
                alert_type=alert["alert_type"],
                meta_sale_id=sale_id,
            ):
                continue

            # Replace menu_item_id with item name in the message
            message = alert["message"]
            menu_item_id = alert["meta"].get("menu_item_id")
            if menu_item_id and menu_item_id in menu_items:
                item_name = menu_items[menu_item_id]
                message = message.replace(str(menu_item_id), item_name)
                # Optional: include name in meta too
                alert["meta"]["menu_item_name"] = item_name

            created = await self.alert_repo.create({
                "restaurant_id": self.restaurant_id,
                "alert_type": alert["alert_type"],
                "message": message,
                "meta": alert["meta"],
                "severity": alert.get("severity", "info"),
                "role": "System Health",
            })
            created_alerts.append(created)

        return created_alerts
    
    @log_method("Check Database writes")
    async def check_end_of_day_writes(self, check_date: date) -> Dict[str, Any]:
        """
        Check if end-of-day forecasts were correctly written to all relevant tables for check_date,
        including sales data presence.
        Returns a dict with status and details.
        """

        results = {}

        # 1. Check forecasts covering the check_date (forecast_period_start <= check_date <= forecast_period_end)
        forecasts = await self.forecast_repo.get_forecasts_covering_date(check_date)
        results['forecasts'] = {
            'count': len(forecasts),
            'exists': len(forecasts) > 0
        }

        # 2. Check forecast_accuracy overlapping date range (including check_date)
        accuracy_records = await self.forecast_accuracy_repo.get_overlapping_date_range(check_date, check_date)
        results['forecast_accuracy'] = {
            'count': len(accuracy_records),
            'exists': len(accuracy_records) > 0
        }

        # 3. Check daily_forecast_accuracy for check_date
        daily_accuracy_records = await self.daily_forecast_accuracy_repo.get_by_date(check_date)
        results['daily_forecast_accuracy'] = {
            'count': len(daily_accuracy_records),
            'exists': len(daily_accuracy_records) > 0
        }

        # 4. Check forecast_breakdown for check_date
        forecast_breakdowns = await self.forecast_breakdown_repo.get_forecasts_for_date(check_date)
        results['forecast_breakdown'] = {
            'count': len(forecast_breakdowns),
            'exists': len(forecast_breakdowns) > 0
        }

        # 5. Check sales data presence for check_date
        sales_exist = await self.sales_repo.sales_exist_for_dates([check_date])
        results['sales_data'] = {
            'count': 1 if sales_exist else 0,
            'exists': sales_exist
        }

        # Determine overall health including sales data
        all_good = all(entry['exists'] for entry in results.values())
        results['overall_status'] = 'OK' if all_good else 'MISSING_DATA'

        return results

        # --- Role Management ---
    
    # Initialize Default Roles, Permissions, and Role-Permission Mappings
    async def initialize_defaults(self):
        tier = normalize_subscription_tier(self.subscription_tier)
        if tier == "basic":
            roles = DEFAULT_ROLES_BASIC
            role_permissions = DEFAULT_ROLE_PERMISSIONS_BASIC
        elif tier == "full":
            roles = DEFAULT_ROLES_MASTER
            role_permissions = DEFAULT_ROLE_PERMISSIONS_MASTER
        else:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")

        # Insert Roles
        for role in roles:
            exists = await self.role_repo.exists(role["name"])
            if not exists:
                await self.role_repo.create(role)

        # Insert Role-Permissions mappings
        for role_name, perm_names in role_permissions.items():
            role = await self.role_repo.get_by_name(role_name)
            if not role:
                continue  # role not found, skip safely

            for perm_name in perm_names:
                permission = await self.permission_repo.get_by_name(perm_name)
                if not permission:
                    # Permission should exist, skip or log warning
                    continue

                exists = await self.role_permission_repo.exists(role.role_id, permission.permission_id)
                if not exists:
                    await self.role_permission_repo.create({
                        "role_id": role.role_id,
                        "permission_id": permission.permission_id,
                    })

        # Ensure Admin Role exists and assign **all** permissions (regardless of tier)
        admin_role = await self.role_repo.get_by_name("Admin")
        if not admin_role:
            admin_role = await self.role_repo.create({
                "name": "Admin",
                "description": "Has access to all permissions"
            })

        all_permissions = await self.permission_repo.get_all()
        for perm in all_permissions:
            exists = await self.role_permission_repo.exists(admin_role.role_id, perm.permission_id)
            if not exists:
                await self.role_permission_repo.create({
                    "role_id": admin_role.role_id,
                    "permission_id": perm.permission_id
                })

        await self.log_activity(f"initialized_defaults_{tier}")
        return {"detail": f"{tier.capitalize()} roles and permissions initialized successfully."}

 #------------Role Permissions------------------
    @log_method("Get All Roles with Permissions")
    async def get_all_roles_with_permissions(self) -> List[RoleWithPermissionsDTO]:
        roles = await self.role_repo.get_all()
        result: List[RoleWithPermissionsDTO] = []

        for role in roles:
            role_permissions = await self.role_permission_repo.get_by_role_id(role.role_id)
            permission_ids = [rp.permission_id for rp in role_permissions]

            # Convert each permission to DTO using model_validate
            permissions = []
            for pid in permission_ids:
                perm = await self.permission_repo.get_by_id(pid)
                if perm:
                    permissions.append(PermissionDTO.model_validate(perm))

            # Instead of using RoleWithPermissionsDTO(...) manually, use model_validate:
            role_dto = RoleWithPermissionsDTO.model_validate({
                **role.__dict__,  # or role.model_dump() if it's Pydantic
                "permissions": permissions
            })

            result.append(role_dto)

        return result

    @log_method("List All Permissions")
    async def list_all_permissions(self) -> List[PermissionOut]:
        permissions = await self.permission_repo.get_all()
        return [PermissionOut.model_validate(p) for p in permissions]

    @log_method("Sync Roles and Permissions")
    async def sync_roles_and_permissions(
        self,
        roles: List[RoleSyncDTO],
        deleted_roles: List[str]
    ) -> dict:
        # 1. Delete roles
        for role_name in deleted_roles:
            role = await self.role_repo.get_by_name(role_name)
            if role:
                await self.role_repo.delete(role.role_id)
                await self.log_activity("deleted_role", {"role": role_name})

        # 2. Upsert roles and sync permissions
        for role in roles:
            existing = await self.role_repo.get_by_name(role.name)
            if existing:
                await self.role_repo.update(existing.role_id, {"description": role.description})
                role_id = existing.role_id
            else:
                created = await self.role_repo.create({
                    "name": role.name,
                    "description": role.description
                })
                role_id = created.role_id

            # Get permission IDs from names
            permission_objs = []
            for perm_name in role.permission_names:
                perm = await self.permission_repo.get_by_name(perm_name)
                if not perm:
                    raise HTTPException(status_code=400, detail=f"Permission '{perm_name}' does not exist")
                permission_objs.append(perm)

            permission_ids = [p.permission_id for p in permission_objs]
            await self.set_permissions_for_role(role_id, permission_ids)

        await self.log_activity("synced_roles_permissions")
        return {"detail": "Roles and permissions synced"}

        #no route, helper method
    @log_method("Set Permissions for Role")
    async def set_permissions_for_role(self, role_id: int, permission_ids: List[int]) -> None:
        current_rps = await self.role_permission_repo.get_by_role_id(role_id)
        current_permission_ids = {rp.permission_id for rp in current_rps}
        new_permission_ids = set(permission_ids)

        to_add = new_permission_ids - current_permission_ids
        to_remove = current_permission_ids - new_permission_ids

        for pid in to_add:
            await self.role_permission_repo.create({
                "role_id": role_id,
                "permission_id": pid,
            })

        for pid in to_remove:
            await self.role_permission_repo.delete_by_role_and_permission(role_id, pid)

        await self.log_activity("set_permissions_for_role", {
            "role_id": role_id,
            "added_permissions": list(to_add),
            "removed_permissions": list(to_remove),
        })

#------------Create/Update Employees----------------------
    @log_method("Create Employee")
    async def create_employee(self, data: CreateEmployeeDTO):
        role = await self.role_repo.get_by_id(data.role_id)
        if not role:
            raise HTTPException(400, detail="Invalid role ID")

        password_hash = get_password_hash(data.password)
        employee_data = data.to_create_dict(self.restaurant_id, password_hash)

        return await self.employee_repo.create(employee_data)

    @log_method("Update Employee")
    async def update_employee(self, employee_id: int, updates: UpdateEmployeeDTO):
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(404, detail="Employee not found")

        update_data = updates.dict(exclude_unset=True)

        # Handle optional password hashing
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))

        # Validate role_id if provided
        if "role_id" in update_data:
            role = await self.role_repo.get_by_id(update_data["role_id"])
            if not role:
                raise HTTPException(400, detail="Invalid role ID")

        return await self.employee_repo.update(employee_id, update_data)
    
    @log_method("Disable Employee")
    async def disable_employee(self, employee_id: int):
        employee = await self.employee_repo.get_by_id(employee_id)
        if not employee:
            raise HTTPException(404, detail="Employee not found")

        return await self.employee_repo.update(employee_id, {"is_active": False})
    
    @log_method("Get All Employees")
    async def get_all_employees(self) -> List[EmployeeOutDTO]:
        employees = await self.employee_repo.get_all()
        return [EmployeeOutDTO.model_validate(emp) for emp in employees]
    
    async def get_roles(self) -> List[RoleOutDTO]:
        roles = await self.role_repo.get_all()
        return [RoleOutDTO.model_validate(role) for role in roles]

    @log_method("Delete Role Cleanup")
    async def delete_role_cleanup(self, role_id: int) -> DeleteRoleResponseDTO:
        # 1. Delete all role-permission mappings for this role
        role_permissions = await self.role_permission_repo.get_by_role_id(role_id)
        for rp in role_permissions:
            await self.role_permission_repo.delete_by_role_and_permission(role_id, rp.permission_id)

        # 2. Set Employees' role_id to NULL where role_id == role_id
        employees = await self.employee_repo.get_by_role_id(role_id)
        for employee in employees:
            employee.role_id = None
            await self.employee_repo.update(employee.employee_id, {"role_id": None})

        # 3. Delete the actual role record
        await self.role_repo.delete(role_id)

        # Optionally log activity
        await self.log_activity("deleted_role_cleanup", {"role_id": role_id})

        return DeleteRoleResponseDTO(detail=f"Role {role_id} deleted with cleanup: permissions removed, employees unassigned")


