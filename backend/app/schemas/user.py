"""
Web3D Backend - 用户Schema
User request/response schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """用户角色枚举"""
    ADMIN = "admin"
    EDITOR = "editor"
    USER = "user"
    GUEST = "guest"


class UserStatus(str, Enum):
    """用户状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    BANNED = "banned"


class UserBase(BaseModel):
    """用户基础Schema"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """创建用户Schema"""
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.USER


class UserUpdate(BaseModel):
    """更新用户Schema"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None


class UserResponse(UserBase):
    """用户响应Schema"""
    id: str
    role: UserRole
    status: UserStatus
    storage_quota: int
    storage_used: int
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """用户列表响应Schema"""
    data: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PasswordResetRequest(BaseModel):
    """密码重置请求Schema"""
    user_id: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str


class BatchOperationRequest(BaseModel):
    """批量操作请求Schema"""
    ids: List[str]
    action: str  # activate, deactivate, suspend, delete
