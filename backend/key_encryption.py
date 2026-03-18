"""
Symmetric encryption helpers for API key storage.
Uses Fernet (AES-128-CBC via cryptography library) with a secret derived
from an environment variable so keys are never stored in plain text.
"""

import os
import base64
import hashlib
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
_backend_dir = Path(__file__).parent
load_dotenv(dotenv_path=_backend_dir / '.env')


def _get_or_create_encryption_key() -> bytes:
    """
    Derive a 32-byte Fernet key from the ENCRYPTION_SECRET env var.
    If the var doesn't exist, generate one and persist it to .env.
    """
    env_path = _backend_dir / '.env'
    secret = os.environ.get('ENCRYPTION_SECRET')

    if not secret:
        # Try to read from .env file directly
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('ENCRYPTION_SECRET='):
                        secret = line.split('=', 1)[1].strip().strip('"').strip("'")
                        break

    if not secret:
        # Generate a new secret and persist
        secret = base64.urlsafe_b64encode(os.urandom(32)).decode()
        with open(env_path, 'a') as f:
            f.write(f'\nENCRYPTION_SECRET={secret}\n')
        os.environ['ENCRYPTION_SECRET'] = secret

    # Derive a URL-safe 32-byte key from the secret using SHA-256
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


# Cache the Fernet instance at module level
_FERNET_KEY = _get_or_create_encryption_key()

try:
    from cryptography.fernet import Fernet
    _fernet = Fernet(_FERNET_KEY)
    _USE_FERNET = True
except ImportError:
    # Fallback: simple base64 obfuscation if cryptography is not installed.
    # Not truly secure — install `cryptography` for production.
    _fernet = None
    _USE_FERNET = False
    print("[WARNING] 'cryptography' package not installed — API keys use base64 obfuscation only. "
          "Run: pip install cryptography")


def encrypt_api_key(plain_key: str) -> str:
    """Encrypt an API key for database storage. Returns a string."""
    if _USE_FERNET:
        return _fernet.encrypt(plain_key.encode()).decode()
    # Fallback
    return base64.urlsafe_b64encode(plain_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key from database storage."""
    if _USE_FERNET:
        return _fernet.decrypt(encrypted_key.encode()).decode()
    # Fallback
    return base64.urlsafe_b64decode(encrypted_key.encode()).decode()
