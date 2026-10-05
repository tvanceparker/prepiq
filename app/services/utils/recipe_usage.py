"""Canonical recipe expansion shared by forecasts and actual consumption.

Recipes describe quantities per serving; batch components describe quantities per
production batch. Prepared batch references remain leaves for sales consumption.
"""
from collections import defaultdict
from decimal import Decimal

from app.services.utils.unit_conversion import convert_unit


def reference_unit(reference, field='unit', fallback='count'):
    value = getattr(reference, field, None)
    return value if isinstance(value, str) and value else fallback


def component_quantity(component, target_unit):
    quantity = Decimal(str(component.quantity_used or 0))
    if not quantity.is_finite() or quantity < 0:
        raise ValueError('Recipe quantities must be finite and nonnegative')
    source = reference_unit(component, fallback=target_unit)
    return convert_unit(Decimal(str(component.quantity_used or 0)), source, target_unit)


class RecipeUsageExpander:
    def __init__(self, recipe_components, ingredients, batches, leaf_types=("ingredient", "batch")):
        self.recipe_components = recipe_components
        self.ingredients = ingredients
        self.batches = batches
        self.leaf_types = leaf_types

    async def expand(self, recipe_id, multiplier, visited=None):
        multiplier = Decimal(str(multiplier))
        if not multiplier.is_finite() or multiplier < 0:
            raise ValueError('Recipe multiplier must be finite and nonnegative')
        visited = set(visited or ())
        if recipe_id in visited:
            raise ValueError(f'Recipe graph cycle detected while expanding recipe {recipe_id}')
        visited.add(recipe_id)
        raw, prepared = defaultdict(Decimal), defaultdict(Decimal)
        for component in await self.recipe_components.get_by_recipe_id(recipe_id):
            kind = getattr(component.ingredient_type, 'value', component.ingredient_type)
            reference_id = int(component.reference_id)
            if kind == 'recipe':
                nested_raw, nested_prepared = await self.expand(
                    reference_id, Decimal(str(component.quantity_used or 0)) * multiplier, visited
                )
                for key, value in nested_raw.items():
                    raw[key] += value
                for key, value in nested_prepared.items():
                    prepared[key] += value
            elif kind == 'ingredient' and kind in self.leaf_types:
                ingredient = await self.ingredients.get_by_id(reference_id)
                if ingredient is None:
                    raise ValueError(f'Ingredient {reference_id} not found')
                raw[reference_id] += component_quantity(component, reference_unit(ingredient)) * multiplier
            elif kind == 'batch' and kind in self.leaf_types:
                batch = await self.batches.get_by_id(reference_id)
                if batch is None:
                    raise ValueError(f'Batch recipe {reference_id} not found')
                prepared[reference_id] += component_quantity(
                    component, reference_unit(batch, 'yield_unit')
                ) * multiplier
            elif kind not in {'ingredient', 'batch'}:
                raise ValueError(f'Unsupported recipe component type: {kind}')
        return dict(raw), dict(prepared)
