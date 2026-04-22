"""
Generic secret encryption utilities using Fernet symmetric encryption.

Secrets are encrypted before storage and decrypted on retrieval.
"""

import os
import warnings
from typing import Optional

from cryptography.fernet import Fernet


ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    warnings.warn(
        "ENCRYPTION_KEY not set in environment. Using auto-generated key. "
        "This is NOT suitable for production use.",
        UserWarning,
    )
    ENCRYPTION_KEY = Fernet.generate_key().decode()


cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


def encrypt_secret(secret: str) -> Optional[str]:
    """Encrypt a secret string for storage."""
    if not secret:
        return None

    encrypted = cipher.encrypt(secret.encode())
    return encrypted.decode()


def decrypt_secret(encrypted_secret: Optional[str]) -> Optional[str]:
    """Decrypt an encrypted secret string."""
    if not encrypted_secret:
        return None

    try:
        decrypted = cipher.decrypt(encrypted_secret.encode())
        return decrypted.decode()
    except Exception:
        return None