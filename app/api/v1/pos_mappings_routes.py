# app/api/v1/pos_mappings_routes.py
"""
API routes for managing POS item mappings.
Allows restaurants to view and manually configure mappings between
external POS items and internal menu items.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.dependencies import build_service, get_current_user, get_db
from app.services.helpers.pos_integration_service import POSIntegrationService
from app.services.helpers.pos_menu_matcher import POSMenuMatcher
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.pos_item_mappings_repo import POSItemMappingsRepository
from app.schemas.pos_dto import (
    POSItemMappingResponse,
    POSItemMappingCreate,
    POSItemMappingUpdate,
    POSItemMappingsListResponse,
    BatchAutoMatchRequest,
    BatchAutoMatchResponse
)
from app.core.logging import logger
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/pos/mappings", tags=["POS Mappings"])


@router.get("", response_model=POSItemMappingsListResponse)
@log_route("Get POS Item Mappings")
async def get_pos_item_mappings(
    pos_provider: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all POS item mappings for the restaurant.
    Optionally filter by pos_provider (square, toast, clover).
    """
    restaurant_id = current_user["restaurant_id"]
    mappings_repo = POSItemMappingsRepository(db, restaurant_id)

    # Get all mappings
    mappings = await mappings_repo.get_all_mappings(pos_provider=pos_provider)

    # Calculate statistics
    total = len(mappings)
    unmapped_count = sum(1 for m in mappings if m.mapping_status == 'unmapped')
    auto_mapped_count = sum(1 for m in mappings if m.mapping_status == 'auto')
    manual_mapped_count = sum(1 for m in mappings if m.mapping_status == 'manual')

    return POSItemMappingsListResponse(
        mappings=[POSItemMappingResponse.from_orm(m) for m in mappings],
        total=total,
        unmapped_count=unmapped_count,
        auto_mapped_count=auto_mapped_count,
        manual_mapped_count=manual_mapped_count
    )


@router.post("", response_model=POSItemMappingResponse)
@log_route("Create POS Item Mapping")
async def create_pos_item_mapping(
    mapping_data: POSItemMappingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually create or update a POS item mapping.
    """
    restaurant_id = current_user["restaurant_id"]
    mappings_repo = POSItemMappingsRepository(db, restaurant_id)

    # Create or update mapping
    mapping = await mappings_repo.upsert_mapping(
        external_item_id=mapping_data.external_item_id,
        pos_provider=mapping_data.pos_provider,
        external_item_name=mapping_data.external_item_name,
        menu_item_id=mapping_data.menu_item_id,
        confidence_score=mapping_data.confidence_score,
        mapping_status=mapping_data.mapping_status
    )

    await db.commit()

    logger.info(
        f"[POS Mappings] Created/updated mapping for restaurant {restaurant_id}: "
        f"{mapping_data.external_item_id} → {mapping_data.menu_item_id}"
    )

    return POSItemMappingResponse.from_orm(mapping)


@router.put("/{mapping_id}", response_model=POSItemMappingResponse)
@log_route("Update POS Item Mapping")
async def update_pos_item_mapping(
    mapping_id: int,
    mapping_data: POSItemMappingUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing POS item mapping (e.g., change menu_item_id or status).
    """
    restaurant_id = current_user["restaurant_id"]
    mappings_repo = POSItemMappingsRepository(db, restaurant_id)

    # Update mapping
    mapping = await mappings_repo.update_mapping(
        mapping_id=mapping_id,
        menu_item_id=mapping_data.menu_item_id,
        mapping_status=mapping_data.mapping_status,
        confidence_score=mapping_data.confidence_score
    )

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    await db.commit()

    logger.info(
        f"[POS Mappings] Updated mapping {mapping_id} for restaurant {restaurant_id}"
    )

    return POSItemMappingResponse.from_orm(mapping)


@router.delete("/{mapping_id}")
@log_route("Delete POS Item Mapping")
async def delete_pos_item_mapping(
    mapping_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a POS item mapping.
    """
    restaurant_id = current_user["restaurant_id"]
    mappings_repo = POSItemMappingsRepository(db, restaurant_id)

    success = await mappings_repo.delete_mapping(mapping_id)

    if not success:
        raise HTTPException(status_code=404, detail="Mapping not found")

    await db.commit()

    logger.info(
        f"[POS Mappings] Deleted mapping {mapping_id} for restaurant {restaurant_id}"
    )

    return {"status": "deleted", "mapping_id": mapping_id}


@router.post("/auto-match", response_model=BatchAutoMatchResponse)
@log_route("Batch Auto-Match POS Items")
async def batch_auto_match(
    request_data: BatchAutoMatchRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Batch auto-match external POS items to menu items using fuzzy matching.
    Accepts a list of external items and returns matching statistics.
    """
    restaurant_id = current_user["restaurant_id"]
    subscription_tier = current_user.get("subscription_tier", "basic")

    # Initialize repos and matcher
    menu_item_repo = MenuItemRepository(db, restaurant_id)
    mappings_repo = POSItemMappingsRepository(db, restaurant_id)
    menu_matcher = POSMenuMatcher(
        db=db,
        restaurant_id=restaurant_id,
        menu_item_repo=menu_item_repo,
        pos_item_mappings_repo=mappings_repo
    )

    # Convert items to expected format
    items_to_match = [
        (item['external_item_id'], item['external_item_name'])
        for item in request_data.items
    ]

    # Run batch auto-match
    stats = await menu_matcher.batch_auto_match(
        external_items=items_to_match,
        pos_provider=request_data.pos_provider
    )

    await db.commit()

    logger.info(
        f"[POS Mappings] Batch auto-match completed for restaurant {restaurant_id}: "
        f"{stats['matched']} matched, {stats['unmapped']} unmapped"
    )

    return BatchAutoMatchResponse(
        matched=stats['matched'],
        unmapped=stats['unmapped'],
        total=stats['total']
    )


@router.get("/unmapped")
@log_route("Get Unmapped POS Items")
async def get_unmapped_items(
    pos_provider: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all unmapped POS items that need manual mapping.
    """
    restaurant_id = current_user["restaurant_id"]
    mappings_repo = POSItemMappingsRepository(db, restaurant_id)

    unmapped = await mappings_repo.get_unmapped_items(pos_provider)

    return {
        "unmapped_items": [POSItemMappingResponse.from_orm(m) for m in unmapped],
        "count": len(unmapped)
    }
