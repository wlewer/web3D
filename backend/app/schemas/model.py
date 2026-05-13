"""
Web3D Backend - 3D模型Schema
3D Model request/response schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ModelCategory(str, Enum):
    """模型分类枚举"""
    CHARACTER = "character"
    SCENE = "scene"
    PROP = "prop"
    VEHICLE = "vehicle"
    BOX = "box"
    ANIMATION = "animation"
    NATURE = "nature"
    ANIMAL = "animal"
    ARCHITECTURE = "architecture"
    FOOD = "food"
    INDUSTRY = "industry"
    ART = "art"
    OTHER = "other"


class ModelStatus(str, Enum):
    """模型状态枚举"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"
    DISABLED = "disabled"


class ModelFormat(str, Enum):
    """模型格式枚举"""
    GLB = "glb"
    GLTF = "gltf"
    FBX = "fbx"
    OBJ = "obj"
    PLY = "ply"
    SPLAT = "splat"
    STL = "stl"
    SPZ = "spz"


class ModelBase(BaseModel):
    """模型基础Schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: ModelCategory = ModelCategory.OTHER
    format: ModelFormat
    model_url: str
    thumbnail_url: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata_json: Optional[Dict[str, Any]] = None
    # 首页展示字段
    display_name: Optional[str] = None
    icon: Optional[str] = None
    color_hex: Optional[str] = None
    show_on_homepage: bool = False
    show_in_gallery: bool = False
    sort_order: int = 0
    model_url_fallback: Optional[str] = None

    class Config:
        protected_namespaces = ()


class ModelCreate(ModelBase):
    """创建模型Schema"""
    file_size: int = Field(..., gt=0)
    polygon_count: Optional[int] = None
    texture_count: Optional[int] = None


class ModelUpdate(BaseModel):
    """更新模型Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[ModelCategory] = None
    thumbnail_url: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata_json: Optional[Dict[str, Any]] = None
    polygon_count: Optional[int] = None
    texture_count: Optional[int] = None
    # 首页展示字段
    display_name: Optional[str] = None
    icon: Optional[str] = None
    color_hex: Optional[str] = None
    show_on_homepage: Optional[bool] = None
    show_in_gallery: Optional[bool] = None
    sort_order: Optional[int] = None
    model_url_fallback: Optional[str] = None


class ModelReviewRequest(BaseModel):
    """模型审核请求Schema"""
    status: ModelStatus
    rejection_reason: Optional[str] = None


class ModelResponse(ModelBase):
    """模型响应Schema"""
    id: str
    status: ModelStatus
    file_size: int
    polygon_count: Optional[int] = None
    texture_count: Optional[int] = None
    created_by: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # 首页展示字段（响应中返回）
    display_name: Optional[str] = None
    icon: Optional[str] = None
    color_hex: Optional[str] = None
    show_on_homepage: bool = False
    show_in_gallery: bool = False
    sort_order: int = 0
    model_url_fallback: Optional[str] = None
    
    class Config:
        from_attributes = True


class ModelListResponse(BaseModel):
    """模型列表响应Schema"""
    data: List[ModelResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BatchReviewRequest(BaseModel):
    """批量审核请求Schema"""
    ids: List[str]
    status: ModelStatus
    rejection_reason: Optional[str] = None
