# app/services/pos_service.py
import os
import stripe
from app.sockets.connection_manager import manager
from app.schemas.pos_dto import PaymentRequest, PaymentResponse
from app.repositories.devices_repo import DevicesRepository
from app.repositories.restaurants_repo import RestaurantRepository
from copy import deepcopy

# Set Stripe API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class POSService:
    def __init__(self, db, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.employee_id = employee_id
        self.devices_repo = DevicesRepository(db, restaurant_id)
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)

    async def send_order_to_kitchen(self, order_data: dict):
        kitchen_room = f"kitchen_{self.restaurant_id}"
        await manager.send_message(kitchen_room, {
            "type": "new_order",
            "data": order_data
        })
        return {"status": "sent_to_kitchen"}

    async def create_payment_intent(self, payment_req: PaymentRequest) -> PaymentResponse:
        """
        Create a Stripe PaymentIntent for the order.
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=payment_req.amount,
                currency=payment_req.currency,
                payment_method_types=payment_req.payment_method_types,
                metadata={"order_id": str(payment_req.order_id), "restaurant_id": str(self.restaurant_id)},
            )
            return PaymentResponse(
                client_secret=intent.client_secret,
                payment_intent_id=intent.id,
                status=intent.status
            )
        except Exception as e:
            raise ValueError(f"Failed to create payment intent: {str(e)}")

    async def confirm_payment(self, payment_intent_id: str):
        """
        Confirm the payment intent.
        """
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            if intent.status == "requires_confirmation":
                intent.confirm()
            return {"status": intent.status, "payment_intent_id": intent.id}
        except Exception as e:
            raise ValueError(f"Failed to confirm payment: {str(e)}")

    def merge_settings(self, restaurant_settings: dict, device_settings: dict) -> dict:
        """Merge restaurant defaults with device overrides"""
        result = deepcopy(restaurant_settings or {})
        if device_settings:
            result.update(device_settings)
        return result

    async def register_device(self, registration):
        """Register a new device and return merged settings"""
        # Create device record
        device_data = {
            "restaurant_id": self.restaurant_id,
            "name": registration.device_name,
            "device_type": registration.device_type,
            "device_metadata": {"fingerprint": registration.device_fingerprint} if registration.device_fingerprint else None
        }
        
        device = await self.devices_repo.create(device_data)
        
        # Get restaurant settings
        restaurant_settings = await self.restaurant_repo.get_settings()
        
        # Get device settings (initially empty)
        device_settings = device.device_settings or {}
        
        # Merge settings
        merged_settings = self.merge_settings(restaurant_settings, device_settings)
        
        return {
            "device_id": device.device_id,
            "device_type": device.device_type,
            "merged_settings": merged_settings,
            "restaurant_capabilities": {
                "has_pos_display": restaurant_settings.get("has_pos_display", False),
                "has_kitchen_display": restaurant_settings.get("has_kitchen_display", False),
                "default_ui_layout": restaurant_settings.get("default_ui_layout", "auto")
            }
        }

    async def get_device_settings(self, device_id: int):
        """Get merged settings for a device"""
        device = await self.devices_repo.get_by_id(device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
            
        restaurant_settings = await self.restaurant_repo.get_settings()
        device_settings = device.device_settings or {}
        
        return {
            "device_id": device.device_id,
            "device_type": device.device_type,
            "merged_settings": self.merge_settings(restaurant_settings, device_settings),
            "restaurant_capabilities": {
                "has_pos_display": restaurant_settings.get("has_pos_display", False),
                "has_kitchen_display": restaurant_settings.get("has_kitchen_display", False),
                "default_ui_layout": restaurant_settings.get("default_ui_layout", "auto")
            }
        }

    async def update_device_settings(self, device_id: int, settings: dict):
        """Update device-specific settings"""
        device = await self.devices_repo.get_by_id(device_id)
        if not device:
            raise ValueError(f"Device {device_id} not found")
            
        # Merge with existing settings
        current_settings = device.device_settings or {}
        current_settings.update(settings)
        
        await self.devices_repo.update(device_id, {"device_settings": current_settings})
        
        return {"status": "updated", "device_settings": current_settings}
