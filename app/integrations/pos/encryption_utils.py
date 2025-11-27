# app/integrations/pos/encryption_utils.py
"""
Token encryption utilities using Fernet symmetric encryption.
Tokens are encrypted before storage and decrypted on retrieval.
"""

import os
from cryptography.fernet import Fernet
from typing import Optional

# Load encryption key from environment variable
# In production, this should be stored securely (AWS Secrets Manager, etc.)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Generate a key for development if not set (WARNING: not for production)
    # In production, require this to be set
    import warnings
    warnings.warn(
        "ENCRYPTION_KEY not set in environment. Using auto-generated key. "
        "This is NOT suitable for production use.",
        UserWarning
    )
    ENCRYPTION_KEY = Fernet.generate_key().decode()

# Initialize Fernet cipher
cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


def encrypt_token(token: str) -> str:
    """
    Encrypt a token string.
    
    Args:
        token: Plain text token to encrypt
        
    Returns:
        Encrypted token as base64 string
    """
    if not token:
        return None
    
    encrypted = cipher.encrypt(token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: Optional[str]) -> Optional[str]:
    """
    Decrypt an encrypted token string.
    
    Args:
        encrypted_token: Encrypted token (base64 string)
        
    Returns:
        Decrypted plain text token, or None if input was None
    """
    if not encrypted_token:
        return None
    
    try:
        decrypted = cipher.decrypt(encrypted_token.encode())
        return decrypted.decode()
    except Exception as e:
        # Log decryption failure
        import logging
        logging.error(f"Failed to decrypt token: {e}")
        return None
