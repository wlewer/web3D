"""
Web3D Backend - 官网模板系统 Pydantic schemas
Website Template System validation schemas
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import json


def parse_json_field(v: Union[str, Dict, None]) -> Optional[Dict]:
    """将可能存储为 JSON 字符串的字段解析为 dict"""
    if v is None:
        return None
    if isinstance(v, str):
        # 兼容 Python repr 格式的布尔值和 None（如 True/False/None 而非 true/false/null）
        cleaned = v.replace(": True", ": true").replace(": False", ": false")
        cleaned = cleaned.replace(": True,", ": true,").replace(": False,", ": false,")
        cleaned = cleaned.replace(": None", ": null").replace(": None,", ": null,")
        if cleaned != v:
            v = cleaned
        try:
            return json.loads(v)
        except (json.JSONDecodeError, TypeError):
            # 如果仍解析失败，尝试更激进的替换（处理嵌套等情况）
            try:
                import re
                v = re.sub(r'\\bTrue\\b', 'true', v)
                v = re.sub(r'\\bFalse\\b', 'false', v)
                v = re.sub(r'\\bNone\\b', 'null', v)
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return v
    return v


# ==================== NavMenu Schemas ====================

class NavMenuLabel(BaseModel):
    """导航菜单多语言标签"""
    zh: str = ""
    en: str = ""


class NavMenuCreate(BaseModel):
    """创建导航菜单项"""
    parent_id: Optional[str] = None
    label: Dict[str, str] = Field(..., description='{"zh": "画廊", "en": "Gallery"}')
    icon: Optional[str] = None
    route: str = Field(..., min_length=1, max_length=100)
    page_title: Optional[str] = None
    template_id: Optional[str] = None
    page_component: Optional[str] = None
    sort_order: int = 0
    is_visible: bool = True
    auth_required: bool = False
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator('route')
    def route_must_start_with_slash(cls, v):
        if not v.startswith('/'):
            raise ValueError('route 必须以 / 开头')
        return v


class NavMenuUpdate(BaseModel):
    """更新导航菜单项"""
    parent_id: Optional[str] = None
    label: Optional[Dict[str, str]] = None
    icon: Optional[str] = None
    route: Optional[str] = None
    page_title: Optional[str] = None
    template_id: Optional[str] = None
    page_component: Optional[str] = None
    sort_order: Optional[int] = None
    is_visible: Optional[bool] = None
    auth_required: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None

    @validator('route')
    def route_must_start_with_slash(cls, v):
        if v is not None and not v.startswith('/'):
            raise ValueError('route 必须以 / 开头')
        return v


class NavMenuResponse(BaseModel):
    """导航菜单项响应"""
    id: str
    parent_id: Optional[str] = None
    label: Dict[str, Any]
    icon: Optional[str] = None
    route: str
    page_title: Optional[str] = None
    template_id: Optional[str] = None
    page_component: Optional[str] = None
    sort_order: int = 0
    is_visible: bool = True
    auth_required: bool = False
    config: Optional[Dict[str, Any]] = None
    children: Optional[List['NavMenuResponse']] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    _parse_label = validator('label', pre=True, allow_reuse=True)(parse_json_field)
    _parse_config = validator('config', pre=True, allow_reuse=True)(parse_json_field)


class NavMenuListResponse(BaseModel):
    """导航菜单列表响应"""
    data: List[NavMenuResponse]
    total: int


class NavMenuBatchSortItem(BaseModel):
    """批量排序项"""
    id: str
    sort_order: int
    parent_id: Optional[str] = None


class NavMenuBatchSortRequest(BaseModel):
    """批量排序请求"""
    items: List[NavMenuBatchSortItem]


# ==================== TemplateSlot Schemas ====================

class SlotCreate(BaseModel):
    """创建模板插槽"""
    slot_key: str = Field(..., min_length=1, max_length=100)
    component_type: str = Field(..., min_length=1, max_length=100)
    sort_order: int = 0
    component_config: Dict[str, Any] = Field(default_factory=dict)
    is_dynamic: bool = False


class SlotUpdate(BaseModel):
    """更新模板插槽"""
    component_type: Optional[str] = None
    sort_order: Optional[int] = None
    component_config: Optional[Dict[str, Any]] = None
    is_dynamic: Optional[bool] = None

    @validator('is_dynamic', pre=True, always=True)
    def default_is_dynamic(cls, v):
        return v if v is not None else False


class SlotResponse(BaseModel):
    """模板插槽响应"""
    id: str
    template_id: str
    slot_key: str
    component_type: str
    sort_order: int = 0
    component_config: Dict[str, Any] = {}
    is_dynamic: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @validator('is_dynamic', pre=True, always=True)
    def default_is_dynamic(cls, v):
        return v if v is not None else False

    _parse_component_config = validator('component_config', pre=True, allow_reuse=True)(parse_json_field)


class SlotBatchUpdateRequest(BaseModel):
    """批量更新插槽（替换模板全部插槽）"""
    slots: List[SlotCreate]


# ==================== WebsiteTemplate Schemas ====================

class TemplateCreate(BaseModel):
    """创建模板"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: str = Field('full_page', description='full_page / section / component')
    layout_type: str = Field('single_column',
                             description='single_column / two_columns / sidebar_left / sidebar_right / dashboard / custom')
    layout_config: Dict[str, Any] = Field(default_factory=dict, description='页面区块结构定义')
    theme_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    meta_info: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_default: bool = False

    @validator('category')
    def validate_category(cls, v):
        allowed = {'full_page', 'section', 'component'}
        if v not in allowed:
            raise ValueError(f'category 必须是 {allowed} 之一')
        return v

    @validator('layout_type')
    def validate_layout_type(cls, v):
        allowed = {'single_column', 'two_columns', 'sidebar_left', 'sidebar_right', 'dashboard', 'custom'}
        if v not in allowed:
            raise ValueError(f'layout_type 必须是 {allowed} 之一')
        return v


