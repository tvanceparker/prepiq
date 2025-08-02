# CRUD with Linked Tables - Python/FastAPI/Pydantic Cheat Sheet

---

## DTOs

```python
from pydantic import BaseModel
from typing import List, Optional

class IngredientDTO(BaseModel):
    name: str
    unit: str
    category: Optional[str]

class SupplierDTO(BaseModel):
    name: str
    contact_info: Optional[str]

class IngredientSupplierDTO(BaseModel):
    ingredient_id: int
    supplier_id: int
    price: Optional[float]

class RecipeIngredientDTO(BaseModel):
    quantity_used: float
    unit: str
    ingredient_type: str
    reference_id: Optional[int]

class RecipeCreateDTO(BaseModel):
    name: str
    description: Optional[str]
    ingredients: List[RecipeIngredientDTO]

class RecipeUpdateDTO(BaseModel):
    name: Optional[str]
    description: Optional[str]
    ingredients: Optional[List[RecipeIngredientDTO]]


class IngredientService:

    async def create_ingredient(self, dto: IngredientDTO):
        return await self.ingredient_repo.create(dto)

    async def update_ingredient(self, ingredient_id: int, dto: IngredientDTO):
        update_data = dto.model_dump(exclude_unset=True)
        return await self.ingredient_repo.update(ingredient_id, update_data)

    async def delete_ingredient(self, ingredient_id: int):
        # Delete links first
        await self.ingredient_supplier_repo.delete_by_ingredient_id(ingredient_id)
        return await self.ingredient_repo.delete(ingredient_id)


class IngredientSupplierService:

    async def create_link(self, dto: IngredientSupplierDTO):
        return await self.ingredient_supplier_repo.create(dto)

    async def update_link(self, link_id: int, dto: IngredientSupplierDTO):
        update_data = dto.model_dump(exclude_unset=True)
        return await self.ingredient_supplier_repo.update(link_id, update_data)

    async def delete_link(self, link_id: int):
        return await self.ingredient_supplier_repo.delete(link_id)


class RecipeService:

    async def create_recipe(self, dto: RecipeCreateDTO):
        async with self.db.begin():
            # Create recipe (exclude ingredients)
            recipe_data = dto.model_dump(exclude={"ingredients"})
            recipe = await self.recipe_repo.create(recipe_data)

            # Create linked ingredients with recipe_id injected
            for ing in dto.ingredients:
                ing_with_recipe_id = ing.model_copy(update={"recipe_id": recipe.recipe_id})
                await self.recipe_ingredient_repo.create(ing_with_recipe_id)

            return recipe

    async def update_recipe(self, recipe_id: int, dto: RecipeUpdateDTO):
        async with self.db.begin():
            update_data = dto.model_dump(exclude_unset=True, exclude={"ingredients"})
            if update_data:
                await self.recipe_repo.update(recipe_id, update_data)

            if dto.ingredients is not None:
                # Delete old links and recreate new ones
                await self.recipe_ingredient_repo.delete_by_recipe_id(recipe_id)
                for ing in dto.ingredients:
                    ing_with_recipe_id = ing.model_copy(update={"recipe_id": recipe_id})
                    await self.recipe_ingredient_repo.create(ing_with_recipe_id)

            return await self.recipe_repo.get_by_id(recipe_id)

    async def delete_recipe(self, recipe_id: int):
        async with self.db.begin():
            # Delete linked ingredients first
            await self.recipe_ingredient_repo.delete_by_recipe_id(recipe_id)
            # Delete recipe itself
            return await self.recipe_repo.delete(recipe_id)


from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()

@router.post("/ingredients/")
async def create_ingredient(dto: IngredientDTO, service: IngredientService = Depends()):
    return await service.create_ingredient(dto)

@router.patch("/ingredients/{ingredient_id}")
async def update_ingredient(ingredient_id: int, dto: IngredientDTO, service: IngredientService = Depends()):
    updated = await service.update_ingredient(ingredient_id, dto)
    if not updated:
        raise HTTPException(404, "Ingredient not found")
    return updated

@router.delete("/ingredients/{ingredient_id}")
async def delete_ingredient(ingredient_id: int, service: IngredientService = Depends()):
    success = await service.delete_ingredient(ingredient_id)
    if not success:
        raise HTTPException(404, "Ingredient not found")
    return {"detail": "Deleted successfully"}


@router.post("/recipes/")
async def create_recipe(dto: RecipeCreateDTO, service: RecipeService = Depends()):
    return await service.create_recipe(dto)

@router.patch("/recipes/{recipe_id}")
async def update_recipe(recipe_id: int, dto: RecipeUpdateDTO, service: RecipeService = Depends()):
    updated = await service.update_recipe(recipe_id, dto)
    if not updated:
        raise HTTPException(404, "Recipe not found")
    return updated

@router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: int, service: RecipeService = Depends()):
    success = await service.delete_recipe(recipe_id)
    if not success:
        raise HTTPException(404, "Recipe not found")
    return {"detail": "Deleted successfully"}
```

