# app/services/menu_service.py

# have to handle batch recipes in everything recipe handling not sure if it does yet
#

from typing import List, Dict, Optional
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.repositories.recipes_repo import RecipeRepository
from app.repositories.recipe_ingredients_repo import RecipeIngredientRepository
from app.repositories.menu_item_recipes_repo import MenuItemRecipeRepository
from app.repositories.batch_recipe_ingredients_repo import (
    BatchRecipeIngredientRepository,
)
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.activity_logs_repo import ActivityLogRepository
from app.repositories.error_logs_repo import ErrorLogRepository
from app.repositories.ingredient_supplier_repo import IngredientSupplierRepository
from app.repositories.supplier_repo import SupplierRepository
from app.schemas.menu_dto import (
    MenuItemCreate,
    MenuItemUpdate,
    MenuItemRecipeCreate,
    RecipeCreate,
    RecipeUpdate,
    RecipeIngredientCreate,
    IngredientCreate,
    IngredientUpdate,
    IngredientSupplierUpdate,
)
from app.schemas.admin_dto import ErrorLogCreate
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import traceback
from app.services.utils.graph_validation import normalize_component_type, units_are_compatible
from app.utils.replenishment_policy import (
    normalize_ingredient_policy_settings,
    normalize_supplier_cadence_settings,
)


