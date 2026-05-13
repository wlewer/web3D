"""
Web3D Backend - 系统设置API路由
System Settings API endpoints - global render defaults, etc.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict
from datetime import datetime

from app.database import get_db
from app.models.settings import HomepageSettings
from app.models.user import User
from app.dependencies import require_role
from loguru import logger

router = APIRouter()

RENDER_DEFAULTS_KEY = "render_defaults"


@router.get("/render-defaults")
async def get_render_defaults(
    db: AsyncSession = Depends(get_db),
):
    """
    获取全局渲染默认配置
    Get global render defaults

    无需登录认证，首页和admin页面都需要读取
    """
    try:
        result = await db.execute(
            select(HomepageSettings).where(HomepageSettings.key == RENDER_DEFAULTS_KEY)
        )
        setting = result.scalar_one_or_none()

        if setting is None:
            # 未有配置时返回空对象，前端使用组件默认值
            return {"key": RENDER_DEFAULTS_KEY, "value": {}}

        return {"key": setting.key, "value": setting.value}
    except Exception as e:
        logger.error(f"Failed to get render defaults: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get render defaults: {str(e)}"
        )


@router.put("/render-defaults")
async def update_render_defaults(
    body: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    更新全局渲染默认配置（管理员）
    Update global render defaults (admin only)

    Body: {"value": { ...RenderConfig }}
    """
    try:
        value = body.get("value")
        if value is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing 'value' field in request body"
            )

        # 查询或创建
        result = await db.execute(
            select(HomepageSettings).where(HomepageSettings.key == RENDER_DEFAULTS_KEY)
        )
        setting = result.scalar_one_or_none()

        if setting is None:
            setting = HomepageSettings(
                key=RENDER_DEFAULTS_KEY,
                value=value,
            )
            db.add(setting)
        else:
            setting.value = value
            setting.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(setting)

        logger.info(f"Render defaults updated by {current_user.username}")
        return {"key": setting.key, "value": setting.value, "updated_at": str(setting.updated_at)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update render defaults: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update render defaults: {str(e)}"
        )
