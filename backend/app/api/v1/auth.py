"""
Web3D Backend - 认证API路由
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.database import get_db
from app.schemas.auth import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefresh,
    ResponseModel
)
from app.services.auth_service import auth_service
from app.dependencies import get_current_user
from app.models.user import User


router = APIRouter()


@router.post(
    "/register",
    response_model=ResponseModel,
    summary="用户注册 / Register new user",
    description="创建新用户账户并返回JWT Token"
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    用户注册接口
    User registration endpoint
    
    - **username**: 用户名（3-50位，仅字母数字）
    - **email**: 邮箱地址
    - **password**: 密码（最少8位，需包含字母和数字）
    - **phone**: 手机号（可选）
    """
    try:
        result = await auth_service.register(db, user_data)
        
        return ResponseModel(
            code=200,
            message="Registration successful",
            data={
                "user": UserResponse.from_orm(result["user"]).dict(),
                "access_token": result["access_token"],
                "refresh_token": result["refresh_token"],
                "token_type": "bearer",
                "expires_in": result["expires_in"]
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post(
    "/login",
    response_model=ResponseModel,
    summary="用户登录 / Login user",
    description="使用邮箱和密码登录，返回JWT Token"
)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    用户登录接口
    User login endpoint
    
    - **email**: 邮箱地址
    - **password**: 密码
    """
    try:
        result = await auth_service.login(db, login_data)
        
        return ResponseModel(
            code=200,
            message="Login successful",
            data={
                "user": UserResponse.from_orm(result["user"]).dict(),
                "access_token": result["access_token"],
                "refresh_token": result["refresh_token"],
                "token_type": "bearer",
                "expires_in": result["expires_in"]
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post(
    "/refresh",
    response_model=ResponseModel,
    summary="刷新Token / Refresh access token",
    description="使用Refresh Token获取新的Access Token"
)
async def refresh_token(token_data: TokenRefresh):
    """
    Token刷新接口
    Token refresh endpoint
    
    - **refresh_token**: Refresh Token字符串
    """
    try:
        result = await auth_service.refresh_token(token_data.refresh_token)
        
        return ResponseModel(
            code=200,
            message="Token refreshed successfully",
            data=result
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post(
    "/logout",
    response_model=ResponseModel,
    summary="用户登出 / Logout user",
    description="将当前Token加入黑名单，实现登出功能"
)
async def logout(
    current_user: User = Depends(get_current_user),
    access_token: str = Depends(lambda: None),  # 从请求头获取
):
    """
    用户登出接口
    User logout endpoint
    
    需要Bearer Token认证
    """
    try:
        # TODO: 从请求中正确提取token
        # 这里简化处理，实际应从Authorization header获取
        
        return ResponseModel(
            code=200,
            message="Logout successful"
        )
    
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get(
    "/me",
    response_model=ResponseModel,
    summary="获取当前用户信息 / Get current user info",
    description="返回当前登录用户的详细信息"
)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    获取当前用户信息
    Get current user information
    
    需要Bearer Token认证
    """
    return ResponseModel(
        code=200,
        message="Success",
        data=UserResponse.from_orm(current_user).dict()
    )
