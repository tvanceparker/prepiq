from types import SimpleNamespace

import pytest

from app.mcp_server.auth import MCPActorContext
from app.mcp_server.errors import MCPValidationError
from app.mcp_server.schemas import CreatePurchaseOrdersFromSuggestionsInput
from app.mcp_server.service_adapters import MCPServiceAdapters


class FakePurchaseOrderSuggestionService:
    async def generate_purchase_order_suggestions(self, *, horizon_days, use_cached_forecast, manage_alerts):
        assert horizon_days == 7
        assert use_cached_forecast is True
        assert manage_alerts is False
        return {
            "forecast_usage_action": "allow",
            "forecast_status": "ready",
            "all_items": [
                {
                    "ingredient_id": 101,
                    "ingredient_name": "Tomato",
                    "ingredient_supplier_id": 501,
                    "supplier_id": 301,
                    "supplier_name": "Produce Co",
                    "quantity_to_order": 12.0,
                    "unit": "case",
                    "unit_price": 18.0,
                    "lead_time_days": 2,
                    "lead_demand": 4.0,
                    "shelf_demand": 8.0,
                }
            ],
        }


@pytest.fixture
def adapters():
    actor = MCPActorContext(
        username="manager",
        restaurant_id=1,
        subscription_tier="full",
        employee_id=7,
        name="Manager",
        role_id=3,
    )
    return MCPServiceAdapters(db=SimpleNamespace(), actor=actor)


@pytest.mark.asyncio
async def test_purchase_order_suggestions_are_revalidated_against_live_reorder_output(adapters):
    payload = CreatePurchaseOrdersFromSuggestionsInput(
        idempotency_key="po-suggest-1",
        suggestions=[
            {
                "ingredient_id": 101,
                "ingredient_name": "Tomato",
                "ingredient_supplier_id": 501,
                "supplier_id": 301,
                "supplier_name": "Produce Co",
                "quantity_to_order": 12,
                "unit": "case",
                "unit_price": 18,
            }
        ],
    )

    result = await adapters._validate_purchase_order_suggestions(
        FakePurchaseOrderSuggestionService(),
        payload,
    )

    assert result["matched_count"] == 1
    assert result["suggestions"][0]["ingredient_supplier_id"] == 501


@pytest.mark.asyncio
async def test_purchase_order_suggestion_validation_rejects_fabricated_quantity(adapters):
    payload = CreatePurchaseOrdersFromSuggestionsInput(
        idempotency_key="po-suggest-2",
        suggestions=[
            {
                "ingredient_id": 101,
                "ingredient_supplier_id": 501,
                "supplier_id": 301,
                "quantity_to_order": 20,
                "unit": "case",
                "unit_price": 18,
            }
        ],
    )

    with pytest.raises(MCPValidationError, match="quantity no longer matches"):
        await adapters._validate_purchase_order_suggestions(
            FakePurchaseOrderSuggestionService(),
            payload,
        )


@pytest.mark.asyncio
async def test_purchase_order_suggestion_validation_rejects_duplicates(adapters):
    item = {
        "ingredient_id": 101,
        "ingredient_supplier_id": 501,
        "supplier_id": 301,
        "quantity_to_order": 12,
        "unit": "case",
        "unit_price": 18,
    }
    payload = CreatePurchaseOrdersFromSuggestionsInput(
        idempotency_key="po-suggest-3",
        suggestions=[item, item],
    )

    with pytest.raises(MCPValidationError, match="Duplicate purchase-order suggestion"):
        await adapters._validate_purchase_order_suggestions(
            FakePurchaseOrderSuggestionService(),
            payload,
        )
