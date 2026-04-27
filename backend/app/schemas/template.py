"""
Web3D Backend - 场景模板数据验证模型
Scene Template Pydantic schemas for validation
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class TemplateCategory(str, Enum):
    """模板分类"""
    product = "product"
    architecture = "architecture"
    art = "art"
    interior = "interior"
    exterior = "exterior"


class TemplateStatus(str, Enum):
    """模板状态"""
    draft = "draft"
    published = "published"
    archived = "archived"


class SparkConfig(BaseModel):
    """Spark 2.0 场景配置"""
    pointCloudUrl: Optional[str] = None
    backgroundColor: str = "#1a1a2e"
    cameraPosition: List[float] = [0, 2, 5]
    cameraTarget: List[float] = [0, 0, 0]
    lighting: Optional[Dict[str, Any]] = None
    postProcessing: Optional[Dict[str, Any]] = None
    
    class Config:
        extra = "allow"  # 允许额外字段


class TemplateCreate(BaseModel):
    """创建模板请求"""
    name: str = Field(..., min_length=1, max_length=255, description="模板名称")
    description: Optional[str] = Field(None, description="模板描述")
    category: TemplateCategory = Field(TemplateCategory.product, description="模板分类")
    thumbnail_url: Optional[str] = Field(None, description="缩略图URL")
    spark_config: SparkConfig = Field(..., description="Spark 2.0 场景配置")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")
    version: str = Field("1.0.0", description="版本号")
    is_featured: bool = Field(False, description="是否推荐")
    
    @validator('tags')
    def validate_tags(cls, v):
        if v and len(v) > 10:
            raise ValueError("最多只能有10个标签")
        return v


class TemplateUpdate(BaseModel):
    """更新模板请求"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[TemplateCategory] = None
    status: Optional[TemplateStatus] = None
    thumbnail_url: Optional[str] = None
    spark_config: Optional[SparkConfig] = None
    tags: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    
    @validator('tags')
    def validate_tags(cls, v):
        if v and len(v) > 10:
            raise ValueError("最多只能有10个标签")
        return v


class TemplateResponse(BaseModel):
    """模板响应"""
    id: str
    name: str
    description: Optional[str] = None
    category: TemplateCategory
    status: TemplateStatus
    thumbnail_url: Optional[str] = None
    spark_config: SparkConfig
    tags: Optional[List[str]] = []
    usage_count: int = 0
    like_count: int = 0
    version: str
    is_featured: bool = False
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """模板列表响应"""
    data: List[TemplateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TemplateReviewRequest(BaseModel):
    """模板审核请求"""
    status: TemplateStatus = Field(..., description="审核结果")
    review_comment: Optional[str] = Field(None, description="审核意见")


class BatchReviewRequest(BaseModel):
    """批量审核请求"""
    template_ids: List[str] = Field(..., min_items=1, description="模板ID列表")
    status: TemplateStatus = Field(..., description="审核结果")
    review_comment: Optional[str] = Field(None, description="审核意见")


class TemplateVersionCreate(BaseModel):
    """创建模板版本"""
    version: str = Field(..., description="版本号")
    spark_config: SparkConfig = Field(..., description="Spark 配置")
    change_log: Optional[str] = Field(None, description="变更日志")


class TemplateVersionResponse(BaseModel):
    """模板版本响应"""
    id: str
    template_id: str
    version: str
    spark_config: SparkConfig
    change_log: Optional[str] = None
    created_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True
