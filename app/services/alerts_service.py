from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict
import enum
from scipy.stats import zscore
import numpy as np
from collections import defaultdict
from app.repositories.alerts_repo import AlertRepository
from app.repositories.inventory_deduction_discrepancies_repo import InventoryDeductionDiscrepancyRepository
from app.repositories.sales_repo import SalesRepository
from app.repositories.activity_logs_repo import ActivityLogRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.sales_repo import SalesRepository
from datetime import datetime
from app.services.utils.convert import to_dict
from app.core.logging import logger
from datetime import timedelta
from app.utils.logger_helpers import log_method
from typing import Any
import json


class AlertsService:
    _SEVERITY_MAP = {
        "high": "urgent",
        "critical": "urgent",
    }
    _SEVERITY_ALLOWED = {"info", "warning", "urgent"}

    def __init__(self,db:AsyncSession, restaurant_id: int, subscription_tier: str,employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.alert_repo = AlertRepository(db,restaurant_id)
        self.discrepancy_repo = InventoryDeductionDiscrepancyRepository(db, restaurant_id)
        self.sales_repo = SalesRepository(db,restaurant_id)
        self.menu_item_repo = MenuItemRepository(db,restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.activity_log_repo = ActivityLogRepository(db,restaurant_id,employee_id)

    def _normalize_severity(self, severity: Optional[object]) -> str:
        if severity is None:
            return "info"
        if isinstance(severity, enum.Enum):
            value = str(severity.value)
        else:
            value = str(severity)
        normalized = value.strip().lower()
        if normalized in self._SEVERITY_ALLOWED:
            return normalized
        if normalized in self._SEVERITY_MAP:
            return self._SEVERITY_MAP[normalized]
        return "warning"

    def _normalize_alert(self, alert: Dict[str, object]) -> Dict[str, object]:
        if not alert:
            return alert
        alert["severity"] = self._normalize_severity(alert.get("severity"))
        operator_copy = self._build_operator_copy(alert)
        alert.update(operator_copy)
        if operator_copy.get("description"):
            alert["message"] = operator_copy["description"]
        return alert

    def _humanize_alert_type(self, alert_type: str) -> str:
        cleaned = alert_type.replace(':', ' ').replace('_', ' ')
        return ' '.join(part for part in cleaned.split() if part).title()

    def _format_quantity(self, value: object) -> Optional[str]:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return None
        if numeric.is_integer():
            return str(int(numeric))
        return f"{numeric:.2f}".rstrip("0").rstrip(".")

    def _build_operator_copy(self, alert: Dict[str, object]) -> Dict[str, str]:
        alert_type = str(alert.get("alert_type") or "")
        meta = alert.get("meta") or {}
        meta = meta if isinstance(meta, dict) else {}
        raw_message = str(alert.get("message") or "").strip()

        if alert_type == "Inventory:DeductionFailed":
            item_name = (
                meta.get("ingredient_name")
                or meta.get("item_name")
                or meta.get("batch_recipe_name")
                or "inventory item"
            )
            required_quantity = self._format_quantity(meta.get("required_quantity"))
            available_quantity = self._format_quantity(
                meta.get("current_quantity_on_hand", meta.get("available_quantity"))
            )
            unit = str(meta.get("unit") or "").strip()
            quantity_suffix = f" {unit}" if unit else ""

            if required_quantity is not None and available_quantity is not None:
                description = (
                    f"{item_name} needed {required_quantity}{quantity_suffix}, but only "
                    f"{available_quantity}{quantity_suffix} was available. Review inventory and confirm the counted stock."
                )
            else:
                description = (
                    f"{item_name} could not be deducted from inventory. Review the item and confirm the counted stock."
                )

            return {
                "title": f"Inventory shortfall: {item_name}",
                "action_label": "Review inventory",
                "description": description,
            }

        if alert_type == "DataQuality:MissingChannel":
            return {
                "title": "Missing sales channel",
                "action_label": "Set channel",
                "description": "A sale is missing its sales channel. Set the channel so reporting and forecasting stay accurate.",
            }

        if alert_type == "DataQuality:NullOrZeroQuantity":
            item_name = meta.get("menu_item_name") or "sale"
            return {
                "title": "Zero or missing quantity",
                "action_label": "Correct quantity",
                "description": f"A recorded {item_name} sale has a zero or missing quantity. Correct it before trusting today\'s totals.",
            }

        if alert_type == "DataQuality:QuantityOutlier":
            item_name = meta.get("menu_item_name") or "sale"
            return {
                "title": "Quantity looks unusual",
                "action_label": "Review quantity",
                "description": f"A recorded {item_name} sale looks unusual compared with recent activity. Review the quantity before using it for decisions.",
            }

        if alert_type == "LowStock":
            item_name = meta.get("ingredient_name") or "An inventory item"
            current_stock = self._format_quantity(meta.get("current_stock"))
            reorder_point = self._format_quantity(meta.get("reorder_point"))
            if current_stock is not None and reorder_point is not None:
                description = (
                    f"{item_name} is at {current_stock}, below the reorder point of {reorder_point}. Review reorder suggestions soon."
                )
            else:
                description = f"{item_name} is below its reorder point. Review reorder suggestions soon."
            return {
                "title": "Low stock warning",
                "action_label": "Review reorder",
                "description": description,
            }

        if alert_type == "MissingSalesData":
            return {
                "title": "Missing sales data",
                "action_label": "Upload sales",
                "description": "No sales data was found for this run. Upload or sync sales before rerunning forecast and EOD workflows.",
            }

        if alert_type == "prep_incomplete":
            batch_recipe_id = meta.get("batch_recipe_id")
            if batch_recipe_id is not None:
                description = (
                    f"A scheduled prep task for batch recipe {batch_recipe_id} was not marked complete. Review prep status before closing the day."
                )
            else:
                description = "A scheduled prep task was not marked complete. Review prep status before closing the day."
            return {
                "title": "Prep not completed",
                "action_label": "Review prep",
                "description": description,
            }

        return {
            "title": self._humanize_alert_type(alert_type),
            "action_label": "Review details",
            "description": raw_message or "Review this alert for more details.",
        }

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
    @log_method("Create Alert")
    async def create_alert(
        self,
        alert_type: str,
        message: str,
        severity: str,  # severity param added
        employee_id: Optional[int] = None,
        role: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> dict:
        alert_data = {
            "alert_type": alert_type,
            "message": message,
            "employee_id": employee_id,
            "role": role,
            "meta": meta,
            "status": "Active",
            "severity": self._normalize_severity(severity),  # fixed colon and added comma
            "is_acknowledged": False,
        }
        alert_obj = await self.alert_repo.create(alert_data)
        return self._normalize_alert(to_dict(alert_obj))

    @log_method("Get Active Alerts")
    async def get_active_alerts(self, skip: int = 0, limit: int = 20) -> List[dict]:
        alerts = await self.alert_repo.get_by_status(["Active","Acknowledged"], skip, limit)
        return [self._normalize_alert(to_dict(alert)) for alert in alerts]
    
    @log_method("Resolve Alert")
    async def resolve_alert(self, alert_id: int) -> Optional[dict]:
        alert_obj = await self.alert_repo.get_by_id(alert_id)
        if not alert_obj:
            return None

        update_data = {"status": "Resolved", "date_resolved": datetime.utcnow()}
        updated_alert = await self.alert_repo.update(alert_id, update_data)

        if updated_alert and alert_obj.alert_type == "Inventory:DeductionFailed":
            await self.discrepancy_repo.mark_resolved_by_alert_id(alert_id)

        await self.log_activity("Resolve Alert", {
            "alert_id": alert_id,
            "new_status": update_data["status"],
            "date_resolved": update_data["date_resolved"].isoformat() + "Z"
        })

        return self._normalize_alert(to_dict(updated_alert))

    @log_method("Acknowlodge Alert")
    async def acknowledge_alert(self, alert_id: int) -> Optional[dict]:
        alert_obj = await self.alert_repo.get_by_id(alert_id)
        if not alert_obj:
            return None

        update_data = {"is_acknowledged": True, "status": "Acknowledged"}
        updated_alert = await self.alert_repo.update(alert_id, update_data)

        if updated_alert and alert_obj.alert_type == "Inventory:DeductionFailed":
            await self.discrepancy_repo.mark_acknowledged_by_alert_id(alert_id)

        await self.log_activity("Acknowledge Alert", {
            "alert_id": alert_id,
            "is_acknowledged": update_data["is_acknowledged"],
            "new_status": update_data["status"],
        })

        return self._normalize_alert(to_dict(updated_alert))
        
    @log_method("Get All alerts")   
    async def get_all_alerts(self, skip: int = 0, limit: int = 50):
        # Fetch all alerts, no filter on status
        alerts = await self.alert_repo.get_all(skip=skip, limit=limit)
        return [self._normalize_alert(to_dict(alert)) for alert in alerts]
    
   
    @log_method("Fixing Alert")
    async def fix_alert(self, alert_id: str, fix_data: dict) -> bool:
        alert = await self.alert_repo.get_by_id(alert_id)
        if not alert:
            logger.warning(f"Alert ID {alert_id} not found.")
            return False

        alert_type = alert.alert_type
        meta = alert.meta or {}
        sale_id = meta.get("sale_id")

        logger.info(f"Fixing alert of type {alert_type} with data: {fix_data}")

        fixed = False

        if alert_type == "DataQuality:NullOrZeroQuantity":
            if not sale_id:
                logger.warning(f"Missing sale_id in alert meta for alert {alert_id}.")
                return False
            new_quantity = fix_data.get("quantity_sold")
            if new_quantity is not None:
                await self.sales_repo.update(sale_id, {"quantity_sold": new_quantity})
                fixed = True

        elif alert_type == "DataQuality:MissingChannel":
            if not sale_id:
                logger.warning(f"Missing sale_id in alert meta for alert {alert_id}.")
                return False
            new_channel = fix_data.get("sales_channel", "unknown")
            await self.sales_repo.update(sale_id, {"sales_channel": new_channel})
            fixed = True

        elif alert_type == "DataQuality:QuantityOutlier":
            if not sale_id:
                logger.warning(f"Missing sale_id in alert meta for alert {alert_id}.")
                return False
            new_quantity = fix_data.get("quantity_sold")
            if new_quantity is not None:
                await self.sales_repo.update(sale_id, {"quantity_sold": new_quantity})
                fixed = True

        elif alert_type == "Inventory:DeductionFailed":
            ingredient_id = meta.get("ingredient_id")
            required_quantity = float(meta.get("required_quantity") or 0)
            available_quantity = float(meta.get("available_quantity") or 0)
            unit = meta.get("unit") or "count"

            if ingredient_id is None:
                logger.warning(
                    f"Inventory fix for alert {alert_id} missing ingredient_id in meta."
                )
                return False

            target_quantity = fix_data.get("target_quantity_on_hand")
            if target_quantity is None:
                target_quantity = max(required_quantity, available_quantity)

            try:
                target_quantity = float(target_quantity)
            except (TypeError, ValueError):
                logger.warning(
                    f"Invalid target_quantity_on_hand for alert {alert_id}: {target_quantity}"
                )
                return False

            if target_quantity < 0:
                logger.warning(
                    f"Negative target_quantity_on_hand for alert {alert_id}: {target_quantity}"
                )
                return False

            inventory_entry = await self.inventory_repo.get_inventory_by_ingredient(
                int(ingredient_id)
            )

            if inventory_entry:
                await self.inventory_repo.update(
                    inventory_entry.inventory_id,
                    {"quantity_on_hand": target_quantity},
                )
            else:
                await self.inventory_repo.create(
                    {
                        "ingredient_id": int(ingredient_id),
                        "quantity_on_hand": target_quantity,
                        "min_stock_level": 0,
                        "unit": str(unit),
                    }
                )

            fixed = True

        if fixed:
            await self.alert_repo.resolve(alert_id)
            logger.info(f"Alert {alert_id} marked as resolved.")
            return True

        logger.warning(f"Fix data was invalid or alert type not supported for {alert_id}")
        return False
    
    async def get_active_alert_count(self) -> int:
        return await self.alert_repo.count_by_status("Active")
