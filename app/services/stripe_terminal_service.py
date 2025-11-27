# app/services/stripe_terminal_service.py
"""
Stripe Terminal Service - for physical card reader integration.

Supports Stripe Terminal readers (BBPOS WisePOS E, Stripe Reader S700, etc.)
for in-person card payments.
"""

import os
import stripe
import asyncio
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.logging import logger
from app.utils.logger_helpers import log_method
from app.repositories.stripe_terminal_readers_repo import StripeTerminalReaderRepository
from app.repositories.restaurants_repo import RestaurantRepository
from app.db.models.stripe_terminal_readers_orm import StripeTerminalReader


# Configure Stripe API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class StripeTerminalService:
    """
    Service for managing Stripe Terminal card readers and processing
    card-present payments.
    
    Workflow:
    1. Register reader with Stripe (create_reader)
    2. Create a PaymentIntent with payment_method_types=['card_present']
    3. Process payment on reader (process_payment_on_reader)
    4. Reader collects card details and completes payment
    """

    def __init__(
        self,
        db: AsyncSession,
        restaurant_id: int,
        subscription_tier: str,
        employee_id: Optional[int] = None
    ):
        self.db = db
        self.restaurant_id = restaurant_id
        self.subscription_tier = subscription_tier
        self.employee_id = employee_id
        self.reader_repo = StripeTerminalReaderRepository(db, restaurant_id)
        self.restaurant_repo = RestaurantRepository(db, restaurant_id)
        self._mock_mode = not stripe.api_key

    def _use_mock(self) -> bool:
        """Check if we should use mock mode (no Stripe key)."""
        return self._mock_mode

    @log_method()
    async def create_location(self, display_name: str, address: dict) -> dict:
        """
        Create a Stripe Terminal Location for this restaurant.
        
        A location groups readers and is required for reader registration.
        The location_id should be stored on the restaurant record.
        
        Args:
            display_name: Human-readable location name
            address: Dict with line1, city, state, postal_code, country
        """
        if self._use_mock():
            mock_location = f"tml_mock_{self.restaurant_id}"
            logger.info(f"[Terminal] MOCK created location: {mock_location}")
            return {"location_id": mock_location, "display_name": display_name}

        try:
            loop = asyncio.get_running_loop()
            
            def _create():
                return stripe.terminal.Location.create(
                    display_name=display_name,
                    address=address,
                    metadata={"restaurant_id": str(self.restaurant_id)}
                )
            
            location = await loop.run_in_executor(None, _create)
            
            # Store location ID on restaurant
            await self.restaurant_repo.update(
                self.restaurant_id, 
                {"stripe_terminal_location_id": location.id}
            )
            
            logger.info(f"[Terminal] Created Stripe location: {location.id}")
            return {
                "location_id": location.id,
                "display_name": location.display_name,
                "address": dict(location.address)
            }
        except Exception as e:
            logger.error(f"[Terminal] Failed to create location: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Terminal location: {str(e)}"
            )

    @log_method()
    async def get_location(self) -> Optional[dict]:
        """Get the Stripe Terminal location for this restaurant."""
        restaurant = await self.restaurant_repo.get(self.restaurant_id)
        if not restaurant or not restaurant.stripe_terminal_location_id:
            return None
        
        if self._use_mock():
            return {
                "location_id": restaurant.stripe_terminal_location_id,
                "display_name": "Mock Location"
            }
        
        try:
            loop = asyncio.get_running_loop()
            location = await loop.run_in_executor(
                None,
                lambda: stripe.terminal.Location.retrieve(restaurant.stripe_terminal_location_id)
            )
            return {
                "location_id": location.id,
                "display_name": location.display_name,
                "address": dict(location.address) if location.address else None
            }
        except Exception as e:
            logger.warning(f"[Terminal] Could not retrieve location: {e}")
            return None

    @log_method()
    async def register_reader(
        self,
        registration_code: str,
        label: str,
        device_type: str = "stripe_s700"
    ) -> StripeTerminalReader:
        """
        Register a new Stripe Terminal reader.
        
        Args:
            registration_code: Code displayed on the reader during pairing
            label: Human-readable name (e.g., "Counter 1", "Bar Terminal")
            device_type: Reader model (stripe_s700, bbpos_wisepos_e, etc.)
            
        Returns:
            StripeTerminalReader ORM object
        """
        restaurant = await self.restaurant_repo.get(self.restaurant_id)
        location_id = restaurant.stripe_terminal_location_id if restaurant else None
        
        if not location_id and not self._use_mock():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Terminal location configured. Create a location first."
            )
        
        if self._use_mock():
            mock_reader_id = f"tmr_mock_{self.restaurant_id}_{label.replace(' ', '_')}"
            reader = StripeTerminalReader(
                restaurant_id=self.restaurant_id,
                stripe_reader_id=mock_reader_id,
                label=label,
                device_type=device_type,
                status="online",
                serial_number=f"MOCK-{registration_code}"
            )
            created = await self.reader_repo.create(reader)
            logger.info(f"[Terminal] MOCK registered reader: {mock_reader_id}")
            return created

        try:
            loop = asyncio.get_running_loop()
            
            def _create_reader():
                return stripe.terminal.Reader.create(
                    registration_code=registration_code,
                    label=label,
                    location=location_id,
                    metadata={"restaurant_id": str(self.restaurant_id)}
                )
            
            stripe_reader = await loop.run_in_executor(None, _create_reader)
            
            reader = StripeTerminalReader(
                restaurant_id=self.restaurant_id,
                stripe_reader_id=stripe_reader.id,
                label=label,
                device_type=stripe_reader.device_type,
                status=stripe_reader.status or "offline",
                serial_number=stripe_reader.serial_number,
                ip_address=stripe_reader.ip_address
            )
            created = await self.reader_repo.create(reader)
            
            logger.info(f"[Terminal] Registered reader: {stripe_reader.id} ({label})")
            return created
            
        except stripe.error.StripeError as e:
            logger.error(f"[Terminal] Failed to register reader: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to register reader: {str(e)}"
            )

    @log_method()
    async def list_readers(self, status_filter: Optional[str] = None) -> List[StripeTerminalReader]:
        """List all registered readers for this restaurant."""
        return await self.reader_repo.list_readers(status=status_filter)

    @log_method()
    async def get_reader(self, reader_id: int) -> Optional[StripeTerminalReader]:
        """Get a specific reader by ID."""
        return await self.reader_repo.get(reader_id)

    @log_method()
    async def sync_reader_status(self, reader_id: int) -> StripeTerminalReader:
        """Sync reader status from Stripe API."""
        reader = await self.reader_repo.get(reader_id)
        if not reader:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reader not found"
            )
        
        if self._use_mock():
            return reader
        
        try:
            loop = asyncio.get_running_loop()
            stripe_reader = await loop.run_in_executor(
                None,
                lambda: stripe.terminal.Reader.retrieve(reader.stripe_reader_id)
            )
            
            await self.reader_repo.update_status(
                reader_id=reader_id,
                status=stripe_reader.status or "offline",
                ip_address=stripe_reader.ip_address
            )
            
            return await self.reader_repo.get(reader_id)
        except Exception as e:
            logger.warning(f"[Terminal] Could not sync reader status: {e}")
            return reader

    @log_method()
    async def delete_reader(self, reader_id: int) -> bool:
        """Remove a reader from both Stripe and local database."""
        reader = await self.reader_repo.get(reader_id)
        if not reader:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reader not found"
            )
        
        if not self._use_mock():
            try:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(
                    None,
                    lambda: stripe.terminal.Reader.delete(reader.stripe_reader_id)
                )
            except stripe.error.StripeError as e:
                logger.warning(f"[Terminal] Could not delete reader from Stripe: {e}")
        
        await self.reader_repo.delete(reader_id)
        logger.info(f"[Terminal] Deleted reader: {reader_id}")
        return True

    @log_method()
    async def create_terminal_payment_intent(
        self,
        amount: int,
        order_id: int,
        currency: str = "usd",
        tip_eligible: bool = True,
        capture_method: str = "automatic"
    ) -> dict:
        """
        Create a PaymentIntent for card-present terminal payment.
        
        Args:
            amount: Amount in cents
            order_id: Associated order ID
            currency: Currency code (default: usd)
            tip_eligible: Whether to enable on-reader tipping
            capture_method: 'automatic' or 'manual' for auth-only
            
        Returns:
            Dict with payment_intent_id, client_secret, status
        """
        if self._use_mock():
            mock_pi = f"pi_terminal_mock_{order_id}"
            logger.info(f"[Terminal] MOCK created terminal PI: {mock_pi}")
            return {
                "payment_intent_id": mock_pi,
                "client_secret": f"secret_{mock_pi}",
                "status": "requires_payment_method"
            }
        
        try:
            loop = asyncio.get_running_loop()
            
            def _create():
                params = {
                    "amount": amount,
                    "currency": currency.lower(),
                    "payment_method_types": ["card_present"],
                    "capture_method": capture_method,
                    "metadata": {
                        "order_id": str(order_id),
                        "restaurant_id": str(self.restaurant_id)
                    }
                }
                
                # Enable on-reader tipping if supported
                if tip_eligible:
                    params["payment_method_options"] = {
                        "card_present": {
                            "request_extended_authorization": False
                        }
                    }
                
                return stripe.PaymentIntent.create(**params)
            
            intent = await loop.run_in_executor(None, _create)
            
            logger.info(f"[Terminal] Created terminal PI: {intent.id}")
            return {
                "payment_intent_id": intent.id,
                "client_secret": intent.client_secret,
                "status": intent.status
            }
        except Exception as e:
            logger.error(f"[Terminal] Failed to create PI: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create payment: {str(e)}"
            )

    @log_method()
    async def process_payment_on_reader(
        self,
        reader_id: int,
        payment_intent_id: str
    ) -> dict:
        """
        Send a PaymentIntent to a reader for processing.
        
        The reader will display the payment screen and handle card tap/insert.
        
        Args:
            reader_id: Local reader ID
            payment_intent_id: Stripe PaymentIntent ID
            
        Returns:
            Dict with reader status and action
        """
        reader = await self.reader_repo.get(reader_id)
        if not reader:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reader not found"
            )
        
        if self._use_mock():
            logger.info(f"[Terminal] MOCK processing payment on reader {reader_id}")
            return {
                "reader_id": reader_id,
                "stripe_reader_id": reader.stripe_reader_id,
                "status": "processing",
                "action": "process_payment_intent"
            }
        
        try:
            loop = asyncio.get_running_loop()
            
            def _process():
                return stripe.terminal.Reader.process_payment_intent(
                    reader.stripe_reader_id,
                    payment_intent=payment_intent_id
                )
            
            result = await loop.run_in_executor(None, _process)
            
            logger.info(f"[Terminal] Payment sent to reader {reader.stripe_reader_id}")
            return {
                "reader_id": reader_id,
                "stripe_reader_id": reader.stripe_reader_id,
                "status": result.status,
                "action": result.action.type if result.action else None
            }
        except stripe.error.StripeError as e:
            logger.error(f"[Terminal] Failed to process on reader: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process payment on reader: {str(e)}"
            )

    @log_method()
    async def cancel_reader_action(self, reader_id: int) -> dict:
        """Cancel any pending action on a reader (e.g., cancel payment collection)."""
        reader = await self.reader_repo.get(reader_id)
        if not reader:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reader not found"
            )
        
        if self._use_mock():
            return {"reader_id": reader_id, "status": "cancelled"}
        
        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: stripe.terminal.Reader.cancel_action(reader.stripe_reader_id)
            )
            return {"reader_id": reader_id, "status": result.status}
        except stripe.error.StripeError as e:
            logger.warning(f"[Terminal] Could not cancel action: {e}")
            return {"reader_id": reader_id, "status": "error", "error": str(e)}

    @log_method()
    async def simulate_reader_payment(
        self,
        reader_id: int,
        card_number: str = "4242424242424242"
    ) -> dict:
        """
        Simulate a card payment on a reader (test mode only).
        
        Useful for testing without physical cards.
        
        Args:
            reader_id: Local reader ID
            card_number: Test card number (4242... for success, others for decline)
        """
        reader = await self.reader_repo.get(reader_id)
        if not reader:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reader not found"
            )
        
        if self._use_mock():
            return {"reader_id": reader_id, "simulated": True, "card": card_number}
        
        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: stripe.terminal.Reader.TestHelpers.present_payment_method(
                    reader.stripe_reader_id,
                    card_present={"number": card_number}
                )
            )
            return {
                "reader_id": reader_id,
                "simulated": True,
                "status": result.status
            }
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Simulation failed: {str(e)}"
            )

    @log_method()
    async def capture_payment(self, payment_intent_id: str) -> dict:
        """
        Capture a payment that was authorized with capture_method='manual'.
        
        Used for tab-style payments where auth happens first.
        """
        if self._use_mock():
            return {"payment_intent_id": payment_intent_id, "status": "succeeded"}
        
        try:
            loop = asyncio.get_running_loop()
            intent = await loop.run_in_executor(
                None,
                lambda: stripe.PaymentIntent.capture(payment_intent_id)
            )
            return {
                "payment_intent_id": intent.id,
                "status": intent.status,
                "amount_captured": intent.amount_received
            }
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Capture failed: {str(e)}"
            )

    @log_method()
    async def refund_payment(
        self,
        payment_intent_id: str,
        amount: Optional[int] = None,
        reason: Optional[str] = None
    ) -> dict:
        """
        Refund a terminal payment (full or partial).
        
        Args:
            payment_intent_id: The PaymentIntent to refund
            amount: Amount in cents (None for full refund)
            reason: Refund reason (duplicate, fraudulent, requested_by_customer)
        """
        if self._use_mock():
            return {
                "refund_id": f"re_mock_{payment_intent_id}",
                "payment_intent_id": payment_intent_id,
                "status": "succeeded"
            }
        
        try:
            loop = asyncio.get_running_loop()
            
            def _refund():
                params = {"payment_intent": payment_intent_id}
                if amount:
                    params["amount"] = amount
                if reason:
                    params["reason"] = reason
                return stripe.Refund.create(**params)
            
            refund = await loop.run_in_executor(None, _refund)
            return {
                "refund_id": refund.id,
                "payment_intent_id": payment_intent_id,
                "amount": refund.amount,
                "status": refund.status
            }
        except stripe.error.StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Refund failed: {str(e)}"
            )
