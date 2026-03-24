import os
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import uuid

# JWT CONFIG (can be overridden via environment variables loaded by dotenv in main.py)
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "30"))
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "8"))  # Override days with hours for prod

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create access token with jti (unique ID) for future revocation support"""
    to_encode = data.copy()
    
    if expires_delta is None:
        if ACCESS_TOKEN_EXPIRE_HOURS > 0:
            expires_delta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
        else:
            expires_delta = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    # Add unique jti (JWT ID) for token tracking
    to_encode["jti"] = str(uuid.uuid4())
    
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded, int(expires_delta.total_seconds())

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_refresh_token(data: dict, expires_delta: timedelta = timedelta(days=30)):
    """Create refresh token with jti for future rotation support"""
    to_encode = data.copy()
    
    # Add unique jti (JWT ID) for token tracking
    to_encode["jti"] = str(uuid.uuid4())
    
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    
    encoded = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded, int(expires_delta.total_seconds())


def create_device_token(data: dict, expires_delta: timedelta = timedelta(days=90)):
    """Create a device-specific JWT token with longer expiration"""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "type": "device"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_device_token(token: str):
    """Verify and decode device token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "device":
            return None
        return payload
    except JWTError:
        return None


def extract_jti_from_token(token: str) -> str | None:
    """Extract jti claim from token without verification (for revocation)"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("jti")
    except JWTError:
        return None


def decode_token_claims(token: str) -> dict | None:
    """Safely decode and return token claims"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
