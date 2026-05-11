"""
Web3D Backend - 用户使用统计模型
User usage statistics for Tencent Hunyuan3D API (额度由腾讯云直接管理)
"""
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid

from app.database import Base


class UserQuota(Base):
    """
    用户使用统计表（不再管理本地额度，额度由腾讯云API直接管理）
    
    仅用于：
    - 统计调用次数（供前端显示"已使用 X 次"）
    - 记录成功/失败次数
    """
    __tablename__ = "user_quotas"
    
    # 主键 / Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 外键关联用户 / Foreign key to users table
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    
    # 使用统计（纯统计，不用于额度判断）
    used_quota = Column(BigInteger, nullable=False, default=0)     # 已使用次数
    
    # 统计信息 / Statistics
    total_generations = Column(Integer, nullable=False, default=0)  # 总生成次数
    successful_generations = Column(Integer, nullable=False, default=0)  # 成功生成次数
    failed_generations = Column(Integer, nullable=False, default=0)  # 失败生成次数
    
    # 时间戳 / Timestamps
    last_used_at = Column(DateTime(timezone=True), nullable=True)  # 最后使用时间
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系 / Relationships
    user = relationship("User", back_populates="quota")
    
    def __repr__(self):
        return f"<UserQuota(user_id={self.user_id}, used={self.used_quota}次)>"
    
    def record_usage(self):
        """记录一次API调用（不论成功失败）"""
        self.used_quota = (self.used_quota or 0) + 1
        self.total_generations = (self.total_generations or 0) + 1
        self.last_used_at = datetime.now(timezone.utc)
    
    def record_success(self):
        """记录成功生成"""
        self.successful_generations = (self.successful_generations or 0) + 1
    
    def record_failure(self):
        """记录失败生成"""
        self.failed_generations = (self.failed_generations or 0) + 1
