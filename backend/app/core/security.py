"""
Web3D Backend - 安全工具
Security utilities: JWT, password hashing, OAuth2
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from loguru import logger

from app.config import settings


# ==================== 密码加密 ====================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码
    Verify password against hash
    
    Args:
        plain_password: 明文密码
        hashed_password: bcrypt哈希密码
    
    Returns:
        bool: 密码是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    生成密码哈希
    Hash password using bcrypt
    
    Args:
        password: 明文密码
    
    Returns:
        str: bcrypt哈希值
    """
    return pwd_context.hash(password)


# ==================== JWT Token管理 ====================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建Access Token
    Create JWT access token
    
    Args:
        data: 要编码的数据（通常包含user_id）
        expires_delta: 过期时间增量
    
    Returns:
        str: JWT token字符串
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.debug(f"Created access token for user {data.get('sub')}")
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    创建Refresh Token
    Create JWT refresh token
    
    Args:
        data: 要编码的数据
    
    Returns:
        str: JWT refresh token字符串
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    logger.debug(f"Created refresh token for user {data.get('sub')}")
    return encoded_jwt


def decode_token(token: str, token_type: str = "access") -> dict:
    """
    解码JWT Token
    Decode and verify JWT token
    
    先用主密钥解码，失败后尝试fallback密钥（如果配置了）
    
    Args:
        token: JWT token字符串
        token_type: token类型（access或refresh）
    
    Returns:
        dict: 解码后的payload
    
    Raises:
        HTTPException: Token无效或已过期
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    def _try_decode(secret: str) -> Optional[dict]:
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=[settings.ALGORITHM]
            )
            # 验证token类型
            if payload.get("type") != token_type:
                return None
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return payload
        except JWTError:
            return None
    
    # 先尝试主密钥
    payload = _try_decode(settings.SECRET_KEY)
    if payload is not None:
        return payload
    
    # 主密钥失败，尝试fallback密钥（密钥轮转兼容）
    if settings.SECRET_KEY_FALLBACK and settings.SECRET_KEY_FALLBACK != settings.SECRET_KEY:
        payload = _try_decode(settings.SECRET_KEY_FALLBACK)
        if payload is not None:
            logger.info("Token verified with fallback key")
            return payload
    
    logger.error("Token decode error: both primary and fallback keys failed")
    raise credentials_exception


def generate_secret_key(length: int = 64) -> str:
    """
    生成安全随机密钥
    Generate a cryptographically secure random secret key
    
    Args:
        length: 密钥长度（默认64字符）
    
    Returns:
        str: 安全随机密钥字符串
    """
    return secrets.token_urlsafe(length)


# ==================== Token黑名单（Redis） ====================
async def add_token_to_blacklist(token: str, expire_seconds: int) -> None:
    """
    将Token加入黑名单（用于登出）
    Add token to blacklist (for logout)
    
    Args:
        token: JWT token
        expire_seconds: 过期秒数
    """
    if not settings.REDIS_ENABLED:
        return  # 开发环境跳过
    
    import redis.asyncio as redis
    
    r = redis.from_url(settings.REDIS_URL)
    await r.setex(f"blacklist:{token}", expire_seconds, "1")
    await r.close()


async def is_token_blacklisted(token: str) -> bool:
    """
    检查Token是否在黑名单中
    Check if token is blacklisted
    
    Args:
        token: JWT token
    
    Returns:
        bool: 是否在黑名单中
    """
    if not settings.REDIS_ENABLED:
        return False  # 开发环境跳过
    
    import redis.asyncio as redis
    
    r = redis.from_url(settings.REDIS_URL)
    result = await r.get(f"blacklist:{token}")
    await r.close()
    
    return result is not None
