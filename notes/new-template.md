# This is the way

```python
from pydantic import BaseModel, ConfigDict
class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

# Ingredient nested inside recipe
class RecipeIngredientDTO(BaseModel):
    quantity_used: float
    unit: str
    ingredient_type: Literal["ingredient", "batch"]
    reference_id: int

class RecipeCreateDTO(BaseModel):
    name: str
    description: Optional[str] = None
    ingredients: List[RecipeIngredientDTO]

class RecipeUpdateDTO(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[List[RecipeIngredientDTO]] = None

class RecipeIngredientReadDTO(RecipeIngredientDTO):
    recipe_ingredient_id: int
    reference_name: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)

class RecipeReadDTO(BaseModel):
    recipe_id: int
    name: str
    description: Optional[str]
    ingredients: List[RecipeIngredientReadDTO] = []
    
    model_config = ConfigDict(from_attributes=True)

class MenuService:

    async def create_recipe(self, dto: RecipeCreateDTO) -> RecipeReadDTO:
        async with self.db.begin():
            recipe_data = dto.model_dump(exclude={"ingredients"})
            recipe = await self.recipe_repo.create(recipe_data)

            for ing in dto.ingredients:
                ing_data = ing.model_copy(update={"recipe_id": recipe.recipe_id})
                await self.recipe_ingredient_repo.create(ing_data)

        return RecipeReadDTO.model_validate(recipe)

    async def update_recipe(self, recipe_id: int, dto: RecipeUpdateDTO) -> RecipeReadDTO:
        async with self.db.begin():
            update_data = dto.model_dump(exclude_unset=True, exclude={"ingredients"})
            if update_data:
                await self.recipe_repo.update(recipe_id, update_data)

            if dto.ingredients is not None:
                await self.recipe_ingredient_repo.delete_by_recipe_id(recipe_id)
                for ing in dto.ingredients:
                    ing_data = ing.model_copy(update={"recipe_id": recipe_id})
                    await self.recipe_ingredient_repo.create(ing_data)

            updated_recipe = await self.recipe_repo.get_by_id(recipe_id)

        return RecipeReadDTO.model_validate(updated_recipe)

@router.post("/recipes", response_model=StandardResponse)
async def create_recipe(dto: RecipeCreateDTO):
    try:
        recipe = await service.create_recipe(dto)
        return StandardResponse(success=True, message="Recipe created", data=recipe)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/recipes/{recipe_id}", response_model=StandardResponse)
async def update_recipe(recipe_id: int, dto: RecipeUpdateDTO):
    try:
        recipe = await service.update_recipe(recipe_id, dto)
        return StandardResponse(success=True, message="Recipe updated", data=recipe)
    except Exception as e:
        raise HTTPException(status_code=404, detail="Recipe not found")
