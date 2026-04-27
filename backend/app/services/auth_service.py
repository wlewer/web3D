"""
Web3D Backend - 认证服务
Authentication service layer
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from loguru import logger
from datetime import timedelta

from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, TokenResponse
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    add_token_to_blacklist
)
from app.config import settings


class AuthService:
    """认证服务类 / Authentication service class"""
    
    @staticmethod
    async def register(db: AsyncSession, user_data: UserCreate) -> dict:
        """
        用户注册
        Register new user
        
        Args:
            db: 数据库会话
            user_data: 用户注册数据
        
        Returns:
            dict: 包含用户信息和Token
        
        Raises:
            HTTPException: 用户名或邮箱已存在
        """
        # 检查用户名是否已存在
        result = await db.execute(
            select(User).where(User.username == user_data.username)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # 检查邮箱是否已存在
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # 创建新用户
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=hashed_password,
            phone=user_data.phone,
            role=user_data.role or 'user',
            status='active',
            storage_quota=settings.DEFAULT_STORAGE_QUOTA,
            storage_used=0
        )
        
        db.add(new_user)
        await db.flush()  # 获取user.id
        await db.refresh(new_user)
        await db.commit()  # 提交事务
        
        logger.info(f"User registered: {new_user.username} (ID: {new_user.id})")
        
        # 生成Token
        access_token = create_access_token(data={"sub": str(new_user.id)})
        refresh_token = create_refresh_token(data={"sub": str(new_user.id)})
        
        return {
            "user": new_user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    @staticmethod
    async def login(db: AsyncSession, login_data: UserLogin) -> dict:
        """
        用户登录
        Login user
        
        Args:
            db: 数据库会话
            login_data: 登录凭证
        
        Returns:
            dict: 包含用户信息和Token
        
        Raises:
            HTTPException: 凭证无效或账户被封禁
        """
        # 查找用户（支持用户名或邮箱）
        if login_data.username:
            result = await db.execute(
                select(User).where(User.username == login_data.username)
            )
        elif login_data.email:
            result = await db.execute(
                select(User).where(User.email == login_data.email)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email is required"
            )
        
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 验证密码
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # 检查账户状态
        if user.status == "banned":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been banned"
            )
        
        if user.status == "inactive":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )
        
        # 更新最后登录时间
        from datetime import datetime, timezone
        user.last_login_at = datetime.now(timezone.utc)
        await db.flush()
        
        logger.info(f"User logged in: {user.username} (ID: {user.id})")
        
        # 生成Token
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return {
            "user": user,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    @staticmethod
    async def refresh_token(refresh_token: str) -> dict:
        """
        刷新Access Token
        Refresh access token
        
        Args:
            refresh_token: Refresh Token
        
        Returns:
            dict: 新的Access Token
        
        Raises:
            HTTPException: Token无效
        """
        # 解码并验证Refresh Token
        payload = decode_token(refresh_token, token_type="refresh")
        user_id = payload.get("sub")
        
        # 生成新的Access Token
        new_access_token = create_access_token(data={"sub": user_id})
        
        logger.debug(f"Token refreshed for user {user_id}")
        
        return {
            "access_token": new_access_token,
            "refresh_token": refresh_token,  # Refresh Token不变
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    
    @staticmethod
    async def logout(access_token: str, refresh_token: str) -> None:
        """
        用户登出（将Token加入黑名单）
        Logout user (blacklist tokens)
        
        Args:
            access_token: Access Token
            refresh_token: Refresh Token
        """
        # 将Access Token加入黑名单
        access_payload = decode_token(access_token, token_type="access")
        access_exp = access_payload.get("exp")
        expire_seconds = access_exp - int(__import__('time').time())
        
        if expire_seconds > 0:
            await add_token_to_blacklist(access_token, expire_seconds)
        
        # 将Refresh Token加入黑名单
        refresh_payload = decode_token(refresh_token, token_type="refresh")
        refresh_exp = refresh_payload.get("exp")
        refresh_expire_seconds = refresh_exp - int(__import__('time').time())
        
        if refresh_expire_seconds > 0:
            await add_token_to_blacklist(refresh_token, refresh_expire_seconds)
        
        logger.info(f"User logged out, tokens blacklisted")


# 创建全局服务实例
auth_service = AuthService()
