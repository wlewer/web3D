"""
Web3D Backend - 3D模型API路由
3D Model API endpoints with full CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import math
import os
import uuid
import urllib.parse
from pathlib import Path
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.model import Model3D
from app.schemas.model import (
    ModelCreate,
    ModelUpdate,
    ModelResponse,
    ModelListResponse,
    ModelReviewRequest,
    BatchReviewRequest,
    ModelStatus,
)
from app.dependencies import get_current_user, require_role
from app.core.quota_guard import require_model_quota, require_storage_quota
from app.config import settings
from loguru import logger


# 全局版本号（每次发布更新时递增）
_homepage_version: int = int(datetime.utcnow().timestamp())


router = APIRouter()


@router.get("/public", response_model=ModelListResponse)
async def list_public_models(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    category: Optional[str] = None,
    show_on_homepage: Optional[bool] = Query(None),
    show_in_gallery: Optional[bool] = Query(None),
):
    """
    公开模型列表（无需登录，仅显示已审核模型）
    Public model list (no auth required, approved models only)
    """
    try:
        query = select(Model3D).where(Model3D.status == "approved")
        
        if category:
            query = query.where(Model3D.category == category)
        
        if show_on_homepage is not None:
            query = query.where(Model3D.show_on_homepage == show_on_homepage)
        
        if show_in_gallery is not None:
            query = query.where(Model3D.show_in_gallery == show_in_gallery)
        
        count_query = select(sa_func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        offset = (page - 1) * page_size
        query = query.order_by(Model3D.created_at.desc()).offset(offset).limit(page_size)
        result = await db.execute(query)
        models = result.scalars().all()
        
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return ModelListResponse(
            data=[ModelResponse.model_validate(m) for m in models],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"Failed to list public models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list public models: {str(e)}"
        )


@router.get("/homepage", response_model=ModelListResponse)
async def list_homepage_models(
    db: AsyncSession = Depends(get_db),
):
    """
    首页模型列表（无需登录，仅返回 show_on_homepage=true 且审核通过的模型）
    按 sort_order 降序排列
    Homepage model list (no auth, show_on_homepage & approved only)
    """
    try:
        query = select(Model3D).where(
            Model3D.status == "approved",
            Model3D.show_on_homepage == True,
        ).order_by(Model3D.sort_order.desc())
        
        count_query = select(sa_func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        result = await db.execute(query)
        models = result.scalars().all()
        
        return ModelListResponse(
            data=[ModelResponse.model_validate(m) for m in models],
            total=total,
            page=1,
            page_size=total or 50,
            total_pages=1 if total > 0 else 0,
        )
    except Exception as e:
        logger.error(f"Failed to list homepage models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list homepage models: {str(e)}"
        )


@router.get("/homepage/version")
async def get_homepage_version():
    """
    获取首页配置版本号（无需登录）
    客户端用于校验缓存是否过期，后台发布时自动更新版本号
    GET homepage cache version (no auth)
    """
    global _homepage_version
    return {"version": _homepage_version}


@router.post("/homepage/publish")
async def publish_homepage(
    current_user: User = Depends(require_role("admin")),
):
    """
    发布首页配置（管理员）
    更新版本号，客户端下次访问时将自动清除旧缓存
    Publish homepage configuration (admin only)
    """
    global _homepage_version
    _homepage_version = int(datetime.utcnow().timestamp())
    logger.info(f"Homepage published by {current_user.username}, version={_homepage_version}")
    return {"version": _homepage_version, "message": "首页配置已发布"}


@router.get("/", response_model=ModelListResponse)
async def list_models(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    format_filter: Optional[str] = Query(None, alias="format"),
    created_by: Optional[str] = None,
):
    """
    获取模型列表（分页+筛选）
    Get model list with pagination and filters
    """
    try:
        # 构建查询
        query = select(Model3D)
        
        # 应用筛选条件
        if name:
            query = query.where(Model3D.name.ilike(f"%{name}%"))
        if category:
            query = query.where(Model3D.category == category)
        if status_filter:
            query = query.where(Model3D.status == status_filter)
        if format_filter:
            query = query.where(Model3D.format == format_filter)
        if created_by:
            query = query.where(Model3D.created_by == created_by)
        
        # 非管理员只能看到已审核通过的模型
        if current_user.role not in ["admin", "editor"]:
            query = query.where(Model3D.status == "approved")
        
        # 获取总数
        count_query = select(sa_func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # 分页 - 默认按 sort_order 降序排列（支持拖拽持久化），同权重按创建时间降序
        offset = (page - 1) * page_size
        query = query.order_by(Model3D.sort_order.desc(), Model3D.created_at.desc()).offset(offset).limit(page_size)
        result = await db.execute(query)
        models = result.scalars().all()
        
        # 计算总页数
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return ModelListResponse(
            data=[ModelResponse.model_validate(model) for model in models],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"Failed to list models: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(e)}"
        )


@router.get("/stats")
async def get_model_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    获取模型统计信息
    Get model statistics
    """
    # 使用异步查询
    total_result = await db.execute(
        select(func.count(Model3D.id))
    )
    total = total_result.scalar() or 0
    
    pending_result = await db.execute(
        select(func.count(Model3D.id)).where(Model3D.status == "pending")
    )
    pending = pending_result.scalar() or 0
    
    approved_result = await db.execute(
        select(func.count(Model3D.id)).where(Model3D.status == "approved")
    )
    approved = approved_result.scalar() or 0
    
    rejected_result = await db.execute(
        select(func.count(Model3D.id)).where(Model3D.status == "rejected")
    )
    rejected = rejected_result.scalar() or 0
    
    archived_result = await db.execute(
        select(func.count(Model3D.id)).where(Model3D.status == "archived")
    )
    archived = archived_result.scalar() or 0
    
    disabled_result = await db.execute(
        select(func.count(Model3D.id)).where(Model3D.status == "disabled")
    )
    disabled = disabled_result.scalar() or 0
    
    # 按分类统计
    category_result = await db.execute(
        select(Model3D.category, func.count(Model3D.id)).group_by(Model3D.category)
    )
    by_category = {cat: count for cat, count in category_result.all()}
    
    # 总文件大小
    size_result = await db.execute(
        select(func.sum(Model3D.file_size))
    )
    total_size = size_result.scalar() or 0
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "archived": archived,
        "disabled": disabled,
        "byCategory": by_category,
        "totalSize": total_size,
    }


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取单个模型详情
    Get single model details
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    # 权限检查：非管理员只能查看已审核通过的模型
    if current_user.role not in ["admin", "editor"] and model.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view this model"
        )
    
    return ModelResponse.model_validate(model)


