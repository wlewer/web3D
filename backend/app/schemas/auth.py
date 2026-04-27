"""
Web3D Backend - Pydantic数据模式
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from uuid import UUID


# ==================== 用户相关模式 ====================

class UserBase(BaseModel):
    """用户基础信息 / User base information"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    phone: Optional[str] = Field(None, description="手机号")


class UserCreate(UserBase):
    """用户注册请求 / User registration request"""
    password: str = Field(..., min_length=8, description="密码（最少8位）")
    
    @validator('username')
    def validate_username(cls, v):
        if not v.isalnum():
            raise ValueError('用户名只能包含字母和数字')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('密码长度至少8位')
        if not any(c.isdigit() for c in v):
            raise ValueError('密码必须包含至少一个数字')
        if not any(c.isalpha() for c in v):
            raise ValueError('密码必须包含至少一个字母')
        return v


class UserLogin(BaseModel):
    """用户登录请求 / User login request"""
    username: Optional[str] = Field(None, description="用户名")
    email: Optional[EmailStr] = Field(None, description="邮箱地址")
    password: str = Field(..., description="密码")


class UserResponse(BaseModel):
    """用户响应 / User response"""
    id: UUID
    username: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    status: str
    storage_quota: int
    storage_used: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Token响应 / Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefresh(BaseModel):
    """Token刷新请求 / Token refresh request"""
    refresh_token: str = Field(..., description="Refresh Token")


# ==================== 通用响应模式 ====================

class ResponseModel(BaseModel):
    """统一响应格式 / Unified response format"""
    code: int = 200
    message: str = "success"
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    """错误响应 / Error response"""
    code: int
    message: str
    detail: Optional[str] = None
