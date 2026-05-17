"""
Web3D Backend - 3D模型数据模型
3D Model database models
"""
from sqlalchemy import Column, String, Integer, BigInteger, Boolean, DateTime, Text, Enum as SQLEnum, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class Model3D(Base):
    """
    3D模型表
    3D Models table - Stores 3D model metadata and file information
    """
    __tablename__ = "models_3d"
    
    # 主键 / Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 基本信息 / Basic information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # 分类与状态 / Category and status
    category = Column(
        SQLEnum('character', 'scene', 'prop', 'vehicle', 'other', 'box', 'animation', 'nature', 'animal', 'architecture', 'food', 'industry', 'art', name='model_category'),
        nullable=False,
        default='other'
    )
    status = Column(
        SQLEnum('pending', 'approved', 'rejected', 'archived', 'disabled', name='model_status'),
        nullable=False,
        default='pending',
        index=True
    )
    
    # 文件信息 / File information
    thumbnail_url = Column(String, nullable=True)
    model_url = Column(String, nullable=False)  # 3D模型文件URL
    format = Column(
        SQLEnum('glb', 'gltf', 'fbx', 'obj', 'ply', 'splat', 'stl', 'spz', name='model_format'),
        nullable=False
    )
    file_size = Column(BigInteger, nullable=False)  # 文件大小（字节）
    
    # 技术元数据 / Technical metadata
    polygon_count = Column(Integer, nullable=True)  # 面数
    texture_count = Column(Integer, nullable=True)  # 贴图数量
    metadata_json = Column(JSON, nullable=True)  # 额外元数据（JSON格式）
    
    # 标签 / Tags
    tags = Column(JSON, nullable=True)  # 标签列表
    
    # 首页展示字段 / Homepage display fields
    display_name = Column(String(255), nullable=True)  # 首页展示名称（如"蓝色大闪蝶"）
    icon = Column(String(50), nullable=True)  # UI图标/emoji（如"🦋"）
    color_hex = Column(String(7), nullable=True)  # 主题色（如"#667eea"）
    show_on_homepage = Column(Boolean, default=False)  # 是否在首页展示
    show_in_gallery = Column(Boolean, default=False)  # 是否在画廊网格展示
    sort_order = Column(Integer, default=0)  # 首页排序权重（越大越靠前）
    model_url_fallback = Column(Text, nullable=True)  # 备用模型文件URL
    
    # 租户关联 / Tenant association (nullable for backward compatibility)
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=True, index=True)

    # 关联用户 / Related user
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    
    # 审核信息 / Review information
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # 时间戳 / Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系 / Relationships
    creator = relationship("User", foreign_keys=[created_by], backref="created_models")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="reviewed_models")
    
    def __repr__(self):
        return f"<Model3D(id={self.id}, name={self.name}, status={self.status})>"