@router.post("/", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_model_quota),
):
    """
    创建新模型
    Create new 3D model
    """
    # 写入租户ID（如果当前用户关联了租户）
    tenant_id = current_user.tenant_id
    new_model = Model3D(
        name=model_data.name,
        description=model_data.description,
        category=model_data.category.value,
        format=model_data.format.value,
        model_url=model_data.model_url,
        thumbnail_url=model_data.thumbnail_url,
        file_size=model_data.file_size,
        polygon_count=model_data.polygon_count,
        texture_count=model_data.texture_count,
        tags=model_data.tags,
        metadata_json=model_data.metadata_json,
        created_by=current_user.id,
        tenant_id=tenant_id,  # 租户隔离
        status="pending",  # 新建模型默认为待审核状态
    )
    
    db.add(new_model)
    await db.flush()
    await db.refresh(new_model)
    # 不手动commit，由 get_db 依赖自动处理
    
    logger.info(f"Model created: {new_model.name} by {current_user.username}")
    
    return ModelResponse.model_validate(new_model)


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    model_data: ModelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新模型信息
    Update model information
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    # 权限检查：只能修改自己创建的模型，除非是管理员或编辑者
    if (
        model.created_by != current_user.id
        and current_user.role not in ["admin", "editor"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    # 更新字段
    update_data = model_data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(model, key, value)
    
    await db.flush()
    await db.refresh(model)
    
    logger.info(f"Model updated: {model.name} by {current_user.username}")
    
    return ModelResponse.model_validate(model)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    删除模型
    Delete 3D model
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    # 权限检查：只能删除自己创建的模型，除非是管理员
    if model.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    await db.delete(model)
    
    logger.info(f"Model deleted: {model.name} by {current_user.username}")
    
    return None


@router.post("/{model_id}/review", response_model=ModelResponse)
async def review_model(
    model_id: str,
    review_data: ModelReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "editor")),
):
    """
    审核模型（仅管理员和编辑者）
    Review model (admin and editor only)
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    # 更新审核信息
    model.status = review_data.status.value
    model.reviewed_by = current_user.id
    model.reviewed_at = datetime.utcnow()
    
    if review_data.status == ModelStatus.REJECTED and review_data.rejection_reason:
        model.rejection_reason = review_data.rejection_reason
    elif review_data.status != ModelStatus.REJECTED:
        model.rejection_reason = None
    
    await db.flush()
    await db.refresh(model)
    
    logger.info(f"Model reviewed: {model.name} -> {model.status} by {current_user.username}")
    
    return ModelResponse.model_validate(model)


@router.post("/batch-delete")
async def batch_delete_models(
    ids: list[str],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    批量删除模型（管理员）
    Batch delete models (admin only)
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id.in_(ids))
    )
    models = result.scalars().all()

    if not models:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No models found with provided IDs"
        )

    for model in models:
        # 删除模型文件（如果是 models/ 目录下的）
        old_url = model.model_url or ''
        if old_url.startswith('/static-models/'):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
            models_dir = os.path.join(project_root, "models")
            old_filename = urllib.parse.unquote(old_url[len('/static-models/'):])
            old_path = os.path.join(models_dir, old_filename)
            if os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except Exception as e:
                    logger.warning(f"Failed to remove file {old_path}: {e}")

        await db.delete(model)

    logger.info(f"Batch deleted {len(models)} models by {current_user.username}")

    return {"message": f"成功删除 {len(models)} 个模型"}


@router.post("/batch-review")
async def batch_review(
    review_data: BatchReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "editor")),
):
    """
    批量审核模型
    Batch review models
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id.in_(review_data.ids))
    )
    models = result.scalars().all()
    
    if not models:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No models found with provided IDs"
        )
    
    for model in models:
        model.status = review_data.status.value
        model.reviewed_by = current_user.id
        model.reviewed_at = datetime.utcnow()
        
        if review_data.status == ModelStatus.REJECTED and review_data.rejection_reason:
            model.rejection_reason = review_data.rejection_reason
        elif review_data.status != ModelStatus.REJECTED:
            model.rejection_reason = None
    
    
    logger.info(f"Batch review performed on {len(models)} models by {current_user.username}")
    
    return {"message": f"Successfully reviewed {len(models)} models"}


