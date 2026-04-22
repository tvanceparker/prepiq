import pytest
from pydantic import ValidationError

from app.mcp_server.confirmation import (
    issue_confirmation_token,
    payload_hash,
    verify_confirmation_token,
)
from app.mcp_server.schemas import (
    CreateMenuItemInput,
    CreatePurchaseOrderInput,
    ResolveEntitiesInput,
    UpdatePurchaseOrderItemInput,
)


def test_tool_schema_rejects_unknown_restaurant_id():
    with pytest.raises(ValidationError):
        CreateMenuItemInput.model_validate(
            {
                "idempotency_key": "menu-12345",
                "name": "Burger",
                "price": 12.5,
                "restaurant_id": 99,
            }
        )


def test_purchase_order_schema_rejects_tenant_scope_and_requires_item_update():
    with pytest.raises(ValidationError):
        CreatePurchaseOrderInput.model_validate(
            {
                "idempotency_key": "po-12345",
                "supplier_id": 10,
                "restaurant_id": 99,
                "items": [
                    {
                        "ingredient_id": 1,
                        "ingredient_supplier_id": 2,
                        "quantity_ordered": 3,
                        "unit": "case",
                        "unit_price": 12,
                    }
                ],
            }
        )


def test_entity_resolution_schema_rejects_unknown_restaurant_id():
    with pytest.raises(ValidationError):
        ResolveEntitiesInput.model_validate(
            {
                "restaurant_id": 5,
                "entities": [
                    {"entity_type": "ingredient", "query": "chicken breast"},
                ],
            }
        )

    with pytest.raises(ValidationError):
        UpdatePurchaseOrderItemInput.model_validate(
            {
                "idempotency_key": "poi-12345",
                "order_id": 10,
                "order_item_id": 20,
            }
        )


def test_confirmation_token_is_bound_to_actor_tool_and_payload():
    digest = payload_hash({"menu_item_id": 10, "is_active": False})
    token = issue_confirmation_token(
        tool_name="set_menu_item_active",
        restaurant_id=1,
        employee_id=7,
        payload_digest=digest,
        risk_level="menu_lifecycle",
    )

    assert verify_confirmation_token(
        token,
        tool_name="set_menu_item_active",
        restaurant_id=1,
        employee_id=7,
        payload_digest=digest,
    )
    assert not verify_confirmation_token(
        token,
        tool_name="set_menu_item_active",
        restaurant_id=2,
        employee_id=7,
        payload_digest=digest,
    )
    assert not verify_confirmation_token(
        token + "tampered",
        tool_name="set_menu_item_active",
        restaurant_id=1,
        employee_id=7,
        payload_digest=digest,
    )
