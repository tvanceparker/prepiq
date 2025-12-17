# app/services/pos_service.py
"""
Internal POS Service - for restaurants using PrepIQ as their primary POS.
This is a fallback for restaurants without external POS systems (Square, Toast, etc.).
Most restaurants should use POSIntegrationService instead.
"""

from app.core.logging import logger
from app.utils.logger_helpers import log_method
import os
import stripe
import asyncio
import json
from copy import deepcopy
from typing import Any, Dict, Optional, List
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from app.sockets.connection_manager import manager
from app.schemas.pos_dto import (
    PaymentRequest,
    PaymentResponse,
    DeviceRegistrationRequest,
    DeviceTokenRequest,
    POSModeUpdateRequest,
)
from app.repositories.devices_repo import DevicesRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.stripe_terminal_readers_repo import StripeTerminalReaderRepository
from app.utils.security import create_device_token


# Configure Stripe API key (may be empty in mock mode)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class InternalPOSService:
    """
    Internal POS orchestration with optional Stripe or mock payments and kitchen dispatch.
    
    Use this service when pos_provider == 'none' (restaurant not using external POS).
    """

    def __init__(self, db, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.employee_id = employee_id
        self.subscription_tier = subscription_tier
        self.devices_repo = DevicesRepository(db, restaurant_id)
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self.reader_repo = StripeTerminalReaderRepository(db, restaurant_id)
        # payments mode: 'stripe' (default) or 'mock'
        self._payments_mode = (os.getenv("POS_PAYMENTS_MODE") or "stripe").lower()

    def _use_mock_payments(self) -> bool:
        return self._payments_mode != "stripe" or not stripe.api_key

    def merge_settings(self, restaurant_settings: dict, device_settings: dict) -> dict:
        """Merge restaurant defaults with device overrides (device wins)."""
        result = deepcopy(restaurant_settings or {})
        if device_settings:
            result.update(device_settings)
        return result

    def _normalize_fingerprint(self, fingerprint: Optional[Any]) -> Optional[str]:
        if not fingerprint:
            return None
        if isinstance(fingerprint, str):
            return fingerprint
        try:
            return json.dumps(fingerprint, sort_keys=True)
        except Exception:
            return str(fingerprint)

    async def _fetch_restaurant_settings(self) -> Dict[str, Any]:
        settings = await self.restaurant_repo.get_settings()
        settings_dict = dict(settings or {})
        self._cached_restaurant_settings = settings_dict
        return settings_dict

    def _get_capabilities(self, restaurant_settings: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "has_pos_display": restaurant_settings.get("has_pos_display", False),
            "has_kitchen_display": restaurant_settings.get("has_kitchen_display", False),
            "default_ui_layout": restaurant_settings.get("default_ui_layout", "auto"),
        }

    def _device_token_response(self, device_id: int, device_type: str, expires_at: datetime) -> Dict[str, Any]:
        token = create_device_token(
            {
                "sub": f"device_{device_id}",
                "device_id": device_id,
                "device_type": device_type,
                "restaurant_id": self.restaurant_id,
            },
            expires_delta=timedelta(days=90),
        )
        return {
            "device_token": token,
            "expires_at": expires_at,
            "restaurant_id": self.restaurant_id,
        }

    @log_method("POS: Send Order To Kitchen")
    async def send_order_to_kitchen(self, order_data: dict) -> Dict[str, Any]:
        """Broadcast a new order to the kitchen room for this restaurant."""
        kitchen_room = f"kitchen_{self.restaurant_id}"
        payload = {"type": "new_order", "data": order_data, "restaurant_id": self.restaurant_id}
        await manager.send_message(kitchen_room, payload)
        logger.info("[POS] Sent order to kitchen room=%s", kitchen_room)
        return {"status": "sent_to_kitchen"}

    @log_method("POS: Create Payment Intent")
    async def create_payment_intent(self, payment_req: PaymentRequest) -> PaymentResponse:
        """Create a payment intent using Stripe or a mock provider.

        - Stripe: creates PaymentIntent asynchronously via thread executor.
        - Mock: returns a synthetic succeeded intent for simulations.
        """
        if self._use_mock_payments():
            client_secret = f"mock_secret_{payment_req.order_id}"
            pid = f"pi_mock_{payment_req.order_id}"
            logger.info("[POS] MOCK create_payment_intent amount=%s currency=%s order=%s",
                        payment_req.amount, payment_req.currency, payment_req.order_id)
            return PaymentResponse(client_secret=client_secret, payment_intent_id=pid, status="succeeded")

        try:
            loop = asyncio.get_running_loop()

            def _create() -> Any:
                return stripe.PaymentIntent.create(
                    amount=int(payment_req.amount),
                    currency=(payment_req.currency or "usd").lower(),
                    payment_method_types=payment_req.payment_method_types or ["card"],
                    metadata={
                        "order_id": str(payment_req.order_id),
                        "restaurant_id": str(self.restaurant_id),
                    },
                )

            intent = await loop.run_in_executor(None, _create)
            logger.info("[POS] Stripe PI created id=%s status=%s", intent.id, intent.status)
            return PaymentResponse(
                client_secret=intent.client_secret,
                payment_intent_id=intent.id,
                status=intent.status,
            )
        except Exception as e:
            logger.error("[POS] Failed to create payment intent error=%s", e, exc_info=True)
            raise ValueError(f"Failed to create payment intent: {str(e)}")

    @log_method("POS: Confirm Payment")
    async def confirm_payment(self, payment_intent_id: str) -> Dict[str, Any]:
        """Confirm the payment intent (Stripe) or succeed immediately (mock)."""
        if self._use_mock_payments():
            logger.info("[POS] MOCK confirm_payment payment_intent_id=%s", payment_intent_id)
            return {"status": "succeeded", "payment_intent_id": payment_intent_id}

        try:
            loop = asyncio.get_running_loop()

            def _retrieve_and_confirm():
                intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                if intent.status == "requires_confirmation":
                    intent.confirm()
                return intent

            intent = await loop.run_in_executor(None, _retrieve_and_confirm)
            logger.info("[POS] Stripe PI confirm id=%s status=%s", intent.id, intent.status)
            return {"status": intent.status, "payment_intent_id": intent.id}
        except Exception as e:
            logger.error("[POS] Failed to confirm payment error=%s", e, exc_info=True)
            raise ValueError(f"Failed to confirm payment: {str(e)}")

    @log_method("POS: Register Device")
    async def register_device(self, registration: DeviceRegistrationRequest) -> Dict[str, Any]:
        """Register a new device and return merged settings and capabilities."""
        fingerprint_value = self._normalize_fingerprint(
            getattr(registration, "fingerprint", None) or getattr(registration, "device_fingerprint", None)
        )
        device_data = {
            "restaurant_id": self.restaurant_id,
            "name": getattr(registration, "device_name", None),
            "device_type": getattr(registration, "device_type", None),
            "device_metadata": {"fingerprint": fingerprint_value} if fingerprint_value else None,
            "device_fingerprint": fingerprint_value,
        }

        device = await self.devices_repo.create(device_data)

        restaurant_settings = await self._fetch_restaurant_settings()
        device_settings = device.device_settings or {}
        merged_settings = self.merge_settings(restaurant_settings.get("settings") or {}, device_settings)
        capabilities = self._get_capabilities(restaurant_settings)

        expires_at = datetime.utcnow() + timedelta(days=90)
        token_payload = self._device_token_response(device.device_id, device.device_type, expires_at)

        return {
            "device_id": device.device_id,
            "restaurant_id": self.restaurant_id,
            "device_name": device.name,
            "device_type": device.device_type,
            "device_token": token_payload["device_token"],
            "expires_at": token_payload["expires_at"],
            "merged_settings": merged_settings,
            "restaurant_capabilities": capabilities,
        }

    @log_method("POS: Get Device Settings")
    async def get_device_settings(self, device_id: int) -> Dict[str, Any]:
        """Get merged settings for a device."""
        device = await self.devices_repo.get_by_id(device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")

        restaurant_settings = await self._fetch_restaurant_settings()
        device_settings = device.device_settings or {}

        return {
            "device_id": device.device_id,
            "restaurant_id": self.restaurant_id,
            "device_type": device.device_type,
            "device_name": device.name,
            "merged_settings": self.merge_settings(restaurant_settings.get("settings") or {}, device_settings),
            "restaurant_capabilities": self._get_capabilities(restaurant_settings),
        }

    @log_method("POS: Update Device Settings")
    async def update_device_settings(self, device_id: int, settings: dict) -> Dict[str, Any]:
        """Update device-specific settings and return the merged view."""
        device = await self.devices_repo.get_by_id(device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")

        current_settings = device.device_settings or {}
        current_settings.update(settings or {})
        await self.devices_repo.update(device_id, {"device_settings": current_settings})

        restaurant_settings = await self._fetch_restaurant_settings()
        return {
            "status": "updated",
            "device_settings": current_settings,
            "merged_settings": self.merge_settings(restaurant_settings.get("settings") or {}, current_settings),
        }

    @log_method("POS: List Devices")
    async def list_devices(self) -> List[Dict[str, Any]]:
        devices = await self.devices_repo.get_all()
        results = []
        for device in devices:
            results.append(
                {
                    "device_id": device.device_id,
                    "device_name": device.name,
                    "device_type": device.device_type,
                    "last_seen": device.updated_at,
                    "device_settings": device.device_settings or {},
                    "is_active": True,
                }
            )
        return results

    @log_method("POS: Refresh Device Token")
    async def refresh_device_token(self, request: DeviceTokenRequest) -> Dict[str, Any]:
        fingerprint_value = self._normalize_fingerprint(
            getattr(request, "fingerprint", None) or getattr(request, "device_fingerprint", None)
        )
        device = await self.devices_repo.get_by_id(request.device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        stored_fingerprint = device.device_fingerprint or (device.device_metadata or {}).get("fingerprint")
        if stored_fingerprint and fingerprint_value and stored_fingerprint != fingerprint_value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Device fingerprint mismatch",
            )

        expires_at = datetime.utcnow() + timedelta(days=90)
        token_payload = self._device_token_response(device.device_id, device.device_type, expires_at)

        if fingerprint_value and stored_fingerprint != fingerprint_value:
            await self.devices_repo.update(
                device.device_id,
                {"device_fingerprint": fingerprint_value, "device_metadata": {"fingerprint": fingerprint_value}},
            )

        return token_payload

    @log_method("POS: Get Mode Settings")
    async def get_pos_mode_settings(self) -> Dict[str, Any]:
        restaurant = await self.restaurant_repo.get_by_id(self.restaurant_id)
        if not restaurant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
        has_terminal_readers = bool(await self.reader_repo.get_all(limit=1))
        return {
            "pos_mode": restaurant.pos_mode,
            "pos_provider": restaurant.pos_provider,
            "cash_drawer_enabled": restaurant.cash_drawer_enabled,
            "stripe_terminal_location_id": restaurant.stripe_terminal_location_id,
            "has_terminal_readers": has_terminal_readers,
            "terminal_payments_enabled": bool(restaurant.stripe_terminal_location_id),
            "preferred_terminal_reader_id": None,
        }

    @log_method("POS: Update Mode Settings")
    async def update_pos_mode_settings(self, payload: POSModeUpdateRequest) -> Dict[str, Any]:
        update_data = {
            "pos_mode": payload.pos_mode.value if hasattr(payload.pos_mode, "value") else payload.pos_mode,
            "pos_provider": payload.pos_provider or "none",
            "cash_drawer_enabled": payload.cash_drawer_enabled if payload.cash_drawer_enabled is not None else True,
        }
        await self.restaurant_repo.update(self.restaurant_id, update_data)
        return await self.get_pos_mode_settings()
