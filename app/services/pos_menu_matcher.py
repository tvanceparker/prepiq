# app/services/pos_menu_matcher.py

from difflib import SequenceMatcher
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.menu_items_orm import MenuItem
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.pos_item_mappings_repo import POSItemMappingsRepository
import logging

logger = logging.getLogger(__name__)


class POSMenuMatcher:
    """
    Service for automatically matching external POS items to internal menu items
    using fuzzy string matching algorithms.
    """

    # Confidence threshold for automatic mapping
    HIGH_CONFIDENCE_THRESHOLD = 0.80  # 80% similarity
    MEDIUM_CONFIDENCE_THRESHOLD = 0.60  # 60% similarity

    def __init__(
        self,
        db: AsyncSession,
        restaurant_id: int,
        menu_item_repo: MenuItemRepository,
        pos_item_mappings_repo: POSItemMappingsRepository
    ):
        self.db = db
        self.restaurant_id = restaurant_id
        self.menu_item_repo = menu_item_repo
        self.pos_item_mappings_repo = pos_item_mappings_repo

    @staticmethod
    def calculate_similarity(str1: str, str2: str) -> float:
        """
        Calculate similarity ratio between two strings using SequenceMatcher.
        Returns a value between 0.0 and 1.0 (0% to 100% similarity).
        """
        # Normalize strings for better matching
        s1 = str1.lower().strip()
        s2 = str2.lower().strip()

        # Use SequenceMatcher for fuzzy comparison
        similarity = SequenceMatcher(None, s1, s2).ratio()

        return round(similarity, 2)

    async def find_best_match(
        self,
        external_item_name: str,
        menu_items: Optional[List[MenuItem]] = None
    ) -> Optional[Tuple[MenuItem, float]]:
        """
        Find the best matching menu item for an external item name.
        Returns tuple of (MenuItem, confidence_score) or None if no good match found.
        """
        # Get all active menu items if not provided
        if menu_items is None:
            menu_items = await self.menu_item_repo.get_all_menu_items()

        if not menu_items:
            logger.warning(f"No menu items found for restaurant {self.restaurant_id}")
            return None

        best_match = None
        highest_score = 0.0

        for menu_item in menu_items:
            similarity = self.calculate_similarity(external_item_name, menu_item.name)

            if similarity > highest_score:
                highest_score = similarity
                best_match = menu_item

        # Only return matches above minimum threshold
        if highest_score >= self.MEDIUM_CONFIDENCE_THRESHOLD:
            return (best_match, highest_score)

        return None

    async def auto_match_item(
        self,
        external_item_id: str,
        external_item_name: str,
        pos_provider: str
    ) -> Optional[int]:
        """
        Automatically match an external POS item to a menu item and store the mapping.
        Returns the menu_item_id if a match is found and stored, None otherwise.
        """
        # Find best match
        match_result = await self.find_best_match(external_item_name)

        if not match_result:
            # No good match found - create unmapped entry
            await self.pos_item_mappings_repo.upsert_mapping(
                external_item_id=external_item_id,
                pos_provider=pos_provider,
                external_item_name=external_item_name,
                menu_item_id=None,
                confidence_score=0.00,
                mapping_status='unmapped'
            )
            logger.info(
                f"No match found for external item '{external_item_name}' "
                f"(provider: {pos_provider}, id: {external_item_id})"
            )
            return None

        menu_item, confidence_score = match_result

        # Determine mapping status based on confidence
        if confidence_score >= self.HIGH_CONFIDENCE_THRESHOLD:
            mapping_status = 'auto'
            logger.info(
                f"Auto-matched '{external_item_name}' → '{menu_item.name}' "
                f"(confidence: {confidence_score:.2%})"
            )
        else:
            # Medium confidence - create mapping but mark for manual review
            mapping_status = 'unmapped'  # Requires manual confirmation
            logger.info(
                f"Medium confidence match: '{external_item_name}' → '{menu_item.name}' "
                f"(confidence: {confidence_score:.2%}) - requires manual review"
            )

        # Store the mapping
        await self.pos_item_mappings_repo.upsert_mapping(
            external_item_id=external_item_id,
            pos_provider=pos_provider,
            external_item_name=external_item_name,
            menu_item_id=menu_item.menu_item_id,
            confidence_score=confidence_score,
            mapping_status=mapping_status
        )

        # Only return menu_item_id if high confidence (auto-mapped)
        if mapping_status == 'auto':
            return menu_item.menu_item_id

        return None

    async def batch_auto_match(
        self,
        external_items: List[Tuple[str, str]],  # [(external_id, external_name), ...]
        pos_provider: str
    ) -> dict:
        """
        Batch auto-match multiple external items.
        Returns dict with statistics: {matched: int, unmapped: int, total: int}
        """
        stats = {
            'matched': 0,
            'unmapped': 0,
            'total': len(external_items)
        }

        # Pre-fetch all menu items to avoid repeated queries
        menu_items = await self.menu_item_repo.get_all_menu_items()

        for external_id, external_name in external_items:
            match_result = await self.find_best_match(external_name, menu_items)

            if match_result:
                menu_item, confidence_score = match_result

                if confidence_score >= self.HIGH_CONFIDENCE_THRESHOLD:
                    mapping_status = 'auto'
                    stats['matched'] += 1
                else:
                    mapping_status = 'unmapped'
                    stats['unmapped'] += 1

                await self.pos_item_mappings_repo.upsert_mapping(
                    external_item_id=external_id,
                    pos_provider=pos_provider,
                    external_item_name=external_name,
                    menu_item_id=menu_item.menu_item_id,
                    confidence_score=confidence_score,
                    mapping_status=mapping_status
                )
            else:
                # No match found
                stats['unmapped'] += 1
                await self.pos_item_mappings_repo.upsert_mapping(
                    external_item_id=external_id,
                    pos_provider=pos_provider,
                    external_item_name=external_name,
                    menu_item_id=None,
                    confidence_score=0.00,
                    mapping_status='unmapped'
                )

        logger.info(
            f"Batch auto-match complete for {pos_provider}: "
            f"{stats['matched']} matched, {stats['unmapped']} unmapped, {stats['total']} total"
        )

        return stats

    async def get_or_match_menu_item_id(
        self,
        external_item_id: str,
        external_item_name: str,
        pos_provider: str
    ) -> Optional[int]:
        """
        Get menu_item_id for an external item. If mapping doesn't exist,
        attempts auto-matching. Returns menu_item_id or None.
        """
        # Check if mapping already exists
        existing_mapping = await self.pos_item_mappings_repo.get_mapping(
            external_item_id=external_item_id,
            pos_provider=pos_provider
        )

        if existing_mapping:
            # Return existing mapping if it's auto or manual
            if existing_mapping.mapping_status in ['auto', 'manual']:
                return existing_mapping.menu_item_id
            # If unmapped, try to auto-match again (maybe new menu items added)

        # Attempt auto-matching
        return await self.auto_match_item(
            external_item_id=external_item_id,
            external_item_name=external_item_name,
            pos_provider=pos_provider
        )
