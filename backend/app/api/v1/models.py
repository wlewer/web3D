"""
Web3D Backend - 3D模型API路由
3D Model API endpoints with full CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import math
import os
import uuid
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
from loguru import logger

router = APIRouter()


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
        
        # 分页
        offset = (page - 1) * page_size
        query = query.order_by(Model3D.created_at.desc()).offset(offset).limit(page_size)
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
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    
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
):
    """
    创建新模型
    Create new 3D model
    """
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
        status="pending",  # 新建模型默认为待审核状态
    )
    
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    
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
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    
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
    
    db.commit()
    db.refresh(model)
    
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
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    
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
    
    db.delete(model)
    db.commit()
    
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
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    
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
    
    db.commit()
    db.refresh(model)
    
    logger.info(f"Model reviewed: {model.name} -> {model.status} by {current_user.username}")
    
    return ModelResponse.model_validate(model)


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
    models = db.query(Model3D).filter(Model3D.id.in_(review_data.ids)).all()
    
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
    
    db.commit()
    
    logger.info(f"Batch review performed on {len(models)} models by {current_user.username}")
    
    return {"message": f"Successfully reviewed {len(models)} models"}


@router.get("/stats")
async def get_model_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """
    获取模型统计信息
    Get model statistics
    """
    total = db.query(func.count(Model3D.id)).scalar()
    pending = db.query(func.count(Model3D.id)).filter(Model3D.status == "pending").scalar()
    approved = db.query(func.count(Model3D.id)).filter(Model3D.status == "approved").scalar()
    rejected = db.query(func.count(Model3D.id)).filter(Model3D.status == "rejected").scalar()
    archived = db.query(func.count(Model3D.id)).filter(Model3D.status == "archived").scalar()
    
    # 按分类统计
    categories = db.query(Model3D.category, func.count(Model3D.id)).group_by(Model3D.category).all()
    by_category = {cat: count for cat, count in categories}
    
    # 总文件大小
    total_size = db.query(func.sum(Model3D.file_size)).scalar() or 0
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "archived": archived,
        "byCategory": by_category,
        "totalSize": total_size,
    }


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
    model = db.query(Model3D).filter(Model3D.id == model_id).first()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    model.status = "archived"
    db.commit()
    
    logger.info(f"Model archived: {model.name} by {current_user.username}")
    
    return {"message": "Model archived successfully"}
