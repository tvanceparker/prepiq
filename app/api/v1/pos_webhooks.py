# app/api/v1/pos_webhooks.py
"""
Webhook endpoints for external POS providers (Square, Toast, Clover).
These endpoints receive real-time events from POS systems.
"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.pos_integration_service import POSIntegrationService
from app.repositories.pos_merchant_mappings_repo import POSMerchantMappingsRepository
from app.api.dependencies import build_service, get_db
from app.core.logging import logger
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/webhooks/pos", tags=["POS Webhooks"])


@router.post("/square")
@log_route("Square Webhook")
async def square_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive webhook events from Square.

    Events: order.created, order.updated, payment.created, etc.
    """
    # Get raw body for signature verification
    raw_body = await request.body()

    # Get signature from header
    signature = request.headers.get("x-square-signature", "")

    if not signature:
        raise HTTPException(status_code=401, detail="Missing signature header")

    # Parse JSON payload
    try:
        payload = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    # Extract merchant_id to determine which restaurant this belongs to
    merchant_id = payload.get("merchant_id")
    if not merchant_id:
        raise HTTPException(status_code=400, detail="Missing merchant_id in payload")

    # Look up restaurant_id by merchant_id
    merchant_mappings_repo = POSMerchantMappingsRepository(db=db)
    mapping = await merchant_mappings_repo.get_by_merchant_id(
        merchant_id=merchant_id,
        pos_provider="square"
    )

    if not mapping:
        logger.error(
            f"[Square Webhook] No restaurant found for merchant_id: {merchant_id}. "
            f"Merchant may not be connected to PrepIQ."
        )
        raise HTTPException(
            status_code=404,
            detail=f"No restaurant found for merchant_id: {merchant_id}"
        )

    restaurant_id = mapping.restaurant_id
    logger.info(f"[Square Webhook] Routing to restaurant_id: {restaurant_id}")

    # Initialize service
    pos_service = POSIntegrationService(
        db=db,
        restaurant_id=restaurant_id,
        subscription_tier="master",  # Webhooks available to all tiers with POS integration
        employee_id=1  # System user for automated processing
    )
    
    # Process webhook (can be backgrounded for heavy operations)
    try:
        result = await pos_service.handle_webhook_event(
            provider="square",
            payload=payload,
            signature=signature,
            raw_body=raw_body
        )
        logger.info(f"[Square Webhook] Processed: {result}")
        return {"status": "success", "result": result}
    except ValueError as e:
        logger.error(f"[Square Webhook] Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[Square Webhook] Processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.post("/toast")
@log_route("Toast Webhook")
async def toast_webhook(request: Request):
    """Toast webhook endpoint (Phase 2)."""
    return {"status": "not_implemented", "provider": "toast"}


@router.post("/clover")
@log_route("Clover Webhook")
async def clover_webhook(request: Request):
    """Clover webhook endpoint (Phase 3)."""
    return {"status": "not_implemented", "provider": "clover"}
