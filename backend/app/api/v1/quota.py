"""
用户使用统计API
User usage statistics API endpoints (quota is managed by Tencent Cloud API)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.database import get_db
from app.services.quota_service import QuotaService
from app.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quota", tags=["quota"])


@router.get("/balance")
async def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    查询用户使用统计
    Get user usage statistics

    注意：额度由腾讯云API直接管理，本地仅记录调用次数供参考。
    """
    try:
        quota_service = QuotaService(db)
        stats = await quota_service.get_usage_stats(current_user.id)

        return {
            'success': True,
            'data': stats
        }

    except Exception as e:
        logger.error(f"[Quota API] Error getting usage stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f'系统错误：{str(e)}')
