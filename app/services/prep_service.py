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
from app.services.utils.graph_validation import normalize_component_type, units_are_compatible
import logging



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
            return getattr(ingredient, "unit", None)

        batch_recipe = await self.batch_recipe_repo.get_by_id(reference_id)
        if not batch_recipe:
            raise ValueError(f"Batch recipe reference {reference_id} not found.")
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

            ingredient_type = normalize_component_type(ingredient_data.get("ingredient_type"))
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
            waste_logs = [log for log in waste_logs if log.used_date.date() >= start_date]
        
        if end_date:
            waste_logs = [log for log in waste_logs if log.used_date.date() <= end_date]
        
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
            
            # Calculate cost impact (quantity * ingredient cost or batch cost)
            cost_impact = None
            if ingredient:
                # Get most recent ingredient supplier cost
                inventory = await self.inventory_repo.get_inventory_by_ingredient(log.ingredient_id)
                if inventory:
                    # Rough estimate: use average cost per unit
                    # You might want to get actual supplier cost here
                    cost_impact = float(log.used_quantity) * 5.0  # Placeholder
            
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
                waste_date=log.used_date.date(),
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
    
    
    async def create_waste_log(
        self,
        ingredient_id: Optional[int] = None,
        batch_recipe_id: Optional[int] = None,
        quantity_wasted: Decimal = None,
        unit: str = None,
        waste_type: str = "waste",
        reason: str = "manual_entry",
        notes: Optional[str] = None,
    ) -> dict:
        """
        Manually create a waste log entry.
        Can log waste for either raw ingredients or batch recipes.
        """
        if not ingredient_id and not batch_recipe_id:
            raise ValueError("Must provide either ingredient_id or batch_recipe_id")
        
        if not quantity_wasted or quantity_wasted <= 0:
            raise ValueError("Quantity wasted must be greater than 0")
        
        # If batch_recipe_id provided, find the inventory for that batch
        if batch_recipe_id:
            lot = await self.inventory_lot_repo.get_by_batch_recipe_id(batch_recipe_id)
            if not lot:
                raise ValueError(f"No inventory lot found for batch recipe {batch_recipe_id}")
            
            inventory_id = lot.inventory_id
            ingredient_id = lot.ingredient_id or 0  # Batch recipes might not have ingredient_id
            lot_id = lot.lot_id
        else:
            # Get inventory for ingredient
            inventory = await self.inventory_repo.get_inventory_by_ingredient(ingredient_id)
            if not inventory:
                raise ValueError(f"No inventory found for ingredient {ingredient_id}")
            
            inventory_id = inventory.inventory_id
            lot_id = None
        
        # Create usage log entry
        usage_log = await self.inventory_usage_log_repo.create({
            "restaurant_id": self.restaurant_id,
            "inventory_id": inventory_id,
            "ingredient_id": ingredient_id,
            "lot_id": lot_id,
            "used_quantity": quantity_wasted,
            "unit": unit,
            "used_date": datetime.utcnow(),
            "usage_type": waste_type,
            "reference_type": "waste_report",
            "notes": f"{reason}: {notes}" if notes else reason,
        })
        
        # Optionally decrement inventory
        await self.inventory_repo.decrement_quantity(inventory_id, float(quantity_wasted))
        
        return {
            "usage_id": usage_log.usage_id,
            "message": f"Waste log created successfully for {quantity_wasted} {unit}",
        }
    
    
    async def update_prep_schedule(self, prep_id: int, 
                                   status: str, 
                                   prep_time_minutes_actual: Optional[int] = None,
                                   prep_batch_count: Optional[float] = None,) -> dict:
        # 1. Load the prep schedule object
        prep = await self.get_prep(prep_id)
        
        # 2. Update prep object fields as needed (status, time, batch count)
        prep.status = status
        prep.prep_time_minutes_actual = prep_time_minutes_actual
        prep.prep_batch_count = prep_batch_count

        # 3. Save changes (you likely have a repo method)
        update_fields = {"status": status}

        if prep_time_minutes_actual is not None:
            update_fields["prep_time_minutes_actual"] = prep_time_minutes_actual

        if prep_batch_count is not None:
            update_fields["prep_batch_count"] = prep_batch_count

        await self.prep_schedule_repo.update(prep_id, update_fields)

        
        result = {
            "prep_id": prep.prep_id,
            "status": prep.status,
            "prep_time_minutes_actual": prep.prep_time_minutes_actual,
            "prep_batch_count": prep.prep_batch_count,
            "quantity_prepped": None,
            "message": "Prep schedule updated successfully.",
        }
        
        # 4. If status is 'completed', finalize batch recipe production
        if status == "completed":
            finalization_result = await self.finalize_batch_recipe_production(prep_id)
            result["quantity_prepped"] = finalization_result["added_to_inventory"]["quantity_added"]
            result["inventory_update"] = finalization_result

        return result

    async def finalize_batch_recipe_production(self, prep_id: int) -> dict:
        prep = await self.get_prep(prep_id)
        print(f"Prep: {prep}")
        print(f"Prep.batch_recipe_id: {getattr(prep, 'batch_recipe_id', None)}")
        batch_recipe_id = getattr(prep, "batch_recipe_id", None)
        if batch_recipe_id is None:
            raise ValueError("Prep does not have a batch_recipe_id.")
        batch_recipe = await self.get_batch(prep.batch_recipe_id)
        print(f"Batch recipe fetched: {batch_recipe}")
        
        total_quantity = batch_recipe.yield_quantity * prep.prep_batch_count
        unit = batch_recipe.yield_unit
        today = date.today()

        inventory_entry = await self.update_inventory_for_batch_recipe(batch_recipe, total_quantity, unit, today)
        lot = await self.create_inventory_lot(batch_recipe, inventory_entry, total_quantity, unit, today)
        lot_id = lot.lot_id

        deducted_ingredients = await self.deduct_ingredients_for_batch(batch_recipe, prep, lot_id)
        
        return {
            "message": f"Batch recipe '{batch_recipe.name}' finalized into inventory.",
            "added_to_inventory": {
                "inventory_id": inventory_entry.inventory_id,
                "quantity_added": float(total_quantity),
                "unit": unit,
            },
            "deducted_ingredients": deducted_ingredients,
        }

    # Helper methods:

    async def get_prep(self, prep_id: int):
        try:
            print(f"Fetching prep schedule with ID: {prep_id}")
            prep = await self.prep_schedule_repo.get_by_id(prep_id)
            print(f"Got prep: {prep}")

            if not prep:
                raise ValueError(f"Prep with ID {prep_id} not found.")
            
            return prep

        except Exception as e:
            print(f"get_prep() crashed: {e}")
            raise

    async def get_batch(self, batch_recipe_id: int):
        batch_recipe = await self.batch_recipe_repo.get_by_id(batch_recipe_id)
        if not batch_recipe:
            raise ValueError("Batch recipe not found.")
        print(f'1batch recipe: {batch_recipe}')
        return batch_recipe

    async def update_inventory_for_batch_recipe(self, batch_recipe, total_quantity, unit, today):
        existing_lot = await self.inventory_lot_repo.get_by_batch_recipe_id(batch_recipe.batch_recipe_id)

        if existing_lot:
            return await self.increment_inventory(existing_lot.inventory_id, total_quantity)
        else:
            return await self.create_new_inventory(batch_recipe, total_quantity, unit, today)

    async def increment_inventory(self, inventory_id: int, total_quantity: float):
        inventory_entry = await self.inventory_repo.get_by_id(inventory_id)
        if not inventory_entry:
            raise ValueError(f"Inventory not found for ID {inventory_id}")
        
        updated_inventory = await self.inventory_repo.increment_quantity(inventory_id, total_quantity)
        if not updated_inventory:
            raise ValueError(f"Could not increment quantity for inventory ID {inventory_id}")
        
        return updated_inventory

    async def create_new_inventory(self, batch_recipe, total_quantity, unit, today):
        inventory_entry = await self.inventory_repo.create({
            "restaurant_id": self.restaurant_id,
            "ingredient_id": None,
            "quantity_on_hand": total_quantity,
            "unit": unit,
            "shelf_life_days": batch_recipe.shelf_life_days,
            "spoilage_expected_date": today + timedelta(days=batch_recipe.shelf_life_days),
            "last_delivery_date": today,
        })
        return inventory_entry

    async def create_inventory_lot(self, batch_recipe, inventory_entry, total_quantity, unit, today):
        result = await self.inventory_lot_repo.create({
            "inventory_id": inventory_entry.inventory_id,
            "restaurant_id": self.restaurant_id,
            "delivery_date": today,
            "spoilage_expected_date": today + timedelta(days=batch_recipe.shelf_life_days),
            "quantity": total_quantity,
            "unit": unit,
            "total_received": total_quantity,
            "batch_recipe_id": batch_recipe.batch_recipe_id,
        })
        return result

    async def deduct_ingredients_for_batch(self, batch_recipe, prep, lot_id):
        deducted_ingredients = []
        updated_inventories = []

        # Fetch all ingredients for the batch recipe
        ingredients = await self.batch_recipe_ingredient_repo.get_all_for_batch_ingredient(batch_recipe.batch_recipe_id)
        
        for ing in ingredients:
            # Fetch the inventory entry for the ingredient
            ingredient_entry = await self.inventory_repo.get_inventory_by_ingredient(ing.ingredient_id)
            if not ingredient_entry:
                raise ValueError(f"Inventory not found for ingredient {ing.ingredient_id}")
            print(f"Ingredient: {ing.ingredient_id} | Per-batch used: {ing.quantity_used} {ing.unit} | Prep count: {prep.prep_batch_count}")

            # Calculate the used quantity based on prep batch count and total quantity
            used_quantity = ing.quantity_used * prep.prep_batch_count
            
            # Normalize units if needed
            from_unit = ing.unit
            to_unit = ingredient_entry.unit
            if normalize_unit(from_unit) != normalize_unit(to_unit):
                used_quantity = convert_unit(used_quantity, from_unit, to_unit)
            print(f"From unit: {from_unit} | To unit: {to_unit} | Normalized: {normalize_unit(from_unit)} -> {normalize_unit(to_unit)}")

            print(f"Used quantity after unit conversion: {used_quantity} {to_unit}")

            # Update the inventory by decrementing the used quantity
            updated_inv = await self.inventory_repo.decrement_quantity(
                inventory_id=ingredient_entry.inventory_id,
                amount=used_quantity,
            )
            updated_inventories.append(updated_inv)
            ingredient = await self.ingredient_repo.get_by_id(ing.ingredient_id)
            ingredient_name = ingredient.name

            # Log the inventory usage
            await self.inventory_usage_log_repo.create({
                "restaurant_id": self.restaurant_id,
                "inventory_id": ingredient_entry.inventory_id,
                "ingredient_id": ing.ingredient_id,
                "lot_id": lot_id,
                "used_quantity": used_quantity,
                "unit": to_unit,
                "usage_type": "batch_production",
                "reference_type": "batch",
                "reference_id": batch_recipe.batch_recipe_id,
                "used_date": datetime.utcnow(),
            })

            # Record the deducted ingredients for the response
            deducted_ingredients.append({
                "ingredient_id": ing.ingredient_id,
                "ingredient_name": ingredient_name,
                "used_quantity": float(used_quantity),
                "unit": to_unit,
            })

        return deducted_ingredients

        return response

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

                    ingredient_type = normalize_component_type(ing.get("ingredient_type"))
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
                await self.batch_recipe_repo.update(
                    restaurant_id=self.restaurant_id,
                    batch_recipe_id=batch_recipe_id,
                    update_data=update_data,
                )

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
                    ingredient_type = normalize_component_type(ing.get("ingredient_type"))

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

        blockers = []
        if recipe_dependencies:
            blockers.append(f"{len(recipe_dependencies)} recipe reference(s)")
        if batch_dependencies:
            blockers.append(f"{len(batch_dependencies)} nested batch reference(s)")
        if prep_schedule_dependencies:
            blockers.append(f"{len(prep_schedule_dependencies)} prep schedule(s)")
        if inventory_lot_dependencies:
            blockers.append(f"{len(inventory_lot_dependencies)} inventory lot(s)")

        if blockers:
            raise ValueError(
                "Batch recipe cannot be deleted because it is still used by "
                + ", ".join(blockers)
                + "."
            )

        async with self.db.begin():
            deleted_ingredients_count = await self.batch_recipe_ingredient_repo.delete_all_by_batch_recipe_id(
                batch_recipe_id
            )
            await self.batch_recipe_repo.delete(batch_recipe_id)

        return {
            "message": f"Batch recipe and {deleted_ingredients_count} ingredient rows deleted successfully",
            "deleted_ingredients_count": deleted_ingredients_count,
        }

    async def view_batch_recipes(self) -> List[dict]:
        batch_recipes = await self.batch_recipe_repo.get_all()
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
                    "ingredients": ingredient_details,
                    "used_in_recipes": used_in_details,
                }
            )

        return result

    async def create_prep_schedule(self, prep_data: dict) -> dict:
        # Ensure default status if not provided
        if "status" not in prep_data:
            prep_data["status"] = "scheduled"

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
        success = await self.prep_schedule_repo.delete(prep_id)

        if not success:
            raise ValueError(f"Prep schedule with ID {prep_id} not found.")

        return {
            "prep_id": prep_id,
            "message": "Prep schedule deleted successfully."
        }