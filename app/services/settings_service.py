from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.activity_logs_repo import ActivityLogRepository
from app.repositories.employees_repo import EmployeeRepository
from app.repositories.roles_repo import RoleRepository
from app.repositories.role_permissions_repo import RolePermissionRepository
from app.repositories.permissions_repo import PermissionRepository
from app.utils.logger_helpers import log_method
from app.utils.security import verify_password, get_password_hash
from app.core.logging import logger 
import json
from typing import Any, List
from datetime import datetime

class SettingsService:
    def __init__(self,db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.restaurant_repo = RestaurantRepository(db,restaurant_id)
        self.activity_log_repo = ActivityLogRepository(db,restaurant_id,employee_id)
        self.employee_repo = EmployeeRepository(db,restaurant_id)
        self.role_repo = RoleRepository(db,restaurant_id)
        self.role_permission_repo = RolePermissionRepository(db,restaurant_id)
        self.permission_repo = PermissionRepository(db,restaurant_id)


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
    @log_method("Get Restaurant Settings")
    async def get_restaurant_settings(self) -> dict:
        settings_row = await self.restaurant_repo.get_settings()  # Returns dict-like row
        if not settings_row:
            return {}

        settings_dict = dict(settings_row)
        settings_blob = settings_dict.get("settings") or {}
        # expose inventory deduction mode as top-level field with default fallback
        settings_dict["inventory_deduction_mode"] = settings_blob.get(
            "inventory_deduction_mode", "eod"
        )
        settings_dict["settings"] = settings_blob
        return settings_dict

    @log_method("Update Restaurant Settings")
    async def update_restaurant_settings(self, update_data: dict):
        logger.info("Updating Restaurant Settings:{update_data}")
        # update_data may be a Pydantic DTO or dict; accept both
        if hasattr(update_data, "dict"):
            update_payload = update_data.dict(exclude_unset=True)
        else:
            update_payload = update_data

        inventory_mode = update_payload.pop("inventory_deduction_mode", None)
        new_settings_fragment = update_payload.pop("settings", None) or {}

        if inventory_mode is not None:
            new_settings_fragment["inventory_deduction_mode"] = inventory_mode

        if new_settings_fragment:
            settings_row = await self.restaurant_repo.get_settings()
            current_settings = {}
            if settings_row:
                current_settings = dict(settings_row).get("settings") or {}
            merged_settings = {**current_settings, **new_settings_fragment}
            update_payload["settings"] = merged_settings

        await self.restaurant_repo.update(self.restaurant_id, update_payload)
        details = {
                "restaurant_id": self.restaurant_id,
                "updated_fields": update_data
            }

        await self.log_activity("update_restaurant_settings", details)

    # --- Change Password ---
    @log_method("Change Password")
    async def change_password(self, current_password: str, new_password: str):
        employee = await self.employee_repo.get_by_id(self.employee_id)
        if not verify_password(current_password, employee.password_hash):
            raise HTTPException(status_code=403, detail="Incorrect current password")
        
        new_hashed = get_password_hash(new_password)
        await self.employee_repo.update(self.employee_id, {"password_hash": new_hashed})
        await self.log_activity("password_changed")
        return {"detail": "Password updated successfully"}


    # --- Change Email ---
    @log_method("Change Email")
    async def change_email(self, current_password: str, new_email: str):
        employee = await self.employee_repo.get_by_id(self.employee_id)
        if not verify_password(current_password, employee.password_hash):
            raise HTTPException(status_code=403, detail="Incorrect password")
        
        await self.employee_repo.update(self.employee_id, {"email": new_email})
        await self.log_activity("email_changed", {"new_email": new_email})
        return {"email": new_email}


    # --- Change Phone ---
    @log_method("Change Phone")
    async def change_phone(self, current_password: str, new_phone: str):
        employee = await self.employee_repo.get_by_id(self.employee_id)
        if not verify_password(current_password, employee.password_hash):
            raise HTTPException(status_code=403, detail="Incorrect password")
        
        await self.employee_repo.update(self.employee_id, {"phone": new_phone})
        await self.log_activity("phone_changed", {"new_phone": new_phone})
        return {"phone": new_phone}

    # --- Update Preferences ---
    @log_method("Update User Preferences")
    async def update_preferences(self, preferences_update: dict) -> dict:
        employee = await self.employee_repo.get_by_id(self.employee_id)
        current_prefs = employee.preferences or {}

        # Merge existing preferences with the update dict
        updated_prefs = {**current_prefs, **preferences_update}

        await self.employee_repo.update(self.employee_id, {"preferences": updated_prefs})
        await self.log_activity("preferences_updated", updated_prefs)

        return updated_prefs
    
    @log_method("Get Employee Account Info")
    async def get_employee_account_info(self):
        # Fetch employee by id
        employee = await self.employee_repo.get_by_id(self.employee_id)
        if not employee:
            raise Exception("Employee not found")
        
        role = await self.role_repo.get_by_id(employee.role_id)
        role_name = role.name

        # Fetch restaurant name and optional coords by restaurant_id
        restaurant = await self.restaurant_repo.get_by_id(employee.restaurant_id)
        restaurant_name = restaurant.name if restaurant else None
        restaurant_lat = getattr(restaurant, "latitude", None) if restaurant else None
        restaurant_lon = getattr(restaurant, "longitude", None) if restaurant else None

        # Build preferences (JSON field) safely
        preferences = employee.preferences or {}

        return {
            "name": employee.name,
            "role": role_name,
            "email": employee.email,
            "phone": employee.phone,
            "preferences": preferences,
            "restaurant_name": restaurant_name,
            "restaurant_latitude": float(restaurant_lat) if restaurant_lat is not None else None,
            "restaurant_longitude": float(restaurant_lon) if restaurant_lon is not None else None,
        }

    # =============================================================================
    # POS Mode Settings
    # =============================================================================

    @log_method("Get POS Mode Settings")
    async def get_pos_mode_settings(self) -> dict:
        """Get the current POS mode configuration for the restaurant."""
        restaurant = await self.restaurant_repo.get_by_id(self.restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found")

        return {
            "pos_mode": restaurant.pos_mode or "none",
            "pos_provider": restaurant.pos_provider or "none",
        }

    @log_method("Update POS Mode Settings")
    async def update_pos_mode_settings(
        self,
        pos_mode: str,
        pos_provider: str = None,
    ) -> dict:
        """
        Update the POS mode configuration.
        
        Args:
            pos_mode: 'none' or 'external'
            pos_provider: For external mode, the provider name (square, toast, clover)
        """
        if pos_mode not in ("none", "external"):
            raise HTTPException(
                status_code=400,
                detail="Invalid pos_mode. Must be 'none' or 'external'"
            )
        
        if pos_mode == "external" and pos_provider not in ("square", "toast", "clover"):
            raise HTTPException(
                status_code=400,
                detail="For external mode, pos_provider must be 'square', 'toast', or 'clover'"
            )
        
        update_data = {
            "pos_mode": pos_mode,
        }
        
        # Only set provider if external mode
        if pos_mode == "external":
            update_data["pos_provider"] = pos_provider
        else:
            # Clear provider when switching back to no provider configured.
            update_data["pos_provider"] = "none"
        
        await self.restaurant_repo.update(self.restaurant_id, update_data)
        await self.log_activity("pos_mode_updated", {
            "pos_mode": pos_mode,
            "pos_provider": pos_provider,
        })
        
        return await self.get_pos_mode_settings()