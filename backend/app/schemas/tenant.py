"""
Web3D Backend - 租户Schema
Tenant request/response schemas for multi-tenant SaaS
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== 枚举类型 ====================

class TenantPlanType(str, Enum):
    """租户套餐类型"""
    FREE = "free"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class TenantStatus(str, Enum):
    """租户状态"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


# ==================== Tenant Schemas ====================

class TenantBase(BaseModel):
    """租户基础Schema"""
    name: str = Field(..., min_length=1, max_length=255, description="租户名称（公司/品牌名）")
    slug: str = Field(..., min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", description="URL友好标识")
    domain: Optional[str] = Field(None, max_length=255, description="自定义域名")
    logo_url: Optional[str] = Field(None, max_length=500, description="Logo URL")
    favicon_url: Optional[str] = Field(None, max_length=500, description="Favicon URL")


class TenantCreate(TenantBase):
    """创建租户Schema"""
    plan_type: TenantPlanType = TenantPlanType.FREE
    owner_user_id: Optional[str] = Field(None, description="所有者用户ID")
    # 配额覆盖（可选，不填则使用套餐默认值）
    max_models: Optional[int] = Field(None, ge=0, description="最大模型数")
    max_storage_bytes: Optional[int] = Field(None, ge=0, description="存储配额(字节)")
    max_ai_generations_monthly: Optional[int] = Field(None, ge=0, description="AI生成次数/月")
    max_pages: Optional[int] = Field(None, ge=0, description="最大页面数")


class TenantUpdate(BaseModel):
    """更新租户Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    domain: Optional[str] = Field(None, max_length=255)
    plan_type: Optional[TenantPlanType] = None
    status: Optional[TenantStatus] = None
    owner_user_id: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    favicon_url: Optional[str] = Field(None, max_length=500)
    max_models: Optional[int] = Field(None, ge=0)
    max_storage_bytes: Optional[int] = Field(None, ge=0)
    max_ai_generations_monthly: Optional[int] = Field(None, ge=0)
    max_pages: Optional[int] = Field(None, ge=0)
    expires_at: Optional[datetime] = None


class TenantResponse(TenantBase):
    """租户响应Schema"""
    id: str
    api_key: Optional[str] = None
    plan_type: TenantPlanType
    status: TenantStatus
    max_models: int
    max_storage_bytes: int
    max_ai_generations_monthly: int
    max_pages: int
    owner_user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    """租户列表响应Schema"""
    data: List[TenantResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== TenantConfig Schemas ====================

class TenantConfigBase(BaseModel):
    """租户配置基础Schema"""
    site_title: Optional[str] = Field(None, max_length=255, description="站点标题")
    site_description: Optional[str] = Field(None, description="站点描述")
    meta_keywords: Optional[str] = Field(None, max_length=500, description="SEO关键词")


class TenantConfigCreate(TenantConfigBase):
    """创建租户配置Schema"""
    theme_config: Optional[Dict[str, Any]] = Field(None, description="主题配置（CSS变量、颜色方案）")
    features_enabled: Optional[Dict[str, bool]] = Field(None, description="功能开关")
    custom_head_html: Optional[str] = Field(None, description="自定义<head>内容")
    custom_footer_html: Optional[str] = Field(None, description="自定义footer内容")


class TenantConfigUpdate(BaseModel):
    """更新租户配置Schema"""
    theme_config: Optional[Dict[str, Any]] = None
    site_title: Optional[str] = Field(None, max_length=255)
    site_description: Optional[str] = None
    meta_keywords: Optional[str] = Field(None, max_length=500)
    features_enabled: Optional[Dict[str, bool]] = None
    custom_head_html: Optional[str] = None
    custom_footer_html: Optional[str] = None


class TenantConfigResponse(TenantConfigBase):
    """租户配置响应Schema"""
    id: str
    tenant_id: str
    theme_config: Optional[Dict[str, Any]] = None
    features_enabled: Optional[Dict[str, bool]] = None
    custom_head_html: Optional[str] = None
    custom_footer_html: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
