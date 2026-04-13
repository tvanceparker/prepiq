from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.menu_dto import RecipeArchiveResponseDTO, RecipeUpsertRequest
from app.schemas.prep_dto import (
    BatchRecipeArchiveResponseDTO,
    CreateBatchRecipeRequest,
)


def test_recipe_upsert_request_accepts_legacy_type_and_quantity_aliases():
    payload = RecipeUpsertRequest(
        name="Sauce",
        description="Test",
        ingredients=[
            {
                "reference_id": 30,
                "type": "batch",
                "quantity": Decimal("1.0"),
                "unit": "liter",
            }
        ],
    )

    ingredient = payload.model_dump()["ingredients"][0]

    assert ingredient["ingredient_type"] == "batch"
    assert ingredient["quantity_used"] == Decimal("1.0")


def test_recipe_upsert_request_rejects_unknown_component_type():
    with pytest.raises(ValidationError, match="ingredient|batch|recipe"):
        RecipeUpsertRequest(
            name="Sauce",
            description=None,
            ingredients=[
                {
                    "reference_id": 30,
                    "ingredient_type": "unknown",
                    "quantity_used": Decimal("1.0"),
                    "unit": "liter",
                }
            ],
        )


def test_create_batch_recipe_request_rejects_recipe_component_type():
    with pytest.raises(ValidationError, match="ingredient|batch"):
        CreateBatchRecipeRequest(
            name="Mother Sauce",
            description=None,
            yield_quantity=Decimal("2.0"),
            yield_unit="liter",
            estimated_prep_time_minutes=None,
            shelf_life_days=3,
            ingredients=[
                {
                    "reference_id": 200,
                    "ingredient_type": "recipe",
                    "quantity_used": Decimal("1.0"),
                    "unit": "liter",
                }
            ],
        )


def test_archive_response_models_accept_current_service_payloads():
    recipe_response = RecipeArchiveResponseDTO(
        message="Recipe archived successfully",
        archived=True,
        lifecycle_action="archive",
        usage={
            "menu_items": [],
            "nested_in_recipes": [],
            "menu_item_count": 0,
            "nested_recipe_count": 0,
        },
    )
    batch_response = BatchRecipeArchiveResponseDTO(
        message="Batch recipe already archived",
        archived=True,
        usage={
            "recipes": [],
            "batches": [],
            "prep_schedule_count": 0,
            "inventory_lot_count": 0,
            "recipe_count": 0,
            "batch_count": 0,
        },
    )

    assert recipe_response.lifecycle_action == "archive"
    assert batch_response.lifecycle_action is None