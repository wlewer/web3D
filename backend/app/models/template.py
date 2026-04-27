"""
Web3D Backend - 场景模板数据模型
Scene Template database models
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, Enum as SQLEnum, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class SceneTemplate(Base):
    """
    场景模板表
    Scene Templates table - Stores Spark 2.0 scene configuration templates
    """
    __tablename__ = "scene_templates"
    
    # 主键 / Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 基本信息 / Basic information
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    
    # 分类与状态 / Category and status
    category = Column(
        SQLEnum('product', 'architecture', 'art', 'interior', 'exterior', name='template_category'),
        nullable=False,
        default='product'
    )
    status = Column(
        SQLEnum('draft', 'published', 'archived', name='template_status'),
        nullable=False,
        default='draft',
        index=True
    )
    
    # 缩略图 / Thumbnail
    thumbnail_url = Column(String, nullable=True)
    
    # Spark 2.0 场景配置 (JSON格式) / Spark 2.0 scene configuration (JSON format)
    spark_config = Column(JSON, nullable=False, default=dict)
    """
    Spark 配置结构示例 / Example structure:
    {
        "pointCloudUrl": "https://...",
        "backgroundColor": "#1a1a2e",
        "cameraPosition": [0, 2, 5],
        "cameraTarget": [0, 0, 0],
        "lighting": {
            "ambient": 0.5,
            "directional": [
                {"position": [5, 10, 5], "intensity": 1.0}
            ]
        },
        "postProcessing": {
            "bloom": true,
            "toneMapping": "aces",
            "exposure": 1.0
        }
    }
    """
    
    # 标签 / Tags
    tags = Column(JSON, nullable=True, default=list)  # ["modern", "minimalist"]
    
    # 使用统计 / Usage statistics
    usage_count = Column(Integer, nullable=False, default=0)
    like_count = Column(Integer, nullable=False, default=0)
    
    # 版本管理 / Version management
    version = Column(String(20), nullable=False, default="1.0.0")
    is_featured = Column(Boolean, nullable=False, default=False)  # 是否推荐
    
    # 关联用户 / Related user
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # 时间戳 / Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系 / Relationships
    creator = relationship("User", back_populates="created_templates")
    
    def __repr__(self):
        return f"<SceneTemplate(id='{self.id}', name='{self.name}', category='{self.category}')>"


class TemplateVersion(Base):
    """
    模板版本历史表（可选）
    Template Version History table (optional)
    """
    __tablename__ = "template_versions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String(36), ForeignKey("scene_templates.id"), nullable=False, index=True)
    version = Column(String(20), nullable=False)
    spark_config = Column(JSON, nullable=False)
    change_log = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系 / Relationships
    template = relationship("SceneTemplate", back_populates="versions")
    creator = relationship("User")


# 添加反向关系到 User 模型
# Add reverse relationships to User model
from app.models.user import User
if not hasattr(User, 'created_templates'):
    User.created_templates = relationship("SceneTemplate", back_populates="creator")
if not hasattr(User, 'template_versions'):
    User.template_versions = relationship("TemplateVersion", back_populates="creator")

# 添加反向关系到 SceneTemplate
if not hasattr(SceneTemplate, 'versions'):
    SceneTemplate.versions = relationship("TemplateVersion", back_populates="template", cascade="all, delete-orphan")
