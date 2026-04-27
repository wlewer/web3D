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
        SQLEnum('character', 'scene', 'prop', 'vehicle', 'other', name='model_category'),
        nullable=False,
        default='other'
    )
    status = Column(
        SQLEnum('pending', 'approved', 'rejected', 'archived', name='model_status'),
        nullable=False,
        default='pending',
        index=True
    )
    
    # 文件信息 / File information
    thumbnail_url = Column(String, nullable=True)
    model_url = Column(String, nullable=False)  # 3D模型文件URL
    format = Column(
        SQLEnum('glb', 'gltf', 'fbx', 'obj', 'ply', 'splat', name='model_format'),
        nullable=False
    )
    file_size = Column(BigInteger, nullable=False)  # 文件大小（字节）
    
    # 技术元数据 / Technical metadata
    polygon_count = Column(Integer, nullable=True)  # 面数
    texture_count = Column(Integer, nullable=True)  # 贴图数量
    metadata_json = Column(JSON, nullable=True)  # 额外元数据（JSON格式）
    
    # 标签 / Tags
    tags = Column(JSON, nullable=True)  # 标签列表
    
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