@router.patch("/{model_id}/archive")
async def archive_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    归档模型（仅管理员）
    Archive model (admin only)
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    model.status = "archived"
    
    logger.info(f"Model archived: {model.name} by {current_user.username}")
    
    return {"message": "Model archived successfully"}


@router.patch("/{model_id}/toggle-visibility")
async def toggle_model_visibility(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    切换模型可见性（启用/禁用）
    只有已审核通过的模型可以切换
    """
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    if model.status == "approved":
        model.status = "disabled"
    elif model.status == "disabled":
        model.status = "approved"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只能切换启用/禁用状态的模型（当前状态：{model.status}）"
        )
    
    model.reviewed_by = current_user.id
    model.reviewed_at = datetime.utcnow()
    
    logger.info(f"Model visibility toggled: {model.name} -> {model.status} by {current_user.username}")
    
    return {"message": "可见性已切换", "status": model.status}


@router.post("/{model_id}/file", response_model=ModelResponse)
async def replace_model_file(
    model_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    替换模型文件（管理员）
    上传新文件替换模型的现有文件
    Replace model file (admin only)
    """
    # 1. 查找模型
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    # 2. 校验文件扩展名
    VALID_EXTENSIONS = {'.glb', '.gltf', '.ply', '.spz', '.obj', '.fbx', '.stl', '.splat'}
    original_filename = file.filename or 'model.bin'
    ext = os.path.splitext(original_filename)[1].lower()

    if ext not in VALID_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的模型格式: {ext}，支持的格式: {', '.join(VALID_EXTENSIONS)}"
        )

    # 3. 确定保存路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
    models_dir = os.path.join(project_root, "models")
    os.makedirs(models_dir, exist_ok=True)

    # 4. 生成唯一文件名（保留模型ID前缀防止冲突）
    safe_filename = f"{model.id[:8]}_{original_filename}"

    # 5. 保存新文件
    try:
        content = await file.read()
        file_path = os.path.join(models_dir, safe_filename)
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"File replaced for model {model.id}: {file_path} ({len(content)} bytes)")
    except Exception as e:
        logger.error(f"Failed to save replacement file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件保存失败: {str(e)}"
        )

    # 6. 删除旧文件（如果是 models/ 目录下的）
    old_url = model.model_url or ''
    if old_url.startswith('/static-models/'):
        old_filename = urllib.parse.unquote(old_url[len('/static-models/'):])
        old_path = os.path.join(models_dir, old_filename)
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
                logger.info(f"Old file removed: {old_path}")
            except Exception as e:
                logger.warning(f"Failed to remove old file {old_path}: {e}")

    # 7. 更新模型记录
    model.model_url = f"/static-models/{urllib.parse.quote(safe_filename)}"
    model.file_size = len(content)
    model.format = ext.lstrip('.')

    await db.flush()
    await db.refresh(model)

    logger.info(f"Model file replaced: {model.name} by {current_user.username}")

    return ModelResponse.model_validate(model)