class MenuService:
    def __init__(self, db: AsyncSession, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.menu_repo = MenuItemRepository(db, restaurant_id)
        self.ingredient_repo = IngredientRepository(db, restaurant_id)
        self.recipe_repo = RecipeRepository(db, restaurant_id)
        self.recipe_ingredient_repo = RecipeIngredientRepository(db, restaurant_id)
        self.menu_recipe_repo = MenuItemRecipeRepository(db, restaurant_id)
        self.batch_recipe_ingredient_repo = BatchRecipeIngredientRepository(
            db, restaurant_id
        )
        self.ingredient_supplier_repo = IngredientSupplierRepository(db, restaurant_id)
        self.batch_recipe_repo = BatchRecipeRepository(db, restaurant_id)
        self.activity_log_repo = ActivityLogRepository(db, restaurant_id, employee_id)
        self.error_log_repo = ErrorLogRepository(db, restaurant_id)
        self.supplier_repo = SupplierRepository(db, restaurant_id)

    async def _get_component_reference_unit(
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

        if ingredient_type == "batch":
            batch_recipe = await self.batch_recipe_repo.get_by_id(reference_id)
            if not batch_recipe:
                raise ValueError(f"Batch recipe reference {reference_id} not found.")
            if getattr(batch_recipe, "is_active", True) is False:
                raise ValueError(
                    f"Batch recipe reference {reference_id} is archived and cannot be reused."
                )
            return getattr(batch_recipe, "yield_unit", None)

        recipe = await self.recipe_repo.get_by_id(reference_id)
        if not recipe:
            raise ValueError(f"Recipe reference {reference_id} not found.")
        if getattr(recipe, "is_active", True) is False:
            raise ValueError(
                f"Recipe reference {reference_id} is archived and cannot be reused."
            )
        return None

    async def _recipe_reference_creates_cycle(
        self,
        current_recipe_id: int,
        referenced_recipe_id: int,
        visited: Optional[set[int]] = None,
    ) -> bool:
        if referenced_recipe_id == current_recipe_id:
            return True

        visited = visited or set()
        if referenced_recipe_id in visited:
            return False

        visited.add(referenced_recipe_id)
        nested_components = await self.recipe_ingredient_repo.get_by_recipe_id(referenced_recipe_id)
        for component in nested_components:
            component_type = normalize_component_type(getattr(component, "ingredient_type", None))
            if component_type != "recipe":
                continue
            if await self._recipe_reference_creates_cycle(
                current_recipe_id,
                int(component.reference_id),
                visited,
            ):
                return True

        return False

    async def _validate_recipe_ingredients(
        self,
        ingredients_data: List[dict],
        current_recipe_id: Optional[int] = None,
    ) -> None:
        for ingredient_data in ingredients_data:
            reference_id = ingredient_data.get("reference_id") or ingredient_data.get("ingredient_id")
            if reference_id is None:
                raise ValueError("Ingredient must include reference_id or ingredient_id")

            ingredient_type = normalize_component_type(
                ingredient_data.get("type") or ingredient_data.get("ingredient_type")
            )

            if ingredient_type == "recipe" and current_recipe_id is not None:
                if await self._recipe_reference_creates_cycle(current_recipe_id, int(reference_id)):
                    raise ValueError(
                        f"Recipe reference {reference_id} would create a cycle."
                    )

            reference_unit = await self._get_component_reference_unit(reference_id, ingredient_type)
            requested_unit = ingredient_data.get("unit")

            if not units_are_compatible(requested_unit, reference_unit):
                raise ValueError(
                    f"Unit '{requested_unit}' is incompatible with {ingredient_type} unit '{reference_unit}' for reference {reference_id}."
                )

    async def get_all_categories(self) -> list[str]:
        """Get all unique categories from menu items for this restaurant."""
        menu_items = await self.menu_repo.get_all()
        categories = set()
        for item in menu_items:
            if item.category:
                categories.add(item.category)
        return sorted(list(categories))

    async def get_all_recipes(self):
        return await self.recipe_repo.get_active()

    async def get_all_ingredients(self):
        return await self.ingredient_repo.get_all()

    async def get_all_batch_recipes(self):
        return await self.batch_recipe_repo.get_active()

    async def upsert_ingredient_with_suppliers(self, data: dict):
        # Prepare the base ingredient data
        ingredient_policy_settings = normalize_ingredient_policy_settings(data)
        ingredient_data = IngredientUpdate(
            ingredient_id=data.get("ingredient_id"),
            restaurant_id=self.restaurant_id,
            name=data["name"],
            unit=data["unit"],
            category=data.get("category"),
            **ingredient_policy_settings,
        )
        async with self.db.begin():

            if ingredient_data.ingredient_id:
                await self.ingredient_repo.update(
                    ingredient_data.ingredient_id, ingredient_data
                )
            else:
                created_ingredient = await self.ingredient_repo.create(
                    ingredient_data
                )
                ingredient_data.ingredient_id = created_ingredient.ingredient_id

            ingredient_id = ingredient_data.ingredient_id

            # Get all existing ingredient-supplier mappings from DB
            existing_mappings = (
                await self.ingredient_supplier_repo.get_all_by_ingredient_id(
                    ingredient_id=ingredient_id
                )
            )
            existing_mapping_ids = {m.ingredient_supplier_id for m in existing_mappings}

            # Track updated or newly created mapping IDs
            updated_mapping_ids = set()

            for supplier in data.get("suppliers", []):
                supplier_id = supplier["supplier_id"]
                ingredient_supplier_id = supplier.get("ingredient_supplier_id")
                cadence_settings = normalize_supplier_cadence_settings(supplier)

                supplier_data = IngredientSupplierUpdate(
                    ingredient_id=ingredient_id,
                    supplier_id=supplier_id,
                    cost_per_unit=supplier["cost_per_unit"],
                    lead_time_days=supplier["lead_time_days"],
                    review_period_days=cadence_settings.get("review_period_days"),
                    order_schedule_type=cadence_settings.get("order_schedule_type"),
                    allowed_order_days=cadence_settings.get("allowed_order_days"),
                    allowed_delivery_days=cadence_settings.get("allowed_delivery_days"),
                    cadence_source=cadence_settings.get("cadence_source"),
                    cadence_confidence_score=cadence_settings.get(
                        "cadence_confidence_score"
                    ),
                    shelf_life_days=supplier.get("shelf_life_days"),
                    preferred=supplier.get("preferred", False),
                    min_order_quantity=supplier.get("min_order_quantity"),
                    supplier_priority=supplier.get("supplier_priority"),
                    unit=supplier.get("unit"),
                    pack_size=supplier.get("pack_size"),
                    quantity_per_pack_item=supplier.get("quantity_per_pack_item"),
                )
                supplier_data_dict = supplier_data.dict(exclude_unset=True)

                if ingredient_supplier_id:
                    # Update if mapping exists
                    updated_mapping = await self.ingredient_supplier_repo.update(
                        ingredient_supplier_id,
                        supplier_data_dict,
                    )
                    if updated_mapping:
                        updated_mapping_ids.add(updated_mapping.ingredient_supplier_id)
                else:
                    # Create new mapping
                    new_mapping = await self.ingredient_supplier_repo.create(
                        supplier_data_dict
                    )
                    updated_mapping_ids.add(new_mapping.ingredient_supplier_id)

            # Delete mappings that were not sent in the request
            mappings_to_delete = existing_mapping_ids - updated_mapping_ids
            for mapping_id in mappings_to_delete:
                await self.ingredient_supplier_repo.soft_delete_by_id(
                    ingredient_supplier_id=mapping_id,
                )

        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)

        # Build suppliers payload
        supplier_mappings = await self.ingredient_supplier_repo.get_by_ingredient_ids(
            [ingredient_id]
        )
        supplier_ids = list({s.supplier_id for s in supplier_mappings})
        supplier_lookup = await self.supplier_repo.get_by_ids(supplier_ids)
        supplier_lookup_dict = {s.supplier_id: s for s in supplier_lookup}

        suppliers_payload = []
        for s in supplier_mappings:
            supplier_name = supplier_lookup_dict.get(s.supplier_id).name if supplier_lookup_dict.get(s.supplier_id) else "Unknown"
            suppliers_payload.append(
                {
                    "ingredient_supplier_id": s.ingredient_supplier_id,
                    "supplier_id": s.supplier_id,
                    "supplier_name": supplier_name,
                    "cost_per_unit": s.cost_per_unit,
                    "unit": s.unit,
                    "pack_size": s.pack_size,
                    "quantity_per_pack_item": s.quantity_per_pack_item,
                    "lead_time_days": s.lead_time_days,
                    "review_period_days": s.review_period_days,
                    "order_schedule_type": s.order_schedule_type,
                    "allowed_order_days": s.allowed_order_days,
                    "allowed_delivery_days": s.allowed_delivery_days,
                    "cadence_source": s.cadence_source,
                    "cadence_confidence_score": s.cadence_confidence_score,
                    "preferred": s.preferred,
                }
            )

        return {
            "status": "success",
            "ingredient_id": ingredient_id,
            "ingredient": {
                "ingredient_id": ingredient.ingredient_id,
                "name": ingredient.name,
                "unit": ingredient.unit,
                "category": ingredient.category,
                "policy_type": getattr(ingredient, "policy_type", None),
                "policy_assignment_mode": getattr(
                    ingredient, "policy_assignment_mode", None
                ),
                "target_service_level": getattr(ingredient, "target_service_level", None),
                "service_level_z": getattr(ingredient, "service_level_z", None),
                "policy_override_reason": getattr(
                    ingredient, "policy_override_reason", None
                ),
                "is_active": getattr(ingredient, "is_active", True),
                "suppliers": suppliers_payload,
            },
        }

    async def get_ingredients_with_suppliers(self):
        # Fetch all ingredients
        ingredients = await self.ingredient_repo.get_all()

        # Extract ingredient_ids from the fetched ingredients
        ingredient_ids = [ingredient.ingredient_id for ingredient in ingredients]

        # Fetch the supplier mappings based on ingredient IDs
        supplier_mappings = await self.ingredient_supplier_repo.get_by_ingredient_ids(
            ingredient_ids=ingredient_ids
        )

        # Fetch all suppliers at once by their supplier_ids
        supplier_ids = list({s.supplier_id for s in supplier_mappings})
        supplier_lookup = await self.supplier_repo.get_by_ids(supplier_ids)

        # Convert the list of suppliers into a dictionary for fast lookup
        supplier_lookup_dict = {
            supplier.supplier_id: supplier for supplier in supplier_lookup
        }

        # Create a mapping of ingredient_id to its suppliers
        supplier_map = {}
        for s in supplier_mappings:
            ing_id = s.ingredient_id
            if ing_id not in supplier_map:
                supplier_map[ing_id] = []

            # Ensure that the supplier_id exists in the supplier_lookup_dict
            supplier = supplier_lookup_dict.get(s.supplier_id)

            if supplier:
                supplier_name = supplier.name
                print(
                    f"Supplier Found - ID: {supplier.supplier_id}, Name: {supplier.name}"
                )
            else:
                supplier_name = "Unknown"
                print(f"Supplier ID {s.supplier_id} not found in supplier_lookup.")

            # Prepare supplier data
            supplier_data = {
                "ingredient_supplier_id": s.ingredient_supplier_id,
                "supplier_id": s.supplier_id,
                "supplier_name": supplier_name,
                "cost_per_unit": s.cost_per_unit,
                "unit": s.unit,
                "pack_size": s.pack_size,
                "quantity_per_pack_item": s.quantity_per_pack_item,
                "lead_time_days": s.lead_time_days,
                "review_period_days": s.review_period_days,
                "order_schedule_type": s.order_schedule_type,
                "allowed_order_days": s.allowed_order_days,
                "allowed_delivery_days": s.allowed_delivery_days,
                "cadence_source": s.cadence_source,
                "cadence_confidence_score": s.cadence_confidence_score,
                "preferred": s.preferred,
            }

            # Append supplier data to the map for the corresponding ingredient_id
            supplier_map[ing_id].append(supplier_data)

        # Enrich ingredients with their supplier information
        enriched_ingredients = []
        for ingredient in ingredients:
            enriched_ingredients.append(
                {
                    "ingredient_id": ingredient.ingredient_id,
                    "name": ingredient.name,
                    "unit": ingredient.unit,
                    "category": ingredient.category,
                    "policy_type": getattr(ingredient, "policy_type", None),
                    "policy_assignment_mode": getattr(
                        ingredient, "policy_assignment_mode", None
                    ),
                    "target_service_level": getattr(
                        ingredient, "target_service_level", None
                    ),
                    "service_level_z": getattr(ingredient, "service_level_z", None),
                    "policy_override_reason": getattr(
                        ingredient, "policy_override_reason", None
                    ),
                    "suppliers": supplier_map.get(ingredient.ingredient_id, []),
                }
            )

        return enriched_ingredients

    async def get_all_recipes_with_ingredients(self) -> List[Dict]:
        recipes = await self.recipe_repo.get_active()
        results = []

        for recipe in recipes:
            ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(
                recipe_id=recipe.recipe_id
            )

            ingredient_details = []
            for ri in ingredients:
                if ri.ingredient_type == "ingredient":
                    ingredient = await self.ingredient_repo.get_by_id(ri.reference_id)
                    name = ingredient.name if ingredient else "Unknown Ingredient"
                elif ri.ingredient_type == "batch":
                    batch = await self.batch_recipe_repo.get_by_id(ri.reference_id)
                    name = batch.name if batch else "Unknown Batch"
                else:
                    nested_recipe = await self.recipe_repo.get_by_id(ri.reference_id)
                    name = nested_recipe.name if nested_recipe else "Unknown Recipe"

                ingredient_details.append(
                    {
                        "name": name,
                        "quantity": ri.quantity_used,
                        "unit": ri.unit,
                        "type": ri.ingredient_type,
                        "reference_id": ri.reference_id,
                    }
                )

            results.append(
                {
                    "recipe_id": recipe.recipe_id,
                    "name": recipe.name,
                    "description": recipe.description,
                    "is_active": getattr(recipe, "is_active", True),
                    "ingredients": ingredient_details,
                    "restaurant_id": self.restaurant_id,
                }
            )
        return results

    async def get_recipe_usage(self, recipe_id: int) -> Dict:
        recipe = await self.recipe_repo.get_by_id(recipe_id)
        if not recipe:
            raise ValueError("Recipe not found")

        menu_item_links = await self.menu_recipe_repo.get_by_recipe(recipe_id)
        nested_recipe_links = await self.recipe_ingredient_repo.get_all_by_reference_id_and_type(
            "recipe", recipe_id
        )

        menu_items = []
        for link in menu_item_links:
            menu_item = await self.menu_repo.get_by_id(link.menu_item_id)
            if menu_item:
                menu_items.append(
                    {
                        "menu_item_id": menu_item.menu_item_id,
                        "menu_item_name": menu_item.name,
                        "is_active": getattr(menu_item, "is_active", True),
                    }
                )

        nested_in_recipes = []
        for link in nested_recipe_links:
            parent_recipe = await self.recipe_repo.get_by_id(link.recipe_id)
            if parent_recipe:
                nested_in_recipes.append(
                    {
                        "recipe_id": parent_recipe.recipe_id,
                        "recipe_name": parent_recipe.name,
                        "is_active": getattr(parent_recipe, "is_active", True),
                    }
                )

        return {
            "recipe_id": recipe.recipe_id,
            "recipe_name": recipe.name,
            "is_active": getattr(recipe, "is_active", True),
            "usage": {
                "menu_items": menu_items,
                "nested_in_recipes": nested_in_recipes,
                "menu_item_count": len(menu_items),
                "nested_recipe_count": len(nested_in_recipes),
            },
        }

    async def update_recipe_with_ingredients(self, recipe_dict: dict):
        updated_recipe = None
        recipe_id = recipe_dict.get("recipe_id")
        name = recipe_dict["name"]
        description = recipe_dict["description"]
        ingredients_data = recipe_dict["ingredients"]

        if ingredients_data:
            await self._validate_recipe_ingredients(ingredients_data, current_recipe_id=recipe_id)

        async with self.db.begin():  # Wrap the whole operation in a single transaction
            if recipe_id:
                # Update existing recipe
                existing_recipe = await self.recipe_repo.get_by_id(recipe_id)
                if existing_recipe:
                    if getattr(existing_recipe, "is_active", True) is False:
                        raise ValueError("Archived recipes cannot be updated.")
                    await self.recipe_repo.update(
                        recipe_id,
                        {
                            "name": name,
                            "description": description,
                        },
                    )
                    # Delete existing ingredients but don't commit yet.
                    await self.recipe_ingredient_repo.delete_by_recipe_id(recipe_id)

                else:
                    new_recipe = await self.recipe_repo.create(
                        {"name": name, "description": description}
                    )
                    recipe_id = getattr(new_recipe, self.recipe_repo.pk_field)
            else:
                new_recipe = await self.recipe_repo.create(
                    {"name": name, "description": description}
                )
                recipe_id = getattr(new_recipe, self.recipe_repo.pk_field)

            # Ensure new ingredients are added inside the transaction scope
            if ingredients_data:
                print(f'Deleting ingredients for recipe_id {recipe_id}')
                await self.recipe_ingredient_repo.delete_by_recipe_id(recipe_id)

                print(f'adding new ingredients: {ingredients_data}')
                for ing in ingredients_data:
                    print(f'adding ingredient: {ing}')
                    ingredient_type = normalize_component_type(
                        ing.get("type") or ing.get("ingredient_type")
                    )
                    ingredient = await self.recipe_ingredient_repo.create(
                        {
                            "recipe_id": recipe_id,
                            "quantity_used": ing.get("quantity", ing.get("quantity_used")),
                            "unit": ing["unit"],
                            "ingredient_type": ingredient_type,
                            "reference_id": ing.get("reference_id") or ing.get("ingredient_id"),
                        }
                    )
                    print(f'added ingredient: {ingredient}')

            # Retrieve the updated recipe and ingredients
            updated_recipe = await self.recipe_repo.get_by_id(recipe_id)
            ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(recipe_id)

            if updated_recipe is None:
                raise ValueError("No recipes were updated or created.")

        # Final output with ingredients
        recipe_dict = {
            c.name: getattr(updated_recipe, c.name)
            for c in updated_recipe.__table__.columns
        }
        return {**recipe_dict, "ingredients": ingredients}

    async def delete_recipe(self, recipe_id: int):
        recipe = await self.recipe_repo.get_by_id(recipe_id)
        if not recipe:
            raise ValueError("Recipe not found")

        if getattr(recipe, "is_active", True) is False:
            return {
                "message": "Recipe already archived",
                "archived": True,
                "usage": (await self.get_recipe_usage(recipe_id))["usage"],
            }

        usage = await self.get_recipe_usage(recipe_id)

        if self.db.in_transaction():
            await self.recipe_repo.update(recipe_id, {"is_active": False})
        else:
            async with self.db.begin():
                await self.recipe_repo.update(recipe_id, {"is_active": False})


        return {
            "message": "Recipe archived successfully",
            "archived": True,
            "lifecycle_action": "archive",
            "usage": usage["usage"],
        }

    async def delete_ingredient(self, ingredient_id: int):
        async with self.db.begin():
            ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
            if not ingredient or not getattr(ingredient, "is_active", True):
                raise ValueError("Ingredient not found")

            await self.ingredient_repo.soft_delete(ingredient_id)
            await self.ingredient_supplier_repo.soft_delete_by_ingredient_id(
                ingredient_id
            )

        return {"message": "Ingredient deleted"}

    async def create_menu_item(self, menu_data: dict):
        # Remove 'recipes' from the dict, if present
        menu_item_data = {k: v for k, v in menu_data.items() if k != "recipes"}

        async with self.db.begin():
            new_item = await self.menu_repo.create(menu_item_data)

            # Now create links for each recipe id if any
            recipes = menu_data.get("recipes", [])
            for recipe_id in recipes:
                menu_item_recipe_data = MenuItemRecipeCreate(
                    menu_item_id=new_item.menu_item_id,
                    recipe_id=recipe_id,
                    restaurant_id=self.restaurant_id,
                )
                await self.menu_recipe_repo.create(menu_item_recipe_data)

        return new_item

    async def update_menu_item(
    self,
    menu_item_id: int,
    restaurant_id: int,
    name: Optional[str] = None,
    price: Optional[float] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    recipes: Optional[List[int]] = None,
):
        
        # Prepare dictionary with only non-None fields
        update_fields = {}
        if name is not None:
            update_fields["name"] = name
        if price is not None:
            update_fields["price"] = price
        if category is not None:
            update_fields["category"] = category
        if is_active is not None:
            update_fields["is_active"] = is_active
        update_fields["restaurant_id"] = restaurant_id  # assuming needed for update

        async with self.db.begin():
            # Use your menu_repo update method to apply partial update with the dict
            updated_item = await self.menu_repo.update(menu_item_id, update_fields)
            if not updated_item:
                return None

            existing_links = await self.menu_recipe_repo.get_by_menu_item(menu_item_id)
            existing_recipe_ids = {link.recipe_id for link in existing_links}

            if recipes is not None:
                new_recipe_ids = set(recipes)
                recipes_to_remove = existing_recipe_ids - new_recipe_ids
                for recipe_id in recipes_to_remove:
                    await self.menu_recipe_repo.delete(menu_item_id, recipe_id)
                recipes_to_add = new_recipe_ids - existing_recipe_ids
                for recipe_id in recipes_to_add:
                    recipe = await self.recipe_repo.get_by_id(recipe_id)
                    if not recipe:
                        raise ValueError(
                            f"Recipe ID {recipe_id} not found for this restaurant."
                        )
                    await self.menu_recipe_repo.create({
                            "menu_item_id": menu_item_id,
                            "recipe_id": recipe_id,
                            "restaurant_id": self.restaurant_id,  # Make sure to add this if your model requires it
                        })
            else:
                # If no recipes provided, remove all links
                for link in existing_links:
                    await self.menu_recipe_repo.delete(menu_item_id, link.recipe_id)

        return updated_item


    async def delete_menu_item(self, menu_item_id: int):
        updated_menu_item = await self.menu_repo.update(
            menu_item_id, MenuItemUpdate(is_active=False)
        )

        if updated_menu_item:
            await self.menu_recipe_repo.delete(
                menu_item_id, updated_menu_item.recipe_id
            )
            return True
        return False

    async def get_all_menu_items(self):
        try:
            menu_items = await self.menu_repo.get_all()
            menu_item_data = []

            for item in menu_items:
                menu_item_dict = {
                    "menu_item_id": item.menu_item_id,
                    "menu_item_name": item.name,
                    "price": item.price,
                    "category": item.category,
                    "is_active": item.is_active,
                    "recipes": [],
                }

                menu_item_recipes = await self.menu_recipe_repo.get_by_menu_item(
                    item.menu_item_id
                )

                for menu_recipe in menu_item_recipes:
                    recipe = await self.recipe_repo.get_by_id(menu_recipe.recipe_id)
                    recipe_data = {
                        "recipe_id": recipe.recipe_id,
                        "recipe_name": recipe.name,
                        "ingredients": [],
                    }

                    recipe_ingredients = (
                        await self.recipe_ingredient_repo.get_by_recipe_id(
                            recipe.recipe_id
                        )
                    )

                    for ingredient in recipe_ingredients:
                        if ingredient.ingredient_type == "ingredient":
                            ingredient_data = await self.ingredient_repo.get_by_id(
                                ingredient.reference_id
                            )
                            ingredient_name = ingredient_data.name
                            ingredient_id = ingredient_data.ingredient_id
                        elif ingredient.ingredient_type == "batch":
                            batch_data = await self.batch_recipe_repo.get_by_id(
                                ingredient.reference_id
                            )
                            ingredient_name = batch_data.name
                            ingredient_id = batch_data.batch_recipe_id
                        elif ingredient.ingredient_type == "recipe":
                            recipe_data_ref = await self.recipe_repo.get_by_id(
                                ingredient.reference_id
                            )
                            ingredient_name = recipe_data_ref.name if recipe_data_ref else "Unknown Recipe"
                            ingredient_id = ingredient.reference_id
                        else:
                            ingredient_name = "Unknown"
                            ingredient_id = ingredient.reference_id

                        ingredient_dict = {
                            "ingredient_id": ingredient_id,
                            "ingredient_name": ingredient_name,
                            "quantity": ingredient.quantity_used,
                            "unit": ingredient.unit,
                        }
                        recipe_data["ingredients"].append(ingredient_dict)

                    menu_item_dict["recipes"].append(recipe_data)
                menu_item_data.append(menu_item_dict)
            return menu_item_data

        except Exception as e:
            traceback.print_exc()
            return {"error": f"An error occurred: {e}"}
