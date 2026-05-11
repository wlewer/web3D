"""
用户使用统计服务
User usage statistics service - quota is managed directly by Tencent Cloud API
"""
from typing import Dict, Any
from datetime import datetime, timezone
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.quota import UserQuota

logger = logging.getLogger(__name__)


class QuotaService:
    """用户使用统计服务（额度由腾讯云API直接管理，本地仅做统计记录）"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create_quota(self, user_id: str) -> UserQuota:
        """
        获取或创建用户使用统计记录
        Get or create user usage stats record

        Args:
            user_id: 用户ID

        Returns:
            UserQuota对象
        """
        result = await self.db.execute(
            select(UserQuota).where(UserQuota.user_id == user_id)
        )
        quota = result.scalar_one_or_none()

        if not quota:
            quota = UserQuota(
                user_id=user_id,
                used_quota=0
            )

            self.db.add(quota)
            await self.db.commit()
            await self.db.refresh(quota)

            logger.info(f"[QuotaService] Created usage stats for user {user_id}")

        return quota

    async def get_usage_stats(self, user_id: str) -> Dict[str, Any]:
        """
        查询用户使用统计
        Get user usage statistics

        Returns:
            包含使用统计信息的字典
        """
        quota = await self.get_or_create_quota(user_id)

        return {
            'success': True,
            'user_id': user_id,
            'used_quota': quota.used_quota or 0,
            'total_generations': quota.total_generations or 0,
            'successful_generations': quota.successful_generations or 0,
            'failed_generations': quota.failed_generations or 0,
            'last_used_at': quota.last_used_at.isoformat() if quota.last_used_at else None
        }

    async def record_api_call(self, user_id: str, success: bool = True):
        """
        记录一次API调用（API调用后调用，仅用于统计）

        Args:
            user_id: 用户ID
            success: API调用是否成功
        """
        try:
            quota = await self.get_or_create_quota(user_id)

            quota.record_usage()
            if success:
                quota.record_success()
            else:
                quota.record_failure()

            await self.db.commit()

            logger.info(
                f"[QuotaService] Recorded API call for user {user_id}: "
                f"success={success}, total_used={quota.used_quota}"
            )

            return True

        except Exception as e:
            await self.db.rollback()
            logger.error(f"[QuotaService] Error recording API call: {e}", exc_info=True)
            return False
