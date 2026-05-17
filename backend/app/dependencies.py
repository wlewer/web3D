"""
Web3D Backend - 依赖注入
Dependency injection for authentication and authorization
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from loguru import logger

from app.database import get_db
from app.models.user import User
from app.core.security import decode_token, is_token_blacklisted
from app.core.tenant_context import set_current_tenant_id, set_platform_admin
from sqlalchemy import select


# OAuth2密码流（严格模式：缺失token会直接返回401）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# OAuth2密码流（宽松模式：缺失token返回None，用于需要认证但允许匿名访问的端点）
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    获取当前登录用户（可选认证）
    未携带Token或Token无效时返回None而非HTTP异常
    用于：前台公开页面，有认证更好但没有也能工作
    """
    if token is None:
        return None

    try:
        # 检查Token是否在黑名单中
        if await is_token_blacklisted(token):
            return None

        # 解码Token
        payload = decode_token(token, token_type="access")
        user_id: Optional[str] = payload.get("sub")

        if user_id is None:
            return None

    except JWTError:
        return None

    # 从数据库查询用户
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        return None

    # 检查用户状态
    if user.status != "active":
        return None

    # ===== 设置租户上下文 =====
    set_current_tenant_id(user.tenant_id)
    if user.role == 'admin' and user.tenant_id is None:
        set_platform_admin(True)
    else:
        set_platform_admin(False)

    return user


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    获取当前登录用户
    Get current authenticated user
    
    Args:
        token: JWT Access Token
        db: 数据库会话
    
    Returns:
        User: 用户对象
    
    Raises:
        HTTPException: Token无效或用户不存在
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 检查Token是否在黑名单中
        if await is_token_blacklisted(token):
            raise credentials_exception
        
        # 解码Token
        payload = decode_token(token, token_type="access")
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
        
    except JWTError:
        raise credentials_exception
    
    # 从数据库查询用户
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    # 检查用户状态
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    # ===== 设置租户上下文 =====
    # 用户验证成功后，将 tenant_id 写入协程安全的 ContextVar
    # 这是租户隔离的权威来源（中间件层仅做预解析）
    set_current_tenant_id(user.tenant_id)
    
    # 平台超管判定：admin 角色 + 无租户关联
    if user.role == 'admin' and user.tenant_id is None:
        set_platform_admin(True)
    else:
        set_platform_admin(False)
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    获取当前活跃用户（额外检查状态）
    Get current active user
    
    Args:
        current_user: 当前用户
    
    Returns:
        User: 活跃用户对象
    
    Raises:
        HTTPException: 用户未激活
    """
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def require_role(*required_roles: str):
    """
    角色权限装饰器
    Role-based access control decorator
    
    Args:
        *required_roles: 所需角色（admin/editor/user/guest），支持多个
    
    Returns:
        依赖函数
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # 如果用户角色在允许的角色列表中，直接通过
        if current_user.role in required_roles:
            return current_user
        
        # 否则检查角色层级
        role_hierarchy = {
            "guest": 0,
            "user": 1,
            "editor": 2,
            "admin": 3
        }
        
        # 获取所需的最高权限级别
        required_levels = [role_hierarchy.get(role, 0) for role in required_roles]
        max_required_level = max(required_levels) if required_levels else 0
        
        user_role_level = role_hierarchy.get(current_user.role, 0)
        
        if user_role_level < max_required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(required_roles)}"
            )
        
        return current_user
    
    return role_checker


# 常用角色依赖
require_admin = require_role("admin")
require_editor = require_role("editor")
require_user = require_role("user")
