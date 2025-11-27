# app/integrations/pos/base_provider.py
"""
Abstract base class for POS provider integrations.
All provider adapters (Square, Toast, Clover) must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, date


class BasePOSProvider(ABC):
    """
    Abstract base class defining the interface for POS provider integrations.
    
    All methods must be implemented by concrete provider classes.
    """
    
    def __init__(
        self,
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        location_id: Optional[str] = None,
        merchant_id: Optional[str] = None,
        environment: str = "production"
    ):
        """
        Initialize provider with credentials.
        
        Args:
            access_token: OAuth access token (decrypted)
            refresh_token: OAuth refresh token (decrypted)
            location_id: Provider's location identifier
            merchant_id: Provider's merchant/account ID
            environment: 'production' or 'sandbox'
        """
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.location_id = location_id
        self.merchant_id = merchant_id
        self.environment = environment
    
    @abstractmethod
    def get_oauth_url(self, redirect_uri: str, state: str) -> str:
        """
        Generate OAuth authorization URL for user consent.
        
        Args:
            redirect_uri: Callback URL for OAuth response
            state: CSRF protection state parameter
            
        Returns:
            Full OAuth authorization URL
        """
        pass
    
    @abstractmethod
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access/refresh tokens.
        
        Args:
            code: Authorization code from OAuth callback
            redirect_uri: Same redirect URI used in authorization request
            
        Returns:
            Dict containing access_token, refresh_token, expires_in, location_id, merchant_id
        """
        pass
    
    @abstractmethod
    async def refresh_access_token(self) -> Dict[str, Any]:
        """
        Refresh the access token using the refresh token.
        
        Returns:
            Dict containing new access_token, refresh_token, expires_in
        """
        pass
    
    @abstractmethod
    async def revoke_token(self) -> bool:
        """
        Revoke access token (disconnect/logout).
        
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def fetch_orders(
        self,
        start_date: datetime,
        end_date: datetime,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch orders from the provider within a date range.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            cursor: Pagination cursor (provider-specific)
            
        Returns:
            Dict with 'orders' list and optional 'cursor' for pagination
        """
        pass
    
    @abstractmethod
    async def fetch_payments(
        self,
        start_date: datetime,
        end_date: datetime,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch payments/transactions from the provider.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            cursor: Pagination cursor
            
        Returns:
            Dict with 'payments' list and optional 'cursor'
        """
        pass
    
    @abstractmethod
    async def fetch_menu_items(self, cursor: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch menu items/catalog from the provider (optional feature).
        
        Args:
            cursor: Pagination cursor
            
        Returns:
            Dict with 'items' list and optional 'cursor'
        """
        pass
    
    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str, timestamp: Optional[str] = None) -> bool:
        """
        Verify webhook signature to ensure request authenticity.
        
        Args:
            payload: Raw request body bytes
            signature: Signature header from webhook request
            timestamp: Optional timestamp header
            
        Returns:
            True if signature is valid, False otherwise
        """
        pass
    
    @abstractmethod
    def transform_order(self, external_order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform provider-specific order format to PrepIQ OrderCreate schema.
        
        Args:
            external_order: Raw order data from provider
            
        Returns:
            Dict matching PrepIQ OrderCreate schema
        """
        pass
    
    @abstractmethod
    def transform_payment(self, external_payment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Transform provider-specific payment format to PrepIQ payment schema.
        
        Args:
            external_payment: Raw payment data from provider
            
        Returns:
            Dict matching PrepIQ payment schema
        """
        pass
    
    @abstractmethod
    def parse_webhook_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse webhook payload and extract event type and relevant data.
        
        Args:
            payload: Webhook JSON payload
            
        Returns:
            Dict with 'event_type' and 'data' keys
        """
        pass
