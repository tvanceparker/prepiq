"""
Generic secret encryption utilities using Fernet symmetric encryption.

Secrets are encrypted before storage and decrypted on retrieval.
"""

import os
import warnings
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet


def _load_encryption_key() -> str:
    configured_key = os.getenv("ENCRYPTION_KEY")
    if configured_key:
        return configured_key

    key_file_value = os.getenv("ENCRYPTION_KEY_FILE")
    key_file_path = Path(key_file_value).expanduser() if key_file_value else Path.home() / ".prepiq" / "dev_encryption_key"

    try:
        key_file_path.parent.mkdir(parents=True, exist_ok=True)
        if key_file_path.exists():
            persisted_key = key_file_path.read_text(encoding="utf-8").strip()
            if persisted_key:
                warnings.warn(
                    "ENCRYPTION_KEY not set in environment. Using persisted development key from "
                    f"{key_file_path}. This is NOT suitable for production use.",
                    UserWarning,
                )
                return persisted_key

        generated_key = Fernet.generate_key().decode()
        key_file_path.write_text(generated_key, encoding="utf-8")
        try:
            os.chmod(key_file_path, 0o600)
        except OSError:
            pass
        warnings.warn(
            "ENCRYPTION_KEY not set in environment. Generated a persisted development key at "
            f"{key_file_path}. This is NOT suitable for production use.",
            UserWarning,
        )
        return generated_key
    except OSError:
        warnings.warn(
            "ENCRYPTION_KEY not set in environment and no persisted development key could be created. "
            "Using a process-local auto-generated key; encrypted secrets will be unreadable after restart. "
            "This is NOT suitable for production use.",
            UserWarning,
        )
        return Fernet.generate_key().decode()


ENCRYPTION_KEY = _load_encryption_key()


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