@router.post("/upload", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def upload_model(
    request: Request,
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
    icon: Optional[str] = Form(None),
    color_hex: Optional[str] = Form(None),
    show_on_homepage: Optional[bool] = Form(None),
    sort_order: Optional[int] = Form(None),
    metadata_json: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
    _: bool = Depends(require_model_quota),
):
    """
    上传模型文件（管理员）
    支持格式: glb, gltf, ply, spz, obj, fbx, stl, splat
    文件保存到 models/ 目录，并自动创建数据库记录（状态: approved）
    """
    # 租户ID
    tenant_id = current_user.tenant_id or getattr(request.state, "tenant_id", None)
    # 1. 校验文件扩展名
    VALID_EXTENSIONS = {'.glb', '.gltf', '.ply', '.spz', '.obj', '.fbx', '.stl', '.splat'}
    original_filename = file.filename or 'model.bin'
    ext = os.path.splitext(original_filename)[1].lower()
    
    if ext not in VALID_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的模型格式: {ext}，支持的格式: {', '.join(VALID_EXTENSIONS)}"
        )
    
    # 2. 确定 models/ 目录路径
    # api/v1/models.py -> api -> app -> backend -> project root
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
    models_dir = os.path.join(project_root, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # 3. 处理重名文件（加数字后缀）
    base_name = os.path.splitext(original_filename)[0]
    safe_filename = original_filename
    counter = 1
    while os.path.exists(os.path.join(models_dir, safe_filename)):
        safe_filename = f"{base_name}_{counter}{ext}"
        counter += 1
    
    # 4. 读取并保存文件到磁盘
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件读取失败: {str(e)}"
        )

    # 4.1 租户存储配额检查（DEBUG模式跳过）
    if tenant_id and not settings.DEBUG:
        from app.core.quota_guard import check_storage_quota
        if not await check_storage_quota(tenant_id, len(content), db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Storage quota exceeded. Please upgrade your plan."
            )

    try:
        file_path = os.path.join(models_dir, safe_filename)
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"File saved: {file_path} ({len(content)} bytes)")
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件保存失败: {str(e)}"
        )
    
    # 5. 确定模型格式
    fmt = ext.lstrip('.')
    
    # 6. 确定分类（前端可选，默认 other）
    valid_categories = [
        'character', 'scene', 'prop', 'vehicle', 'box',
        'animation', 'nature', 'animal', 'architecture',
        'food', 'industry', 'art', 'other'
    ]
    cat = category if category and category in valid_categories else 'other'
    
    # 7. 生成显示名称（美化文件名）作为 fallback
    name_fallback = base_name.replace('-', ' ').replace('_', ' ').replace('.', ' ')
    name_fallback = ' '.join(w.capitalize() for w in name_fallback.split() if w)
    if not name_fallback:
        name_fallback = base_name
    
    # 8. 构建模型访问 URL
    model_url = f"/static-models/{urllib.parse.quote(safe_filename)}"
    
    # 9. 创建数据库记录
    new_model = Model3D(
        id=str(uuid.uuid4()),
        name=display_name or name_fallback,
        description=f"管理员上传: {safe_filename}",
        category=cat,
        status="approved",
        model_url=model_url,
        format=fmt,
        file_size=len(content),
        created_by=current_user.id,
        tenant_id=tenant_id,  # 租户隔离
        reviewed_by=current_user.id,
        reviewed_at=datetime.utcnow(),
        tags=['upload'],
        display_name=display_name,
        icon=icon,
        color_hex=color_hex,
        show_on_homepage=show_on_homepage if show_on_homepage is not None else False,
        sort_order=sort_order if sort_order is not None else 0,
        model_url_fallback=None,
    )

    if metadata_json:
        try:
            import json
            new_model.metadata_json = json.loads(metadata_json)
        except json.JSONDecodeError:
            logger.warning(f"Invalid metadata_json: {metadata_json}")
    
    db.add(new_model)
    await db.flush()
    await db.refresh(new_model)
    
    logger.info(f"Model uploaded and saved: {safe_filename} ({fmt}) by {current_user.username}")
    
    return ModelResponse.model_validate(new_model)
