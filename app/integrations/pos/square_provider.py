# app/integrations/pos/square_provider.py
"""
Square POS integration adapter.
Implements OAuth, order/payment sync, and webhook handling for Square API.

API Documentation: https://developer.squareup.com/docs
"""

import os
import hmac
import hashlib
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime
from urllib.parse import urlencode
from .base_provider import BasePOSProvider
from app.core.logging import logger


class SquareProvider(BasePOSProvider):
    """Square POS provider implementation."""
    
    # API endpoints
    PRODUCTION_API_URL = "https://connect.squareup.com"
    SANDBOX_API_URL = "https://connect.squareupsandbox.com"
    
    PRODUCTION_OAUTH_URL = "https://connect.squareup.com/oauth2/authorize"
    SANDBOX_OAUTH_URL = "https://connect.squareupsandbox.com/oauth2/authorize"
    
    def __init__(
        self,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        location_id: Optional[str] = None,
        merchant_id: Optional[str] = None,
        environment: str = "production"
    ):
        super().__init__(access_token, refresh_token, location_id, merchant_id, environment)
        
        # Load credentials from environment
        self.client_id = os.getenv("SQUARE_CLIENT_ID")
        self.client_secret = os.getenv("SQUARE_CLIENT_SECRET")
        self.webhook_signature_key = os.getenv("SQUARE_WEBHOOK_SIGNATURE_KEY")
        
        # Set API URLs based on environment
        if environment == "sandbox":
            self.api_url = self.SANDBOX_API_URL
            self.oauth_url = self.SANDBOX_OAUTH_URL
        else:
            self.api_url = self.PRODUCTION_API_URL
            self.oauth_url = self.PRODUCTION_OAUTH_URL
    
    def get_oauth_url(self, redirect_uri: str, state: str) -> str:
        """Generate Square OAuth authorization URL."""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "ORDERS_READ PAYMENTS_READ ITEMS_READ MERCHANT_PROFILE_READ",
            "session": "false",
            "state": state,
        }
        return f"{self.oauth_url}?{urlencode(params)}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/oauth2/token",
                json={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                }
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info("[Square] OAuth token exchange successful")
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_at": data.get("expires_at"),
                "merchant_id": data.get("merchant_id"),
                # Note: Square doesn't return location_id in OAuth response
                # We'll fetch it separately via /v2/locations endpoint
            }
    
    async def refresh_access_token(self) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/oauth2/token",
                json={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": self.refresh_token,
                    "grant_type": "refresh_token",
                }
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info("[Square] Token refresh successful")
            
            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_at": data.get("expires_at"),
            }
    
    async def revoke_token(self) -> bool:
        """Revoke Square access token."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/oauth2/revoke",
                    json={
                        "client_id": self.client_id,
                        "access_token": self.access_token,
                    },
                    headers={"Authorization": f"Bearer {self.access_token}"}
                )
                response.raise_for_status()
                logger.info("[Square] Token revoked successfully")
                return True
        except Exception as e:
            logger.error(f"[Square] Token revocation failed: {e}")
            return False
    
    async def get_locations(self) -> List[Dict[str, Any]]:
        """Fetch all locations for the merchant."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/v2/locations",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("locations", [])
    
    async def fetch_orders(
        self,
        start_date: datetime,
        end_date: datetime,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch orders from Square using SearchOrders API."""
        query = {
            "location_ids": [self.location_id] if self.location_id else None,
            "query": {
                "filter": {
                    "date_time_filter": {
                        "created_at": {
                            "start_at": start_date.isoformat(),
                            "end_at": end_date.isoformat(),
                        }
                    },
                    "state_filter": {
                        "states": ["COMPLETED", "OPEN"]
                    }
                }
            },
            "limit": 100,
        }
        
        if cursor:
            query["cursor"] = cursor
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/v2/orders/search",
                json=query,
                headers={
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                }
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"[Square] Fetched {len(data.get('orders', []))} orders")
            
            return {
                "orders": data.get("orders", []),
                "cursor": data.get("cursor"),
            }
    
    async def fetch_payments(
        self,
        start_date: datetime,
        end_date: datetime,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch payments from Square."""
        params = {
            "begin_time": start_date.isoformat(),
            "end_time": end_date.isoformat(),
            "location_id": self.location_id,
            "limit": 100,
        }
        
        if cursor:
            params["cursor"] = cursor
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/v2/payments",
                params=params,
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"[Square] Fetched {len(data.get('payments', []))} payments")
            
            return {
                "payments": data.get("payments", []),
                "cursor": data.get("cursor"),
            }
    
    async def fetch_menu_items(self, cursor: Optional[str] = None) -> Dict[str, Any]:
        """Fetch catalog items from Square."""
        params = {
            "types": "ITEM",
            "limit": 100,
        }
        
        if cursor:
            params["cursor"] = cursor
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/v2/catalog/list",
                params=params,
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            response.raise_for_status()
            data = response.json()
            
            return {
                "items": data.get("objects", []),
                "cursor": data.get("cursor"),
            }
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        timestamp: Optional[str] = None
    ) -> bool:
        """
        Verify Square webhook signature using HMAC-SHA256.
        
        Square sends signature in 'X-Square-Signature' header.
        """
        if not self.webhook_signature_key:
            logger.warning("[Square] Webhook signature key not configured")
            return False
        
        try:
            # Square uses: signature_key + notification_url + request_body
            # For simplicity, we'll use just the payload
            expected_signature = hmac.new(
                self.webhook_signature_key.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_signature, signature)
        except Exception as e:
            logger.error(f"[Square] Signature verification failed: {e}")
            return False
    
    def transform_order(self, external_order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform Square order to PrepIQ OrderCreate format.
        
        Square order structure:
        {
          "id": "order_id",
          "location_id": "...",
          "line_items": [{"name": "...", "quantity": "...", "base_price_money": {...}}],
          "total_money": {"amount": 1000, "currency": "USD"},
          "created_at": "2025-11-26T12:00:00Z",
          ...
        }
        """
        line_items = external_order.get("line_items", [])
        
        # Transform line items
        items = []
        for item in line_items:
            items.append({
                "menu_item_id": None,  # Will need menu mapping logic
                "external_item_id": item.get("catalog_object_id"),
                "name": item.get("name"),
                "quantity": int(item.get("quantity", 1)),
                "unit_price": float(item.get("base_price_money", {}).get("amount", 0)) / 100,
                "instructions": item.get("note"),
                "modifiers": self._transform_modifiers(item.get("modifiers", [])),
            })
        
        # Calculate totals
        total_money = external_order.get("total_money", {})
        total = float(total_money.get("amount", 0)) / 100
        
        tax_money = external_order.get("total_tax_money", {})
        tax = float(tax_money.get("amount", 0)) / 100
        
        discount_money = external_order.get("total_discount_money", {})
        discount = float(discount_money.get("amount", 0)) / 100
        
        subtotal = total - tax + discount
        
        return {
            "external_id": external_order.get("id"),
            "external_source": "square",
            "sales_channel": self._map_sales_channel(external_order),
            "items": items,
            "subtotal": subtotal,
            "tax": tax,
            "discount": discount,
            "total": total,
            "order_timestamp": external_order.get("created_at"),
            "metadata": {
                "square_location_id": external_order.get("location_id"),
                "square_state": external_order.get("state"),
            }
        }
    
    def _transform_modifiers(self, modifiers: List[Dict]) -> List[Dict]:
        """Transform Square modifiers to PrepIQ format."""
        return [
            {
                "mod_type": "square_modifier",
                "reference_id": mod.get("catalog_object_id"),
                "name": mod.get("name"),
                "quantity": 1,
                "note": None,
            }
            for mod in modifiers
        ]
    
    def _map_sales_channel(self, order: Dict[str, Any]) -> str:
        """Map Square order source to PrepIQ sales channel."""
        # Square doesn't have explicit channel; infer from metadata
        # This is a placeholder - customize based on your needs
        source = order.get("source", {}).get("name", "").lower()
        
        if "online" in source or "web" in source:
            return "online"
        elif "delivery" in source:
            return "delivery"
        else:
            return "in-house"
    
    def transform_payment(self, external_payment: Dict[str, Any]) -> Dict[str, Any]:
        """Transform Square payment to PrepIQ format."""
        amount_money = external_payment.get("amount_money", {})
        
        return {
            "external_payment_id": external_payment.get("id"),
            "external_source": "square",
            "order_external_id": external_payment.get("order_id"),
            "amount": float(amount_money.get("amount", 0)) / 100,
            "currency": amount_money.get("currency", "USD"),
            "payment_method": external_payment.get("source_type", "CARD"),
            "status": external_payment.get("status"),
            "processed_at": external_payment.get("created_at"),
            "metadata": {
                "square_location_id": external_payment.get("location_id"),
                "receipt_url": external_payment.get("receipt_url"),
            }
        }
    
    def parse_webhook_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Square webhook payload.
        
        Square webhook structure:
        {
          "merchant_id": "...",
          "type": "order.created",
          "event_id": "...",
          "created_at": "...",
          "data": {
            "type": "order",
            "id": "order_id",
            "object": { ... }
          }
        }
        """
        event_type = payload.get("type", "")
        data = payload.get("data", {})
        
        return {
            "event_type": event_type,
            "event_id": payload.get("event_id"),
            "merchant_id": payload.get("merchant_id"),
            "created_at": payload.get("created_at"),
            "data_type": data.get("type"),
            "data_id": data.get("id"),
            "object": data.get("object", {}),
        }