### Get Method (Read)

```python
from typing import List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException

app = FastAPI()

# --- DTOs ---

class RecipeIngredientReadDTO(BaseModel):
    recipe_ingredient_id: int
    recipe_id: int
    quantity_used: float
    unit: Optional[str]
    ingredient_type: str
    reference_id: int
    ingredient_name: Optional[str] = None

class RecipeReadDTO(BaseModel):
    recipe_id: int
    name: str
    description: Optional[str]
    ingredients: List[RecipeIngredientReadDTO] = []

# --- Service ---

class RecipeService:
    def __init__(self, recipe_repo, recipe_ingredient_repo, ingredient_repo):
        self.recipe_repo = recipe_repo
        self.recipe_ingredient_repo = recipe_ingredient_repo
        self.ingredient_repo = ingredient_repo

    async def get_recipe_with_ingredients(self, recipe_id: int) -> Optional[RecipeReadDTO]:
        recipe = await self.recipe_repo.get_by_id(recipe_id)
        if not recipe:
            return None

        recipe_ingredients = await self.recipe_ingredient_repo.get_by_recipe_id(recipe_id)

        ingredients_dtos = []
        for ri in recipe_ingredients:
            # Convert ORM or Pydantic model to dict
            ri_dict = ri.model_dump() if hasattr(ri, "model_dump") else ri.__dict__
            if ri.reference_id:
                ingredient = await self.ingredient_repo.get_by_id(ri.reference_id)
                ri_dict["ingredient_name"] = getattr(ingredient, "name", None)
            else:
                ri_dict["ingredient_name"] = None

            ingredients_dtos.append(RecipeIngredientReadDTO.model_validate(ri_dict))

        recipe_dict = recipe.model_dump() if hasattr(recipe, "model_dump") else recipe.__dict__
        return RecipeReadDTO.model_validate({**recipe_dict, "ingredients": ingredients_dtos})

# --- Dependency / setup ---

# Assume these are instantiated repo objects with the required async methods:
recipe_repo = ...
recipe_ingredient_repo = ...
ingredient_repo = ...
service = RecipeService(recipe_repo, recipe_ingredient_repo, ingredient_repo)

# --- Routes ---

@app.get("/recipes/{recipe_id}", response_model=RecipeReadDTO)
async def read_recipe(recipe_id: int):
    recipe_dto = await service.get_recipe_with_ingredients(recipe_id)
    if not recipe_dto:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe_dto


# -----Response ----------

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

#In route
#Success
return StandardResponse(success=True, message="Recipe created successfully", data=recipe_dto)
#Failure
return StandardResponse(success=False, message="Recipe not found")

from fastapi import HTTPException

@app.post("/recipes", response_model=StandardResponse)
async def create_recipe(dto: RecipeCreateDTO):
    try:
        recipe = await service.create_recipe(dto)
        return StandardResponse(success=True, message="Recipe created", data=recipe)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