class TemplateUpdate(BaseModel):
    """更新模板"""
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    layout_type: Optional[str] = None
    status: Optional[str] = None
    layout_config: Optional[Dict[str, Any]] = None
    theme_config: Optional[Dict[str, Any]] = None
    meta_info: Optional[Dict[str, Any]] = None
    is_default: Optional[bool] = None

    @validator('status')
    def validate_status(cls, v):
        if v is not None and v not in {'draft', 'published', 'archived'}:
            raise ValueError("status 必须是 'draft', 'published', 'archived' 之一")
        return v


class TemplateResponse(BaseModel):
    """模板响应"""
    id: str
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: str = 'full_page'
    layout_type: str = 'single_column'
    status: str = 'draft'
    version: str = '1.0.0'
    is_default: bool = False
    layout_config: Dict[str, Any] = {}
    theme_config: Optional[Dict[str, Any]] = None
    meta_info: Optional[Dict[str, Any]] = None
    created_by: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # 关联插槽
    slots: Optional[List[SlotResponse]] = None

    class Config:
        from_attributes = True

    _parse_layout_config = validator('layout_config', pre=True, allow_reuse=True)(parse_json_field)
    _parse_theme_config = validator('theme_config', pre=True, allow_reuse=True)(parse_json_field)
    _parse_meta_info = validator('meta_info', pre=True, allow_reuse=True)(parse_json_field)


class TemplateListResponse(BaseModel):
    """模板列表响应"""
    data: List[TemplateResponse]
    total: int
    page: int = 1
    page_size: int = 10
    total_pages: int = 0


class TemplatePublishRequest(BaseModel):
    """发布模板请求"""
    version: Optional[str] = None


# ==================== RegisteredComponent Schemas ====================

class ComponentResponse(BaseModel):
    """注册组件响应"""
    id: str
    component_type: str
    display_name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    category: str
    prop_schema: Dict[str, Any] = {}
    is_builtin: bool = True
    is_active: bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    _parse_prop_schema = validator('prop_schema', pre=True, allow_reuse=True)(parse_json_field)


class ComponentListResponse(BaseModel):
    """注册组件列表响应"""
    data: List[ComponentResponse]
    total: int
