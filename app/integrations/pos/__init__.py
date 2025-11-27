# app/integrations/pos/__init__.py
"""
External POS integration adapters for Square, Toast, Clover.
"""

from .base_provider import BasePOSProvider
from .square_provider import SquareProvider

__all__ = ["BasePOSProvider", "SquareProvider"]
