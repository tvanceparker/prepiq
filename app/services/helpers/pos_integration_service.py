# app/services/helpers/pos_integration_service.py
"""
POS Integration Service - orchestrates external POS provider connections,
data synchronization, and webhook event processing.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.utils.logger_helpers import log_method
from app.integrations.pos import SquareProvider
from app.integrations.pos.base_provider import BasePOSProvider
from app.integrations.pos.encryption_utils import encrypt_token, decrypt_token
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.menu_items_repo import MenuItemRepository
from app.repositories.pos_item_mappings_repo import POSItemMappingsRepository
from app.repositories.pos_merchant_mappings_repo import POSMerchantMappingsRepository
from app.repositories.orders_repo import OrdersRepository
from app.services.order_service import OrderService
from app.services.helpers.pos_menu_matcher import POSMenuMatcher
from app.services.utils.inventory_deduction_helper import InventoryDeductionHelper
from app.services.utils.subscription_tiers import is_full_service_tier
from app.repositories.sales_repo import SalesRepository
from app.schemas.order_dto import OrderCreate, OrderItemCreate
from app.schemas.pos_dto import POSSyncSummaryOut


class POSIntegrationService:
    """Service for managing external POS integrations."""
    
    PROVIDER_MAP = {
        "square": SquareProvider,
        # "toast": ToastProvider,  # Phase 2
        # "clover": CloverProvider,  # Phase 3
    }
    
    def __init__(
        self,
        db: AsyncSession,
        restaurant_id: int,
        subscription_tier: str,
        employee_id: int
    ):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self.sales_repo = SalesRepository(db, restaurant_id)
        self.orders_repo = OrdersRepository(db, restaurant_id)
        self.order_service = OrderService(db, restaurant_id, subscription_tier, employee_id)
        self.menu_item_repo = MenuItemRepository(db, restaurant_id)
        self.pos_item_mappings_repo = POSItemMappingsRepository(db, restaurant_id)
        self.pos_merchant_mappings_repo = POSMerchantMappingsRepository(db, restaurant_id)
        self.menu_matcher = POSMenuMatcher(
            db=db,
            restaurant_id=restaurant_id,
            menu_item_repo=self.menu_item_repo,
            pos_item_mappings_repo=self.pos_item_mappings_repo
        )
        self.inventory_helper = InventoryDeductionHelper(
            db=db,
            restaurant_id=restaurant_id,
            subscription_tier=subscription_tier,
            employee_id=employee_id,
        )
    
    async def _get_restaurant(self):
        """Fetch restaurant record."""
        return await self.restaurant_repo.get_by_id(self.restaurant_id)

    def _build_sync_message(
        self,
        *,
        total_orders_fetched: int,
        total_orders_ingested: int,
        total_orders_failed: int,
        duplicate_orders: int,
        unmapped_items: List[str],
        deduction_failures: List[str],
        status: str,
    ) -> str:
        if status == "failed" and total_orders_ingested == 0:
            return "Sync failed before any orders were safely ingested."

        message_parts = [
            f"Fetched {total_orders_fetched} order{'s' if total_orders_fetched != 1 else ''}.",
            f"Ingested {total_orders_ingested} order{'s' if total_orders_ingested != 1 else ''}.",
        ]

        if duplicate_orders:
            message_parts.append(
                f"Ignored {duplicate_orders} duplicate order{'s' if duplicate_orders != 1 else ''}."
            )
        if total_orders_failed:
            message_parts.append(
                f"{total_orders_failed} order{'s' if total_orders_failed != 1 else ''} failed."
            )
        if unmapped_items:
            message_parts.append(
                f"{len(unmapped_items)} unmapped item{'s' if len(unmapped_items) != 1 else ''} need review."
            )
        if deduction_failures:
            message_parts.append(
                f"{len(deduction_failures)} order{'s' if len(deduction_failures) != 1 else ''} had deduction failures."
            )

        return " ".join(message_parts)

    def _build_sync_summary(
        self,
        *,
        provider: str,
        sync_id: str,
        start_date: datetime,
        end_date: datetime,
        total_orders_fetched: int,
        total_orders_ingested: int,
        total_items_synced: int,
        duplicate_orders: int,
        failed_orders: List[Dict[str, Optional[str]]],
        unmapped_items: List[str],
        deduction_failures: List[str],
        status_override: Optional[str] = None,
    ) -> POSSyncSummaryOut:
        total_orders_failed = len(failed_orders)

        if status_override:
            status = status_override
        elif total_orders_failed == 0 and not unmapped_items and not deduction_failures:
            status = "success"
        elif total_orders_ingested == 0 and total_orders_failed > 0:
            status = "failed"
        else:
            status = "partial"

        return POSSyncSummaryOut(
            sync_id=sync_id,
            provider=provider,
            status=status,
            message=self._build_sync_message(
                total_orders_fetched=total_orders_fetched,
                total_orders_ingested=total_orders_ingested,
                total_orders_failed=total_orders_failed,
                duplicate_orders=duplicate_orders,
                unmapped_items=unmapped_items,
                deduction_failures=deduction_failures,
                status=status,
            ),
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_orders_fetched=total_orders_fetched,
            total_orders_ingested=total_orders_ingested,
            total_orders_failed=total_orders_failed,
            total_items_synced=total_items_synced,
            duplicate_orders=duplicate_orders,
            failed_orders=failed_orders,
            unmapped_items=unmapped_items,
            deduction_failures=deduction_failures,
        )
    
    def _get_provider_instance(
        self,
        provider_name: str,
        restaurant: Any,
        environment: str = "production"
    ) -> BasePOSProvider:
        """Initialize provider adapter with decrypted credentials."""
        provider_class = self.PROVIDER_MAP.get(provider_name)
        if not provider_class:
            raise ValueError(f"Unsupported POS provider: {provider_name}")
        
        # Decrypt tokens
        access_token = decrypt_token(restaurant.pos_access_token)
        refresh_token = decrypt_token(restaurant.pos_refresh_token)
        
        return provider_class(
            access_token=access_token,
            refresh_token=refresh_token,
            location_id=restaurant.pos_location_id,
            merchant_id=restaurant.pos_merchant_id,
            environment=environment
        )
    
    @log_method("POS Integration: Get OAuth URL")
    async def get_oauth_authorization_url(
        self,
        provider: str,
        redirect_uri: str,
        state: str
    ) -> str:
        """
        Generate OAuth authorization URL for provider connection.
        
        Args:
            provider: Provider name ('square', 'toast', 'clover')
            redirect_uri: OAuth callback URL
            state: CSRF protection state token
            
        Returns:
            OAuth authorization URL
        """
        provider_class = self.PROVIDER_MAP.get(provider)
        if not provider_class:
            raise ValueError(f"Unsupported provider: {provider}")
        
        # Initialize provider without credentials (just for URL generation)
        provider_instance = provider_class()
        return provider_instance.get_oauth_url(redirect_uri, state)
    
    @log_method("POS Integration: Complete OAuth")
    async def complete_oauth_flow(
        self,
        provider: str,
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Complete OAuth flow by exchanging code for tokens and storing them.
        
        Args:
            provider: Provider name
            code: Authorization code from OAuth callback
            redirect_uri: Same redirect URI used in authorization
            
        Returns:
            Connection status and location info
        """
        provider_class = self.PROVIDER_MAP.get(provider)
        if not provider_class:
            raise ValueError(f"Unsupported provider: {provider}")
        
        # Initialize provider
        provider_instance = provider_class()
        
        # Exchange code for tokens
        token_data = await provider_instance.exchange_code_for_token(code, redirect_uri)
        
        # For Square, fetch locations to get location_id
        location_id = token_data.get("location_id")
        if not location_id and provider == "square":
            # Update provider with access token
            provider_instance.access_token = token_data["access_token"]
            locations = await provider_instance.get_locations()
            if locations:
                location_id = locations[0]["id"]  # Use first location by default
        
        # Encrypt tokens before storage
        encrypted_access = encrypt_token(token_data["access_token"])
        encrypted_refresh = encrypt_token(token_data.get("refresh_token"))
        
        merchant_id = token_data.get("merchant_id")

        # Update restaurant record
        await self.restaurant_repo.update(self.restaurant_id, {
            "pos_provider": provider,
            "pos_connected": True,
            "pos_access_token": encrypted_access,
            "pos_refresh_token": encrypted_refresh,
            "pos_location_id": location_id,
            "pos_merchant_id": merchant_id,
            "pos_last_sync": None,  # Will be set on first sync
        })

        # Store merchant mapping for webhook routing
        if merchant_id:
            await self.pos_merchant_mappings_repo.upsert_mapping(
                merchant_id=merchant_id,
                pos_provider=provider,
                restaurant_id=self.restaurant_id,
                location_id=location_id
            )
            logger.info(
                f"[POS Integration] Merchant mapping created: "
                f"{merchant_id} → restaurant {self.restaurant_id}"
            )

        logger.info(f"[POS Integration] {provider} connected for restaurant {self.restaurant_id}")

        return {
            "status": "connected",
            "provider": provider,
            "location_id": location_id,
            "merchant_id": merchant_id,
        }
    
    @log_method("POS Integration: Disconnect")
    async def disconnect_provider(self) -> Dict[str, Any]:
        """Disconnect current POS provider and revoke tokens."""
        restaurant = await self._get_restaurant()
        
        if not restaurant.pos_connected or restaurant.pos_provider == "none":
            return {"status": "not_connected"}
        
        provider_name = restaurant.pos_provider
        
        # Try to revoke token with provider
        try:
            provider = self._get_provider_instance(provider_name, restaurant)
            await provider.revoke_token()
        except Exception as e:
            logger.warning(f"[POS Integration] Token revocation failed: {e}")
        
        # Delete merchant mapping
        await self.pos_merchant_mappings_repo.delete_by_restaurant(
            restaurant_id=self.restaurant_id,
            pos_provider=provider_name
        )

        # Clear credentials from database
        await self.restaurant_repo.update(self.restaurant_id, {
            "pos_provider": "none",
            "pos_connected": False,
            "pos_access_token": None,
            "pos_refresh_token": None,
            "pos_location_id": None,
            "pos_merchant_id": None,
            "pos_webhook_secret": None,
        })

        logger.info(f"[POS Integration] {provider_name} disconnected for restaurant {self.restaurant_id}")
        
        return {
            "status": "disconnected",
            "provider": provider_name,
        }
    
    @log_method("POS Integration: Sync Orders")
    async def sync_orders(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        max_pages: int = 10
    ) -> POSSyncSummaryOut:
        """
        Sync orders from POS provider.
        
        Args:
            start_date: Start of sync window (defaults to last sync or yesterday)
            end_date: End of sync window (defaults to now)
            max_pages: Maximum pagination pages to fetch
            
        Returns:
            Sync statistics
        """
        restaurant = await self._get_restaurant()
        
        if not restaurant.pos_connected or restaurant.pos_provider == "none":
            raise ValueError("No POS provider connected")
        
        # Default date range
        if not end_date:
            end_date = datetime.utcnow()
        
        if not start_date:
            if restaurant.pos_last_sync:
                start_date = restaurant.pos_last_sync
            else:
                start_date = end_date - timedelta(days=30)  # Initial sync: last 30 days
        
        provider = self._get_provider_instance(restaurant.pos_provider, restaurant)
        sync_id = str(uuid4())
        
        total_orders_fetched = 0
        total_orders_ingested = 0
        total_items = 0
        duplicate_orders = 0
        failed_orders: List[Dict[str, Optional[str]]] = []
        unmapped_items: set[str] = set()
        deduction_failures: List[str] = []
        cursor = None
        fetch_method = getattr(provider, "fetch_orders_with_retry", provider.fetch_orders)
        
        for page in range(max_pages):
            try:
                result = await fetch_method(start_date, end_date, cursor)
            except Exception as exc:
                logger.error("[POS Integration] Order fetch failed: %s", exc, exc_info=True)
                failed_orders.append({"external_id": None, "reason": str(exc)})
                return self._build_sync_summary(
                    provider=restaurant.pos_provider,
                    sync_id=sync_id,
                    start_date=start_date,
                    end_date=end_date,
                    total_orders_fetched=total_orders_fetched,
                    total_orders_ingested=total_orders_ingested,
                    total_items_synced=total_items,
                    duplicate_orders=duplicate_orders,
                    failed_orders=failed_orders,
                    unmapped_items=sorted(unmapped_items),
                    deduction_failures=deduction_failures,
                    status_override="failed",
                )

            orders = result.get("orders", [])
            total_orders_fetched += len(orders)
            
            if not orders:
                break
            
            # Transform and insert orders
            for external_order in orders:
                try:
                    order_data = provider.transform_order(external_order)

                    ingest_result = await self._ingest_order(order_data)
                    unmapped_items.update(ingest_result.get("unmapped_items", []))

                    if ingest_result.get("status") == "duplicate":
                        duplicate_orders += 1
                    elif ingest_result.get("status") == "failed":
                        failed_orders.append(
                            {
                                "external_id": ingest_result.get("external_id"),
                                "reason": ingest_result.get("reason", "unknown_error"),
                            }
                        )
                    else:
                        total_orders_ingested += 1
                        total_items += ingest_result.get("items_synced", 0)
                        if ingest_result.get("deduction_state") == "failed":
                            deduction_failures.append(ingest_result.get("external_id") or "unknown")
                except Exception as e:
                    logger.error(f"[POS Integration] Failed to ingest order: {e}", exc_info=True)
                    failed_orders.append(
                        {
                            "external_id": external_order.get("id"),
                            "reason": str(e),
                        }
                    )
            
            cursor = result.get("cursor")
            if not cursor:
                break
        
        summary = self._build_sync_summary(
            provider=restaurant.pos_provider,
            sync_id=sync_id,
            start_date=start_date,
            end_date=end_date,
            total_orders_fetched=total_orders_fetched,
            total_orders_ingested=total_orders_ingested,
            total_items_synced=total_items,
            duplicate_orders=duplicate_orders,
            failed_orders=failed_orders,
            unmapped_items=sorted(unmapped_items),
            deduction_failures=deduction_failures,
        )

        if summary.status != "failed":
            await self.restaurant_repo.update(self.restaurant_id, {
                "pos_last_sync": datetime.utcnow()
            })

        logger.info(
            "[POS Integration] Sync summary restaurant=%s sync_id=%s status=%s fetched=%s ingested=%s failed=%s duplicates=%s",
            self.restaurant_id,
            summary.sync_id,
            summary.status,
            summary.total_orders_fetched,
            summary.total_orders_ingested,
            summary.total_orders_failed,
            summary.duplicate_orders,
        )

        return summary

    async def _should_use_real_time_deduction(self) -> bool:
        if not is_full_service_tier(self.subscription_tier):
            return False
        return await self.inventory_helper.is_real_time_enabled()
    
    async def _ingest_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingest a single order into PrepIQ database.

        Creates both Order record and Sales records for analytics.
        Uses menu matcher to map external item IDs to internal menu items.
        """
        # Get provider from order metadata
        pos_provider = order_data.get("metadata", {}).get("provider", "square")
        external_id = order_data.get("external_id")

        if not external_id:
            return {
                "status": "failed",
                "external_id": None,
                "reason": "missing_external_id",
                "items_synced": 0,
                "unmapped_items": [],
                "deduction_state": None,
            }

        existing_order = await self.orders_repo.get_by_external_id(external_id)
        if existing_order:
            logger.info(
                "[POS Integration] Duplicate order ignored external_id=%s restaurant=%s",
                external_id,
                self.restaurant_id,
            )
            return {
                "status": "duplicate",
                "external_id": external_id,
                "reason": "already_processed",
                "order_id": existing_order.order_id,
                "items_synced": 0,
                "unmapped_items": [],
                "deduction_state": getattr(existing_order, "inventory_deduction_state", None),
            }

        items = []
        unmapped_items = []
        for item in order_data.get("items", []):
            external_item_id = item.get("external_item_id")
            external_item_name = item.get("name")

            # Use menu matcher to get or create mapping
            menu_item_id = await self.menu_matcher.get_or_match_menu_item_id(
                external_item_id=external_item_id,
                external_item_name=external_item_name,
                pos_provider=pos_provider
            )

            # Skip items that couldn't be mapped
            if not menu_item_id:
                item_label = external_item_name or external_item_id or "Unknown item"
                if external_item_id and external_item_name:
                    item_label = f"{external_item_name} ({external_item_id})"
                unmapped_items.append(item_label)
                logger.warning(
                    f"Skipping unmapped item: {external_item_name} "
                    f"(external_id: {external_item_id}, provider: {pos_provider})"
                )
                continue

            items.append(OrderItemCreate(
                menu_item_id=menu_item_id,
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                instructions=item.get("instructions"),
                modifiers=item.get("modifiers", [])
            ))
        
        if not items:
            logger.warning(f"[POS Integration] Skipping order {external_id} - no mappable items")
            return {
                "status": "failed",
                "external_id": external_id,
                "reason": "no_mappable_items",
                "items_synced": 0,
                "unmapped_items": unmapped_items,
                "deduction_state": None,
            }
        
        # Create order via OrderService
        order_create = OrderCreate(
            external_id=external_id,
            sales_channel=order_data.get("sales_channel", "in-house"),
            items=items,
            subtotal=order_data["subtotal"],
            tax=order_data["tax"],
            discount=order_data["discount"],
            total=order_data["total"],
        )
        
        created_order = await self.order_service.create_order(order_create)
        order_id = created_order.get("order_id") if isinstance(created_order, dict) else None
        deduction_state = None
        
        # Also create sales records for each item (for analytics/forecasting)
        order_timestamp = order_data.get("order_timestamp")
        if order_timestamp:
            if isinstance(order_timestamp, str):
                order_timestamp = datetime.fromisoformat(order_timestamp.replace("Z", "+00:00"))
        else:
            order_timestamp = datetime.utcnow()
        
        for item in items:
            await self.sales_repo.create({
                "restaurant_id": self.restaurant_id,
                "menu_item_id": item.menu_item_id,
                "quantity_sold": item.quantity,
                "sale_timestamp": order_timestamp,
                "sales_channel": order_data.get("sales_channel", "in-house"),
            })

        if order_id:
            if await self._should_use_real_time_deduction():
                menu_items_payload = [
                    {"menu_item_id": item.menu_item_id, "quantity": float(item.quantity)}
                    for item in items
                ]
                helper_result: Optional[Dict[str, Any]] = None
                try:
                    helper_result = await self.inventory_helper.deduct_for_menu_items(
                        menu_items=menu_items_payload,
                        reference_id=order_id,
                        reference_type="sale",
                    )
                except Exception as exc:  # pragma: no cover - defensive logging
                    logger.error(
                        "[POS Integration] Real-time deduction failed order=%s error=%s",
                        order_id,
                        exc,
                        exc_info=True,
                    )
                    helper_result = {"failures": [{"error": str(exc)}]}
                deduction_state = await self.order_service.record_inventory_deduction_state(
                    order_id,
                    helper_result,
                    fallback_state="failed",
                )
            else:
                deduction_state = await self.order_service.record_inventory_deduction_state(
                    order_id,
                    None,
                    fallback_state="pending",
                )

        return {
            "status": "ingested",
            "external_id": external_id,
            "order_id": order_id,
            "items_synced": len(items),
            "unmapped_items": unmapped_items,
            "deduction_state": deduction_state,
        }
    
    @log_method("POS Integration: Handle Webhook")
    async def handle_webhook_event(
        self,
        provider: str,
        payload: Dict[str, Any],
        signature: str,
        raw_body: bytes
    ) -> Dict[str, Any]:
        """
        Process incoming webhook event from POS provider.
        
        Args:
            provider: Provider name
            payload: Parsed JSON payload
            signature: Webhook signature header
            raw_body: Raw request body for signature verification
            
        Returns:
            Processing result
        """
        restaurant = await self._get_restaurant()
        
        if restaurant.pos_provider != provider:
            raise ValueError(f"Webhook provider mismatch: expected {restaurant.pos_provider}, got {provider}")
        
        provider_instance = self._get_provider_instance(provider, restaurant)
        
        # Verify signature
        if not provider_instance.verify_webhook_signature(raw_body, signature):
            raise ValueError("Invalid webhook signature")
        
        # Parse event
        event = provider_instance.parse_webhook_event(payload)
        event_type = event.get("event_type", "")
        
        logger.info(f"[POS Integration] Processing webhook event: {event_type}")
        
        # Handle different event types
        if "order" in event_type.lower():
            # Order created/updated
            order_obj = event.get("object", {})
            if order_obj:
                order_data = provider_instance.transform_order(order_obj)
                ingest_result = await self._ingest_order(order_data)
                action = "order_ingested"
                if ingest_result.get("status") == "duplicate":
                    action = "duplicate_ignored"
                elif ingest_result.get("status") == "failed":
                    action = "order_skipped"
                return {
                    "status": "processed",
                    "event_type": event_type,
                    "action": action,
                    "ingest_result": ingest_result,
                }
        
        elif "payment" in event_type.lower():
            # Payment processed
            # Future: update payment records
            return {"status": "processed", "event_type": event_type, "action": "payment_logged"}
        
        return {"status": "ignored", "event_type": event_type}
    
    @log_method("POS Integration: Get Sync Status")
    async def get_sync_status(self) -> Dict[str, Any]:
        """Get current POS integration status and sync info."""
        restaurant = await self._get_restaurant()
        
        return {
            "connected": restaurant.pos_connected,
            "provider": restaurant.pos_provider,
            "location_id": restaurant.pos_location_id,
            "merchant_id": restaurant.pos_merchant_id,
            "last_sync": restaurant.pos_last_sync.isoformat() if restaurant.pos_last_sync else None,
            "sync_enabled": restaurant.pos_sync_enabled,
            "sync_orders": restaurant.pos_sync_orders,
            "sync_payments": restaurant.pos_sync_payments,
            "sync_menu": restaurant.pos_sync_menu,
        }
