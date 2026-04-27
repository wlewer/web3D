"""
Web3D Backend - 用户额度数据模型
User quota database models for Tencent Hunyuan3D API usage tracking
"""
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class UserQuota(Base):
    """
    用户额度表
    Tracks user quota for Tencent Hunyuan3D API usage
    
    每个用户可以有不同的资源包配置：
    - 总额度 (total_quota)
    - 已使用额度 (used_quota)
    - 有效期 (expires_at)
    """
    __tablename__ = "user_quotas"
    
    # 主键 / Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 外键关联用户 / Foreign key to users table
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    
    # 腾讯混元3D资源包信息 / Tencent Hunyuan3D resource package info
    total_quota = Column(BigInteger, nullable=False, default=200)  # 总额度（积分）
    used_quota = Column(BigInteger, nullable=False, default=0)     # 已使用额度
    remaining_quota = Column(BigInteger, nullable=False, default=200)  # 剩余额度（计算字段，但存储以提高性能）
    
    # 资源包类型 / Resource package type
    package_type = Column(String(50), nullable=False, default='standard')  # standard/pro/enterprise
    package_name = Column(String(100), nullable=True)  # 资源包名称
    
    # 有效期 / Validity period
    starts_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)  # NULL表示永久有效
    
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
        return f"<UserQuota(user_id={self.user_id}, remaining={self.remaining_quota}/{self.total_quota})>"
    
    @property
    def is_expired(self) -> bool:
        """检查额度是否过期"""
        if self.expires_at is None:
            return False
        from datetime import datetime, timezone
        # 确保时区一致：如果expires_at没有时区信息，添加UTC时区
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expires_at
    
    @property
    def usage_percentage(self) -> float:
        """计算使用百分比"""
        if self.total_quota == 0:
            return 100.0
        return min(100.0, (self.used_quota / self.total_quota) * 100)
    
    def can_afford(self, cost: int) -> bool:
        """检查是否有足够额度"""
        return not self.is_expired and self.remaining_quota >= cost
    
    def deduct(self, amount: int) -> bool:
        """
        扣除额度（原子操作）
        Returns True if deduction successful, False otherwise
        """
        if not self.can_afford(amount):
            return False
        
        self.used_quota += amount
        self.remaining_quota -= amount
        self.total_generations += 1
        
        from datetime import datetime, timezone
        self.last_used_at = datetime.now(timezone.utc)
        
        return True
    
    def refund(self, amount: int):
        """退还额度（任务失败时调用）"""
        if amount <= 0:
            return
        
        self.used_quota = max(0, self.used_quota - amount)
        self.remaining_quota = min(self.total_quota, self.remaining_quota + amount)
        self.failed_generations += 1
    
    def record_success(self):
        """记录成功生成"""
        self.successful_generations += 1
