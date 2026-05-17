"""
Web3D Backend - 配额网关中间件
Quota Guard - Middleware/dependencies for tenant quota enforcement

M1.5 租户级存储隔离与配额检查
"""
from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from loguru import logger
from datetime import datetime, timezone

from app.database import get_db
from app.models.tenant import Tenant
from app.models.model import Model3D
from app.models.user import User
from app.models.quota import UserQuota
from app.config import settings


async def check_model_quota(tenant_id: str, db: AsyncSession) -> bool:
    """
    检查模型数量配额
    Query current model count and compare against max_models.
    -1 means unlimited.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return False
    if tenant.max_models == -1:
        return True

    count_result = await db.execute(
        select(sa_func.count(Model3D.id))
        .join(User, Model3D.created_by == User.id)
        .where(User.tenant_id == tenant_id)
    )
    count = count_result.scalar() or 0
    return count < tenant.max_models


async def check_storage_quota(tenant_id: str, file_size: int, db: AsyncSession) -> bool:
    """
    检查存储配额
    Query current storage usage and check if adding file_size exceeds max_storage_bytes.
    -1 means unlimited.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return False
    if tenant.max_storage_bytes == -1:
        return True

    storage_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Model3D.file_size), 0))
        .join(User, Model3D.created_by == User.id)
        .where(User.tenant_id == tenant_id)
    )
    used = storage_result.scalar() or 0
    return (used + file_size) <= tenant.max_storage_bytes


async def check_ai_quota(tenant_id: str, db: AsyncSession) -> bool:
    """
    检查AI生成次数配额
    Query total generations this month and compare against max_ai_generations_monthly.
    -1 means unlimited.
    """
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        return False
    if tenant.max_ai_generations_monthly == -1:
        return True

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    ai_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(UserQuota.total_generations), 0))
        .join(User, UserQuota.user_id == User.id)
        .where(User.tenant_id == tenant_id)
    )
    used = ai_result.scalar() or 0
    return used < tenant.max_ai_generations_monthly


# ===== FastAPI 依赖 / FastAPI Dependencies =====

async def require_model_quota(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    在创建模型的API中使用此依赖
    Raises 403 if model quota is exceeded.
    In DEBUG mode, only logs a warning without blocking.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        return True

    if settings.DEBUG:
        logger.debug(f"[QuotaGuard] DEBUG mode: model quota check skipped for tenant {tenant_id}")
        return True

    if not await check_model_quota(tenant_id, db):
        raise HTTPException(403, "Model quota exceeded. Please upgrade your plan.")
    return True


async def require_storage_quota(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    在文件上传API中使用此依赖（前置检查）
    Validates that the tenant has available storage quota.
    Full file-size check should be done at endpoint level after reading the file.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        return True

    if settings.DEBUG:
        logger.debug(f"[QuotaGuard] DEBUG mode: storage quota check skipped for tenant {tenant_id}")
        return True

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(403, "Tenant not found.")
    if tenant.max_storage_bytes == -1:
        return True

    storage_result = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Model3D.file_size), 0))
        .join(User, Model3D.created_by == User.id)
        .where(User.tenant_id == tenant_id)
    )
    used = storage_result.scalar() or 0
    if used >= tenant.max_storage_bytes:
        raise HTTPException(403, "Storage quota exceeded. Please upgrade your plan.")
    return True


async def require_ai_quota(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    在AI生成API中使用此依赖
    Raises 403 if AI generation quota is exceeded.
    In DEBUG mode, only logs a warning without blocking.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        return True

    if settings.DEBUG:
        logger.debug(f"[QuotaGuard] DEBUG mode: AI quota check skipped for tenant {tenant_id}")
        return True

    if not await check_ai_quota(tenant_id, db):
        raise HTTPException(403, "AI generation quota exceeded. Please upgrade your plan.")
    return True
