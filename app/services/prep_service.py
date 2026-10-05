# app/services/prep_service.py

from app.repositories.batch_recipe_ingredients_repo import (
    BatchRecipeIngredientRepository,
)
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.batch_recipe_ingredients_repo import BatchRecipeIngredientRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.prep_schedule_repo import PrepScheduleRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.inventory_repo import InventoryRepository
from app.repositories.employees_repo import EmployeeRepository
from app.schemas.prep_dto import BatchRecipeIngredientCreate, PrepScheduleUpdate, PrepLogResponse, WasteLogResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional
from decimal import Decimal
from datetime import date, timedelta, datetime
from app.services.utils.unit_conversion import convert_unit, normalize_unit
from app.services.utils.graph_validation import (
    normalize_batch_component_type,
    normalize_component_type,
    units_are_compatible,
)
import logging
from sqlalchemy import select
from app.db.models.prep_schedule_orm import PrepSchedule
from app.db.models.inventory_orm import Inventory
from app.db.models.waste_report_orm import WasteReport
from uuid import uuid4
from app.db.models.inventory_lot_orm import InventoryLot
from app.services.utils.inventory_consumption import InventoryConsumption



class PrepService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.batch_recipe_ingredient_repo = BatchRecipeIngredientRepository(
            db, restaurant_id
        )
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)
        self.batch_recipe_ingredient_repo = BatchRecipeIngredientRepository(db,restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.inventory_usage_log_repo = InventoryUsageLogRepository(db, restaurant_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)
        self.menu_item_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.menu_item_repo = MenuItemRepository(db, restaurant_id)
        self.prep_schedule_repo = PrepScheduleRepository(db, restaurant_id)
        self.inventory_lot_repo = InventoryLotRepository(db, restaurant_id)
        self.inventory_repo = InventoryRepository(db, restaurant_id)
        self.employee_repo = EmployeeRepository(db, restaurant_id)

    async def _get_batch_component_reference_unit(
        self,
        reference_id: int,
        ingredient_type: str,
    ) -> str | None:
        if ingredient_type == "ingredient":
            ingredient = await self.ingredient_repo.get_by_id(reference_id)
            if not ingredient:
                raise ValueError(f"Ingredient reference {reference_id} not found.")
            if getattr(ingredient, "is_active", True) is False:
                raise ValueError(
                    f"Ingredient reference {reference_id} is archived and cannot be reused."
                )
            return getattr(ingredient, "unit", None)

        batch_recipe = await self.batch_recipe_repo.get_by_id(reference_id)
        if not batch_recipe:
            raise ValueError(f"Batch recipe reference {reference_id} not found.")
        if getattr(batch_recipe, "is_active", True) is False:
            raise ValueError(
                f"Batch recipe reference {reference_id} is archived and cannot be reused."
            )
        return getattr(batch_recipe, "yield_unit", None)

    async def _batch_reference_creates_cycle(
        self,
        current_batch_id: int,
        referenced_batch_id: int,
        visited: Optional[set[int]] = None,
    ) -> bool:
        if referenced_batch_id == current_batch_id:
            return True

        visited = visited or set()
        if referenced_batch_id in visited:
            return False

        visited.add(referenced_batch_id)
        nested_components = await self.batch_recipe_ingredient_repo.get_by_batch_recipe_id(
            referenced_batch_id
        )
        for component in nested_components:
            component_type = normalize_component_type(getattr(component, "ingredient_type", None))
            if component_type != "batch":
                continue
            if await self._batch_reference_creates_cycle(
                current_batch_id,
                int(component.reference_id),
                visited,
            ):
                return True

        return False

    async def _validate_batch_recipe_ingredients(
        self,
        ingredients: List[dict],
        current_batch_id: Optional[int] = None,
    ) -> None:
        for ingredient_data in ingredients:
            reference_id = ingredient_data.get("reference_id") or ingredient_data.get("ingredient_id")
            if reference_id is None:
                raise ValueError("Ingredient must include reference_id or ingredient_id")

            ingredient_type = normalize_batch_component_type(
                ingredient_data.get("ingredient_type")
            )
            reference_unit = await self._get_batch_component_reference_unit(
                reference_id,
                ingredient_type,
            )
            requested_unit = ingredient_data.get("unit")

            if ingredient_type == "batch" and current_batch_id is not None:
                if await self._batch_reference_creates_cycle(current_batch_id, int(reference_id)):
                    raise ValueError(
                        f"Batch recipe reference {reference_id} would create a cycle."
                    )

            if not units_are_compatible(requested_unit, reference_unit):
                raise ValueError(
                    f"Unit '{requested_unit}' is incompatible with {ingredient_type} unit '{reference_unit}' for reference {reference_id}."
                )

    async def _validate_dependent_batch_reference_units(
        self,
        batch_recipe_id: int,
        candidate_yield_unit: Optional[str],
    ) -> None:
        if not candidate_yield_unit:
            return

        recipe_dependencies = await self.recipe_ingredient_repo.get_all_by_reference_id_and_type(
            ingredient_type="batch",
            reference_id=batch_recipe_id,
        )
        for dependency in recipe_dependencies:
            dependency_unit = getattr(dependency, "unit", None)
            if units_are_compatible(dependency_unit, candidate_yield_unit):
                continue

            recipe = await self.recipe_repo.get_by_id(dependency.recipe_id)
            recipe_name = getattr(recipe, "name", None)
            if not isinstance(recipe_name, str) or not recipe_name:
                recipe_name = f"recipe {dependency.recipe_id}"
            raise ValueError(
                f"Cannot change batch recipe yield unit to '{candidate_yield_unit}' because {recipe_name} references this batch using incompatible unit '{dependency_unit}'."
            )

        batch_dependencies = await self.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type(
            ingredient_type="batch",
            reference_id=batch_recipe_id,
        )
        for dependency in batch_dependencies:
            dependency_unit = getattr(dependency, "unit", None)
            if units_are_compatible(dependency_unit, candidate_yield_unit):
                continue

            parent_batch = await self.batch_recipe_repo.get_by_id(
                dependency.batch_recipe_id
            )
            parent_name = getattr(parent_batch, "name", None)
            if not isinstance(parent_name, str) or not parent_name:
                parent_name = f"batch recipe {dependency.batch_recipe_id}"
            raise ValueError(
                f"Cannot change batch recipe yield unit to '{candidate_yield_unit}' because {parent_name} references this batch using incompatible unit '{dependency_unit}'."
            )


        #route call
    
    
    async def get_prep_logs(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        batch_recipe_id: Optional[int] = None,
    ) -> List[PrepLogResponse]:
        """
        Retrieve prep logs (completed prep schedules) with optional filters.
        Returns historical records of batch recipe preparations.
        """
        # Get all prep schedules
        all_preps = await self.prep_schedule_repo.get_all()
        
        # Apply filters
        filtered_preps = all_preps
        
        if start_date:
            filtered_preps = [p for p in filtered_preps if p.prep_date >= start_date]
        
        if end_date:
            filtered_preps = [p for p in filtered_preps if p.prep_date <= end_date]
        
        if status:
            filtered_preps = [p for p in filtered_preps if p.status == status]
        
        if batch_recipe_id:
            filtered_preps = [p for p in filtered_preps if p.batch_recipe_id == batch_recipe_id]
        
        # Build response with employee names
        logs = []
        for prep in filtered_preps:
            employee_name = None
            if prep.assigned_employee_id:
                employee = await self.employee_repo.get_by_id(prep.assigned_employee_id)
                if employee:
                    employee_name = employee.name
            
            # Get expiry date from inventory lot if prep is completed
            expiry_date = None
            if prep.status == "completed" and prep.batch_recipe_id:
                lot = await self.inventory_lot_repo.get_by_batch_recipe_id(prep.batch_recipe_id)
                if lot and lot.spoilage_expected_date:
                    expiry_date = lot.spoilage_expected_date
            
            logs.append(PrepLogResponse(
                prep_id=prep.prep_id,
                batch_recipe_id=prep.batch_recipe_id,
                batch_recipe_name=prep.batch_recipe.name if prep.batch_recipe else "Unknown",
                prep_date=prep.prep_date,
                quantity_needed=prep.quantity_needed or 0,
                quantity_prepped=prep.quantity_prepped,
                prep_batch_count=prep.prep_batch_count,
                prep_time_minutes_estimated=prep.prep_time_minutes_estimated,
                prep_time_minutes_actual=prep.prep_time_minutes_actual,
                assigned_employee_id=prep.assigned_employee_id,
                assigned_employee_name=employee_name,
                status=prep.status,
                created_at=prep.created_at.isoformat() if prep.created_at else None,
                expiry_date=expiry_date,
            ))
        
        # Sort by prep_date descending (most recent first)
        logs.sort(key=lambda x: x.prep_date, reverse=True)
        
        return logs
    
    
    async def get_waste_logs(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        waste_type: Optional[str] = None,
    ) -> List[WasteLogResponse]:
        """
        Retrieve waste and spoilage logs from inventory_usage_log.
        Includes both ingredient waste and batch recipe waste.
        """
        # Get all waste/spoilage usage logs
        all_logs = await self.inventory_usage_log_repo.get_all()
        
        # Filter for waste and spoilage only
        waste_logs = [
            log for log in all_logs 
            if log.usage_type in ["waste", "spoilage"]
        ]
        
        # Apply date filters
        if start_date:
            waste_logs = [log for log in waste_logs if (log.business_date or log.used_date.date()) >= start_date]
        
        if end_date:
            waste_logs = [log for log in waste_logs if (log.business_date or log.used_date.date()) <= end_date]
        
        if waste_type:
            waste_logs = [log for log in waste_logs if log.usage_type == waste_type]
        
        # Build response with ingredient/batch names and cost impact
        results = []
        for log in waste_logs:
            # Get ingredient name
            ingredient = await self.ingredient_repo.get_by_id(log.ingredient_id)
            ingredient_name = ingredient.name if ingredient else "Unknown"
            
            # Check if this is batch recipe waste (lot has batch_recipe_id)
            batch_recipe_id = None
            batch_recipe_name = None
            if log.lot_id:
                lot = await self.inventory_lot_repo.get_by_id(log.lot_id)
                if lot and lot.batch_recipe_id:
                    batch_recipe_id = lot.batch_recipe_id
                    batch_recipe = await self.batch_recipe_repo.get_by_id(lot.batch_recipe_id)
                    if batch_recipe:
                        batch_recipe_name = batch_recipe.name
            
            # Frozen PO pricing is attributable; unknown/prepared costs remain
            # unavailable instead of displaying a fabricated flat unit price.
            cost_impact = None
            if log.lot_id:
                lot = await self.inventory_lot_repo.get_by_id(log.lot_id)
                if lot and lot.purchase_order_item_id:
                    from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
                    line = await PurchaseOrderItemRepository(self.db, self.restaurant_id).get_by_id(lot.purchase_order_item_id)
                    if line and line.unit_price is not None:
                        cost_impact = convert_unit(log.used_quantity, log.unit, line.unit) * Decimal(str(line.unit_price))

            # Determine reason from notes or reference type
            reason = "unknown"
            if log.notes:
                reason = log.notes
            elif log.reference_type == "lot" and log.lot_id:
                reason = "expired"
            elif log.reference_type == "waste_report":
                reason = "manual_entry"
            
            results.append(WasteLogResponse(
                usage_id=log.usage_id,
                waste_date=(log.business_date or log.used_date.date()),
                ingredient_id=log.ingredient_id,
                ingredient_name=ingredient_name,
                batch_recipe_id=batch_recipe_id,
                batch_recipe_name=batch_recipe_name,
                quantity_wasted=log.used_quantity,
                unit=log.unit,
                waste_type=log.usage_type,
                reason=reason,
                cost_impact=cost_impact,
                lot_id=log.lot_id,
                notes=log.notes,
            ))
        
        # Sort by date descending
        results.sort(key=lambda x: x.waste_date, reverse=True)
        
        return results
    
    
    async def create_waste_log(self, ingredient_id=None, batch_recipe_id=None,
                               quantity_wasted=None, unit=None, waste_type="waste",
                               reason="manual_entry", notes=None, request_key=None):
        if bool(ingredient_id) == bool(batch_recipe_id):
            raise ValueError("Provide exactly one raw ingredient or prepared batch")
        quantity = Decimal(str(quantity_wasted))
        if not quantity.is_finite() or quantity <= 0:
            raise ValueError("Waste quantity must be finite and positive")
        if waste_type not in {"waste", "spoilage"}:
            raise ValueError("Waste type must be waste or spoilage")
        key = request_key or str(uuid4())
        if not isinstance(key, str) or not 1 <= len(key) <= 64:
            raise ValueError("request_key must contain 1 to 64 characters")
        payload = {"ingredient_id": ingredient_id, "batch_recipe_id": batch_recipe_id,
                   "quantity": str(quantity.normalize()), "unit": normalize_unit(unit),
                   "waste_type": waste_type, "reason": reason, "notes": notes}
        async with self.db.begin_nested():
            # Match the consumption lock order, then check the durable retry identity.
            predicate = Inventory.ingredient_id == ingredient_id if ingredient_id else Inventory.inventory_id.in_(
                select(InventoryLot.inventory_id).where(InventoryLot.restaurant_id == self.restaurant_id,
                                                       InventoryLot.batch_recipe_id == batch_recipe_id))
            await self.db.execute(select(Inventory).where(Inventory.restaurant_id == self.restaurant_id,
                predicate).order_by(Inventory.inventory_id).with_for_update())
            report = (await self.db.execute(select(WasteReport).where(
                WasteReport.restaurant_id == self.restaurant_id, WasteReport.request_key == key))).scalar_one_or_none()
            if report:
                if report.payload != payload:
                    raise ValueError("Waste retry key was already used with different values")
                return report.result
            report = WasteReport(restaurant_id=self.restaurant_id, request_key=key, payload=payload)
            self.db.add(report)
            await self.db.flush()
            from app.repositories.restaurants_repo import RestaurantRepository
            from app.utils.business_date import trading_date
            restaurant = await RestaurantRepository(self.db, self.restaurant_id).get_by_id(self.restaurant_id)
            movements = await InventoryConsumption(self.db, self.restaurant_id).consume(
                item_kind='ingredient' if ingredient_id else 'batch', item_id=ingredient_id or batch_recipe_id,
                quantity=quantity, unit=unit, reference_type='waste_report', reference_id=report.report_id,
                usage_type=waste_type, include_expired=True, business_date=trading_date(datetime.utcnow(), restaurant),
                notes=f"{reason}: {notes}" if notes else reason)
            report.result = {"report_id": report.report_id, "request_key": key,
                "movements": movements, "message": f"Waste recorded: {quantity} {unit}"}
            await self.db.flush()
            return report.result

    async def update_prep_schedule(self, prep_id: int, status: str,
                                   prep_time_minutes_actual=None, prep_batch_count=None) -> dict:
        async with self.db.begin_nested():
            prep = await self._locked_prep(prep_id)
            status = status or prep.status
            if status not in {"scheduled", "in_progress", "completed", "cancelled"}:
                raise ValueError("Unsupported prep status")
            if prep_batch_count is not None and (not Decimal(str(prep_batch_count)).is_finite() or Decimal(str(prep_batch_count)) <= 0):
                raise ValueError("Batch count must be finite and positive")
            if prep.status == "completed":
                if status != "completed" or (prep_batch_count is not None and
                        Decimal(str(prep_batch_count)) != prep.prep_batch_count):
                    raise ValueError("Completed production requires an explicit correction; it cannot be reopened")
            else:
                if prep_batch_count is not None:
                    prep.prep_batch_count = Decimal(str(prep_batch_count))
                if prep_time_minutes_actual is not None:
                    prep.prep_time_minutes_actual = prep_time_minutes_actual
                if status != "completed":
                    prep.status = status
            inventory_update = await self.finalize_batch_recipe_production(prep_id) if status == "completed" else None
            await self.db.flush()
            return {"prep_id": prep.prep_id, "status": prep.status,
                    "prep_time_minutes_actual": prep.prep_time_minutes_actual,
                    "prep_batch_count": prep.prep_batch_count,
                    "quantity_prepped": prep.quantity_prepped,
                    "inventory_update": inventory_update,
                    "message": "Prep schedule updated successfully."}

    async def _locked_prep(self, prep_id):
        prep = (await self.db.execute(select(PrepSchedule).where(
            PrepSchedule.restaurant_id == self.restaurant_id,
            PrepSchedule.prep_id == prep_id).with_for_update().execution_options(populate_existing=True))).scalars().first()
        if not prep:
            raise ValueError(f"Prep {prep_id} not found")
        return prep

    async def finalize_batch_recipe_production(self, prep_id: int) -> dict:
        async with self.db.begin_nested():
            prep = await self._locked_prep(prep_id)
            previous = (await self.db.execute(select(InventoryLot).where(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.prep_id == prep_id).with_for_update().execution_options(populate_existing=True))).scalars().first()
            if previous:
                return {"message": "Production already finalized", "deducted_ingredients": [],
                        "added_to_inventory": {"inventory_id": previous.inventory_id,
                            "quantity_added": float(previous.quantity), "unit": previous.unit}}
            if prep.status == "completed":
                raise ValueError("Legacy completed prep has no production provenance; reconcile before retrying")
            batch = await self.batch_recipe_repo.get_by_id(prep.batch_recipe_id, for_update=True)
            if not batch:
                raise ValueError("Batch recipe not found")
            count = Decimal(str(prep.prep_batch_count or 0))
            output = Decimal(str(batch.yield_quantity or 0)) * count
            if not count.is_finite() or count <= 0 or not output.is_finite() or output <= 0:
                raise ValueError("Production requires a positive finite batch count and yield")
            inputs = await self.batch_recipe_ingredient_repo.get_all_for_batch_ingredient(batch.batch_recipe_id)
            requirements = {}
            for component in inputs:
                kind = normalize_batch_component_type(component.ingredient_type)
                key = (kind, component.reference_id)
                if key not in requirements:
                    target = await (self.ingredient_repo if kind == "ingredient" else self.batch_recipe_repo).get_by_id(component.reference_id)
                    if not target:
                        raise ValueError(f"Missing production input {key}")
                    requirements[key] = [Decimal("0"), target.unit if kind == "ingredient" else target.yield_unit]
                requirements[key][0] += convert_unit(Decimal(str(component.quantity_used)), component.unit, requirements[key][1]) * count
            consumption = InventoryConsumption(self.db, self.restaurant_id)
            deductions = []
            for (kind, item_id), (quantity, unit) in sorted(requirements.items()):
                deductions.extend(await consumption.consume(item_kind=kind, item_id=item_id,
                    quantity=quantity, unit=unit, usage_type="batch_production",
                    reference_type="prep", reference_id=prep_id, business_date=prep.prep_date))
            inventory = await self.inventory_repo.get_batch_inventory(batch.batch_recipe_id)
            if inventory:
                await self.inventory_repo.increment_quantity(inventory.inventory_id,
                    convert_unit(output, batch.yield_unit, inventory.unit))
            else:
                inventory = await self.inventory_repo.create({"ingredient_id": None,
                    "quantity_on_hand": output, "unit": batch.yield_unit,
                    "shelf_life_days": batch.shelf_life_days, "last_delivery_date": prep.prep_date})
            expiry = prep.prep_date + timedelta(days=batch.shelf_life_days) if batch.shelf_life_days is not None else None
            await self.inventory_lot_repo.create({"inventory_id": inventory.inventory_id,
                "prep_id": prep_id, "delivery_date": prep.prep_date, "spoilage_expected_date": expiry,
                "quantity": output, "total_received": output, "unit": batch.yield_unit,
                "batch_recipe_id": batch.batch_recipe_id, "receipt_source": "batch_production"})
            prep.quantity_prepped, prep.status = output, "completed"
            await self.db.flush()
            return {"message": f"Batch '{batch.name}' finalized into inventory",
                    "added_to_inventory": {"inventory_id": inventory.inventory_id,
                        "quantity_added": float(output), "unit": batch.yield_unit},
                    "deducted_ingredients": deductions}

    async def get_prep_recommendations(self):
        from app.repositories.forecast_run_ledger_repo import ForecastRunLedgerRepository
        from app.services.utils.forecast_snapshot import restore
        ledger = await ForecastRunLedgerRepository(self.db, self.restaurant_id).get_latest_finalized()
        snapshot = getattr(ledger, "result_snapshot", None)
        if not isinstance(snapshot, dict):
            return {"run_date": None, "batches": [], "status": "missing"}
        stored = restore(snapshot)
        from app.services.prep_planning_service import PrepPlanningService
        from app.repositories.restaurants_repo import RestaurantRepository
        from app.utils.business_date import trading_date
        restaurant = await RestaurantRepository(self.db, self.restaurant_id).get_by_id(self.restaurant_id)
        today = trading_date(datetime.utcnow(), restaurant)
        gross = [row for row in stored.get('batches', []) if row['forecast_date'] >= today]
        direct = [row for row in stored.get('ingredients', [])
                  if row.get('source_type') != 'net_prep' and row['forecast_date'] >= today]
        plan = await PrepPlanningService(self.db, self.restaurant_id).build(gross, direct)
        # Historical purchasing demand stays frozen. Present fresh prep guidance
        # against current stock/tasks, with an explicit recipe-change review gate.
        frozen = stored.get('material_plan', {}).get('recipe_graph', {})
        recipe_changed = any(frozen.get(key) != value for key, value in plan['recipe_graph'].items())
        warnings = ['Recipes changed since this forecast; generate a new forecast before scheduling.'] if recipe_changed else []
        review = bool(plan['review_required'] or recipe_changed or stored.get('history_quality', {}).get('review_required'))
        return {'run_date': ledger.run_date, 'as_of_date': today,
                'batches': plan['batches'], 'production_order': plan['production_order'],
                'status': 'review' if review else 'ready', 'review_required': review,
                'warnings': warnings, 'incomplete_preps': plan['incomplete_preps'],
                'input_requirements': plan['ingredients'], 'history_quality': stored.get('history_quality', {})}

    async def get_prep_schedule(self, prep_date: Optional[date] = None) -> List[Dict]:
        """Get prep schedule with batch recipe names."""
        all_preps = await self.prep_schedule_repo.get_all()

        if prep_date:
            all_preps = [p for p in all_preps if p.prep_date == prep_date]

        return [
            {
                "prep_id": prep.prep_id,
                "batch_recipe_id": prep.batch_recipe_id,
                "batch_recipe_name": (prep.batch_recipe.name if prep.batch_recipe else None),
                "prep_date": str(prep.prep_date),
                "quantity_needed": float(prep.quantity_needed or 0),
                "quantity_prepped": float(prep.quantity_prepped or 0),
                "prep_batch_count": prep.prep_batch_count,
                "estimated_time": prep.prep_time_minutes_estimated,
                "actual_time": prep.prep_time_minutes_actual,
                "status": prep.status,
            }
            for prep in all_preps
        ]

    async def create_batch_recipe(
        self,
        name: str,
        description: Optional[str],
        yield_quantity: Decimal,
        yield_unit: str,
        estimated_prep_time_minutes: Optional[int],
        shelf_life_days: Optional[int],
        ingredients: List[dict],  # Each item: {reference_id|ingredient_id, ingredient_type, quantity_used, unit}
        ) -> dict:
            """Create a new batch recipe with associated ingredients."""

            await self._validate_batch_recipe_ingredients(ingredients)

            # 1. Create the batch recipe entry
            batch_recipe_data = {
                "restaurant_id": self.restaurant_id,
                "name": name,
                "description": description,
                "yield_quantity": yield_quantity,
                "yield_unit": yield_unit,
                "estimated_prep_time_minutes": estimated_prep_time_minutes,
                "shelf_life_days": shelf_life_days,
            }
            async with self.db.begin():
                new_recipe = await self.batch_recipe_repo.create(batch_recipe_data)

                # 2. Add ingredients
                for ing in ingredients:
                    reference_id = ing.get("reference_id") or ing.get("ingredient_id")
                    if reference_id is None:
                        raise ValueError("Ingredient must include reference_id or ingredient_id")

                    ingredient_type = normalize_batch_component_type(
                        ing.get("ingredient_type")
                    )
                    ingredient_create = BatchRecipeIngredientCreate(
                        restaurant_id=self.restaurant_id,
                        batch_recipe_id=new_recipe.batch_recipe_id,
                        reference_id=reference_id,
                        ingredient_type=ingredient_type,
                        quantity_used=Decimal(ing["quantity_used"]),
                        unit=ing["unit"],
                    )
                    await self.batch_recipe_ingredient_repo.create(ingredient_create)

            print(f"✅ Created batch recipe ID: {new_recipe.batch_recipe_id}")
            return {
                "batch_recipe_id": new_recipe.batch_recipe_id,
                "message": f"Batch recipe '{name}' created successfully.",
            }

    async def get_ingredients(self) -> List[dict]:
        """Retrieve all ingredients available for batch recipes."""
        ingredients = await self.ingredient_repo.get_all()

        return [
            {
                "ingredient_id": ing.ingredient_id,
                "name": ing.name,
                "unit": ing.unit,
                "category": ing.category,
            }
            for ing in ingredients
        ]

    async def update_batch_recipe(
                                    self,
                                    batch_recipe_id: int,
                                    name: Optional[str] = None,
                                    description: Optional[str] = None,
                                    yield_quantity: Optional[Decimal] = None,
                                    yield_unit: Optional[str] = None,
                                    estimated_prep_time_minutes: Optional[int] = None,
                                    shelf_life_days: Optional[int] = None,
                                    ingredients: Optional[List[dict]] = None,
                                ):

        async with self.db.begin():
            # 1. Get existing batch recipe
            batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
            if not batch_recipe:
                raise ValueError(f"Batch recipe ID {batch_recipe_id} not found.")
            if getattr(batch_recipe, "is_active", True) is False:
                raise ValueError("Archived batch recipes cannot be updated.")

            candidate_yield_unit = yield_unit or getattr(batch_recipe, "yield_unit", None)
            if yield_unit is not None and yield_unit != getattr(batch_recipe, "yield_unit", None):
                await self._validate_dependent_batch_reference_units(
                    batch_recipe_id,
                    candidate_yield_unit,
                )

            # 2. Update metadata fields if provided
            update_data = {}
            if name is not None:
                update_data["name"] = name
            if description is not None:
                update_data["description"] = description
            if yield_quantity is not None:
                update_data["yield_quantity"] = yield_quantity
            if yield_unit is not None:
                update_data["yield_unit"] = yield_unit
            if estimated_prep_time_minutes is not None:
                update_data["estimated_prep_time_minutes"] = estimated_prep_time_minutes
            if shelf_life_days is not None:
                update_data["shelf_life_days"] = shelf_life_days

            if update_data:
                await self.batch_recipe_repo.update(batch_recipe_id, update_data)

            # 3. Update ingredients if provided
            if ingredients is not None:
                await self._validate_batch_recipe_ingredients(
                    ingredients,
                    current_batch_id=batch_recipe_id,
                )

                # Delete existing ingredients
                await self.batch_recipe_ingredient_repo.delete_all_by_batch_recipe_id(
                    batch_recipe_id=batch_recipe_id
                )

                # Add new ingredients
                for ing in ingredients:
                    reference_id = ing.get("reference_id") or ing.get("ingredient_id")
                    if reference_id is None:
                        raise ValueError("Ingredient must include reference_id or ingredient_id")
                    ingredient_type = normalize_batch_component_type(
                        ing.get("ingredient_type")
                    )

                    await self.batch_recipe_ingredient_repo.create(
                        {
                            "restaurant_id": self.restaurant_id,
                            "batch_recipe_id": batch_recipe_id,
                            "reference_id": reference_id,
                            "ingredient_type": ingredient_type,
                            "quantity_used": Decimal(ing["quantity_used"]),
                            "unit": ing["unit"],
                        }
                    )

        print(f"✅ Batch recipe {batch_recipe_id} updated.")

    async def delete_batch_recipe(self, batch_recipe_id: int) -> dict:
        batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
        if not batch_recipe:
            raise ValueError(f"Batch recipe ID {batch_recipe_id} not found.")

        if getattr(batch_recipe, "is_active", True) is False:
            return {
                "message": "Batch recipe already archived",
                "archived": True,
                "usage": (await self.get_batch_recipe_usage(batch_recipe_id))["usage"],
            }

        usage = await self.get_batch_recipe_usage(batch_recipe_id)

        if self.db.in_transaction():
            await self.batch_recipe_repo.update(batch_recipe_id, {"is_active": False})
        else:
            async with self.db.begin():
                await self.batch_recipe_repo.update(batch_recipe_id, {"is_active": False})

        return {
            "message": "Batch recipe archived successfully",
            "archived": True,
            "lifecycle_action": "archive",
            "usage": usage["usage"],
        }

    async def get_batch_recipe_usage(self, batch_recipe_id: int) -> dict:
        batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
        if not batch_recipe:
            raise ValueError(f"Batch recipe ID {batch_recipe_id} not found.")

        recipe_dependencies = await self.recipe_ingredient_repo.get_all_by_reference_id_and_type(
            ingredient_type="batch",
            reference_id=batch_recipe_id,
        )
        batch_dependencies = await self.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type(
            ingredient_type="batch",
            reference_id=batch_recipe_id,
        )
        prep_schedule_dependencies = await self.prep_schedule_repo.get_by_field(
            "batch_recipe_id",
            batch_recipe_id,
        )
        inventory_lot_dependencies = await self.inventory_lot_repo.get_all_by_batch_recipe_id(
            batch_recipe_id
        )

        used_in_recipes = []
        for dependency in recipe_dependencies:
            recipe = await self.recipe_repo.get_by_id(dependency.recipe_id)
            if recipe:
                used_in_recipes.append(
                    {
                        "recipe_id": recipe.recipe_id,
                        "recipe_name": recipe.name,
                        "is_active": getattr(recipe, "is_active", True),
                    }
                )

        used_in_batches = []
        for dependency in batch_dependencies:
            parent_batch = await self.batch_recipe_repo.get_by_id(dependency.batch_recipe_id)
            if parent_batch:
                used_in_batches.append(
                    {
                        "batch_recipe_id": parent_batch.batch_recipe_id,
                        "batch_recipe_name": parent_batch.name,
                        "is_active": getattr(parent_batch, "is_active", True),
                    }
                )

        return {
            "batch_recipe_id": batch_recipe.batch_recipe_id,
            "batch_recipe_name": batch_recipe.name,
            "is_active": getattr(batch_recipe, "is_active", True),
            "usage": {
                "recipes": used_in_recipes,
                "batches": used_in_batches,
                "prep_schedule_count": len(prep_schedule_dependencies),
                "inventory_lot_count": len(inventory_lot_dependencies),
                "recipe_count": len(used_in_recipes),
                "batch_count": len(used_in_batches),
            },
        }

    async def view_batch_recipes(self) -> List[dict]:
        batch_recipes = await self.batch_recipe_repo.get_active()
        result = []

        for batch in batch_recipes:
            batch_id = batch.batch_recipe_id

            # Get ingredients used in this batch recipe
            ingredients = await self.batch_recipe_ingredient_repo.get_all_for_batch(
                batch_id
            )

            ingredient_details = []
            for ing in ingredients:
                ingredient_type = getattr(ing, "ingredient_type", None) or "ingredient"
                reference_id = getattr(ing, "reference_id", None)

                if ingredient_type == "batch":
                    batch_info = await self.batch_recipe_repo.get_by_id(reference_id)
                    ingredient_details.append(
                        {
                            "ingredient_type": "batch",
                            "reference_id": reference_id,
                            "batch_recipe_id": reference_id,
                            "ingredient_id": None,
                            "ingredient_name": batch_info.name if batch_info else "Unknown batch",
                            "quantity_used": float(ing.quantity_used or 0),
                            "unit": ing.unit,
                        }
                    )
                else:
                    ingredient_info = await self.ingredient_repo.get_by_id(reference_id)
                    ingredient_details.append(
                        {
                            "ingredient_type": "ingredient",
                            "reference_id": reference_id,
                            "ingredient_id": reference_id,
                            "ingredient_name": (
                                ingredient_info.name if ingredient_info else "Unknown"
                            ),
                            "quantity_used": float(ing.quantity_used or 0),
                            "unit": ing.unit,
                        }
                    )

            # Find recipes that use this batch recipe
            used_in_recipes = (
                await self.recipe_ingredient_repo.get_all_by_reference_id_and_type(
                    ingredient_type="batch", reference_id=batch_id
                )
            )

            used_in_details = []
            for use in used_in_recipes:
                recipe = await self.recipe_repo.get_by_id(use.recipe_id)
                if recipe:
                    used_in_details.append(
                        {
                            "recipe_id": recipe.recipe_id,
                            "recipe_name": recipe.name,
                            "recipe_description": recipe.description,
                        }
                    )

            result.append(
                {
                    "batch_recipe_id": batch.batch_recipe_id,
                    "name": batch.name,
                    "description": batch.description,
                    "yield_quantity": float(batch.yield_quantity or 0),
                    "yield_unit": batch.yield_unit,
                    "estimated_prep_time_minutes": batch.estimated_prep_time_minutes,
                    "shelf_life_days": batch.shelf_life_days,
                    "is_active": getattr(batch, "is_active", True),
                    "ingredients": ingredient_details,
                    "used_in_recipes": used_in_details,
                }
            )

        return result

    async def create_prep_schedule(self, prep_data: dict) -> dict:
        prep_data = dict(prep_data)
        batch = await self.batch_recipe_repo.get_by_id(prep_data['batch_recipe_id'])
        if not batch or not batch.is_active:
            raise ValueError('Active batch recipe not found')
        if prep_data.get('assigned_employee_id') is not None and not await self.employee_repo.get_by_id(prep_data['assigned_employee_id']):
            raise ValueError('Assigned employee not found for this restaurant')
        quantity = Decimal(str(prep_data['quantity_needed']))
        output = Decimal(str(batch.yield_quantity or 0))
        if not quantity.is_finite() or quantity <= 0 or not output.is_finite() or output <= 0:
            raise ValueError('Planned quantity and batch yield must be finite and positive')
        count = Decimal(str(quantity / output if prep_data.get('prep_batch_count') is None else prep_data['prep_batch_count']))
        if not count.is_finite() or count <= 0:
            raise ValueError('Planned batch count must be finite and positive')
        prep_data['quantity_needed'], prep_data['prep_batch_count'] = quantity, count
        prep_data['prep_date'] = date.fromisoformat(prep_data['prep_date']) if isinstance(prep_data['prep_date'], str) else prep_data['prep_date']
        prep_data['status'] = 'scheduled'

        # Create prep schedule using repo method
        prep = await self.prep_schedule_repo.create(prep_data)

        return {
            "prep_id": prep.prep_id,
            "batch_recipe_id": prep.batch_recipe_id,
            "prep_date": str(prep.prep_date),
            "quantity_needed": float(prep.quantity_needed or 0),
            "prep_batch_count": prep.prep_batch_count,
            "estimated_time": prep.prep_time_minutes_estimated,
            "assigned_employee_id": prep.assigned_employee_id,
            "status": prep.status,
            "message": "Prep schedule created successfully.",
        }

    # DELETE a prep schedule by ID
    async def delete_prep_schedule(self, prep_id: int) -> dict:
        prep = await self._locked_prep(prep_id)
        if prep.status == "completed":
            raise ValueError("Completed production requires an explicit correction; it cannot be deleted")
        success = await self.prep_schedule_repo.delete(prep_id)

        if not success:
            raise ValueError(f"Prep schedule with ID {prep_id} not found.")

        return {
            "prep_id": prep_id,
            "message": "Prep schedule deleted successfully."
        }