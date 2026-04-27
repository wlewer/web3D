"""
Web3D Backend - 用户数据模型
User database models
"""
from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class User(Base):
    """
    用户表
    Users table - Stores user account information
    """
    __tablename__ = "users"
    
    # 主键 / Primary key (SQLite用String存储UUID)
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 基本信息 / Basic information
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String, nullable=True)
    
    # 角色与状态 / Role and status
    role = Column(
        SQLEnum('admin', 'editor', 'user', 'guest', name='user_role'),
        default='user',
        nullable=False
    )
    status = Column(
        SQLEnum('active', 'inactive', 'banned', name='user_status'),
        default='active',
        nullable=False
    )
    
    # 存储配额 / Storage quota
    storage_quota = Column(BigInteger, default=1073741824)  # 1GB默认
    storage_used = Column(BigInteger, default=0)
    
    # 时间戳 / Timestamps
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系 / Relationships
    quota = relationship("UserQuota", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"
