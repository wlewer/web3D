"""
Web3D Backend - 租户管理API路由
Tenant Management API endpoints - Platform admin only
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from typing import Optional
import math

from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant, TenantConfig
from app.schemas.tenant import (
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    TenantListResponse,
    TenantConfigUpdate,
    TenantConfigResponse,
    TenantPlanType,
    TenantStatus,
)
from app.dependencies import get_current_user
from app.services.tenant_service import TenantService
from loguru import logger

router = APIRouter()


# ==================== 权限控制 ====================

async def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    验证当前用户是平台管理员
    Platform admin = role=admin AND tenant_id is NULL
    
    租户管理API仅对平台管理员开放
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform administrators can manage tenants"
        )
    if current_user.tenant_id is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform-level administrators (not bound to any tenant) can manage tenants"
        )
    return current_user


# ==================== 租户CRUD ====================

@router.post("/", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    data: TenantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    M1.3.1 创建租户
    Create a new tenant with default config and quotas
    
    - 自动生成slug（如未提供则从name转换）
    - 自动生成api_key
    - 创建默认TenantConfig
    - 根据套餐创建默认配额
    """
    try:
        tenant = await TenantService.create_tenant(
            db=db,
            data=data,
            owner_id=current_user.id,
        )
        return TenantResponse.model_validate(tenant)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[TenantsAPI] Failed to create tenant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tenant: {str(e)}"
        )


@router.get("/", response_model=TenantListResponse)
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词（名称/域名）"),
    status_filter: Optional[str] = Query(None, alias="status", description="状态筛选"),
    sort_by: Optional[str] = Query("created_at", description="排序字段"),
    sort_order: Optional[str] = Query("desc", description="排序方向 asc/desc"),
):
    """
    M1.3.2 获取租户列表
    List tenants with pagination, search, status filter and sorting
    """
    try:
        # 构建查询
        query = select(Tenant)
        
        # 搜索条件：名称或域名
        if search:
            query = query.where(
                (Tenant.name.ilike(f"%{search}%")) |
                (Tenant.domain.ilike(f"%{search}%")) |
                (Tenant.slug.ilike(f"%{search}%"))
            )
        
        # 状态筛选
        if status_filter:
            query = query.where(Tenant.status == status_filter)
        
        # 获取总数
        count_query = select(sa_func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # 排序
        sort_column = getattr(Tenant, sort_by, Tenant.created_at)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        
        # 分页
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await db.execute(query)
        tenants = result.scalars().all()
        
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return TenantListResponse(
            data=[TenantResponse.model_validate(t) for t in tenants],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"[TenantsAPI] Failed to list tenants: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tenants: {str(e)}"
        )


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    M1.3.3 获取租户详情（含config信息）
    Get tenant details with config
    """
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # 使用 model_validate 并显式包含 config 数据
    response_data = TenantResponse.model_validate(tenant)
    return response_data


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    data: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    M1.3.4 更新租户
    Partial update tenant information
    """
    try:
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # 更新字段（仅更新提供的字段）
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            # 枚举类型转换
            if field == "plan_type" and value is not None:
                value = value.value if isinstance(value, TenantPlanType) else value
            elif field == "status" and value is not None:
                value = value.value if isinstance(value, TenantStatus) else value
            setattr(tenant, field, value)
        
        await db.flush()
        await db.refresh(tenant)
        
        logger.info(f"[TenantsAPI] Tenant updated: {tenant_id} by {current_user.username}")
        return TenantResponse.model_validate(tenant)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TenantsAPI] Failed to update tenant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant: {str(e)}"
        )


@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    M1.3.5 删除/停用租户（软删除：status改为cancelled）
    Soft-delete tenant by setting status to cancelled
    """
    try:
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        if tenant.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant is already cancelled"
            )
        
        # 软删除：修改状态
        tenant.status = "cancelled"
        await db.flush()
        
        logger.info(f"[TenantsAPI] Tenant cancelled: {tenant_id} by {current_user.username}")
        return {"message": "Tenant cancelled successfully", "tenant_id": tenant_id, "status": "cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TenantsAPI] Failed to delete tenant: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tenant: {str(e)}"
        )


# ==================== 租户配置 ====================

@router.put("/{tenant_id}/config", response_model=TenantConfigResponse)
async def update_tenant_config(
    tenant_id: str,
    data: TenantConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    M1.3.6 更新租户配置
    Update tenant theme/SEO/feature toggles
    """
    try:
        # 验证租户存在
        tenant_result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = tenant_result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # 获取或创建配置
        config_result = await db.execute(
            select(TenantConfig).where(TenantConfig.tenant_id == tenant_id)
        )
        config = config_result.scalar_one_or_none()
        
        if not config:
            # 如果配置不存在，创建默认配置
            config = TenantConfig(tenant_id=tenant_id)
            db.add(config)
            await db.flush()
        
        # 更新配置字段
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(config, field, value)
        
        await db.flush()
        await db.refresh(config)
        
        logger.info(f"[TenantsAPI] Tenant config updated: {tenant_id} by {current_user.username}")
        return TenantConfigResponse.model_validate(config)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TenantsAPI] Failed to update tenant config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant config: {str(e)}"
        )


# ==================== 租户用量 ====================

@router.get("/{tenant_id}/usage")
async def get_tenant_usage(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    M1.3.7 获取租户用量
    Get tenant current usage statistics:
    - models_count / max_models
    - storage_used / max_storage_bytes
    - ai_generations_this_month / max_ai_generations_monthly
    - pages_count / max_pages
    """
    try:
        # 验证租户存在
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        usage = await TenantService.get_tenant_usage(db=db, tenant_id=tenant_id)
        return usage
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TenantsAPI] Failed to get tenant usage: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant usage: {str(e)}"
        )


# ==================== 套餐管理 ====================

@router.post("/{tenant_id}/upgrade")
async def upgrade_tenant_plan(
    tenant_id: str,
    plan_type: str = Query(..., description="目标套餐类型: free/professional/enterprise"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_platform_admin),
):
    """
    M1.3.14 切换套餐
    Change tenant plan type and update quota limits accordingly
    """
    try:
        # 验证租户存在
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # 执行套餐变更
        tenant = await TenantService.upgrade_plan(
            db=db,
            tenant_id=tenant_id,
            new_plan=plan_type,
        )
        
        logger.info(
            f"[TenantsAPI] Tenant plan changed: {tenant_id} -> {plan_type} "
            f"by {current_user.username}"
        )
        return TenantResponse.model_validate(tenant)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TenantsAPI] Failed to upgrade tenant plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upgrade tenant plan: {str(e)}"
        )
