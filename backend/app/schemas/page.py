"""
Web3D Backend - 页面搭建器Schema
Page Builder request/response schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PageCreate(BaseModel):
    """创建页面Schema"""
    title: str = Field(..., min_length=1, max_length=200)
    slug: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    schema_json: Optional[str] = None

    class Config:
        protected_namespaces = ()


class PageUpdate(BaseModel):
    """更新页面Schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    seo_title: Optional[str] = Field(None, max_length=200)
    seo_description: Optional[str] = None
    is_homepage: Optional[bool] = None

    class Config:
        protected_namespaces = ()


class PageDraftSave(BaseModel):
    """保存草稿Schema"""
    schema_json: str = Field(..., min_length=1)


class PagePublish(BaseModel):
    """发布页面Schema"""
    change_summary: Optional[str] = Field(None, max_length=500)


class PageResponse(BaseModel):
    """页面响应Schema"""
    id: str
    tenant_id: Optional[str] = None
    title: str
    slug: str
    description: Optional[str] = None
    status: str
    current_version: int
    schema_json: Optional[str] = None
    published_schema_json: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    is_homepage: bool = False
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()


class PageListResponse(BaseModel):
    """页面列表响应Schema"""
    data: List[PageResponse]
    total: int
    skip: int
    limit: int


class PageVersionResponse(BaseModel):
    """页面版本响应Schema"""
    id: str
    page_id: str
    version_number: int
    schema_json: str
    change_summary: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()
