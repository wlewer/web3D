"""
Web3D Backend - 场景模板API路由
Scene Template API endpoints with full CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
import math
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.template import SceneTemplate, TemplateVersion
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse,
    TemplateReviewRequest,
    BatchReviewRequest,
    TemplateVersionCreate,
    TemplateVersionResponse,
)
from app.dependencies import get_current_user, require_role
from loguru import logger

router = APIRouter()


@router.get("/", response_model=TemplateListResponse)
async def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    is_featured: Optional[bool] = None,
    created_by: Optional[str] = None,
):
    """
    获取模板列表（分页+筛选）
    Get template list with pagination and filters
    """
    try:
        # 构建查询
        query = db.query(SceneTemplate)
        
        # 应用筛选条件
        if name:
            query = query.filter(SceneTemplate.name.ilike(f"%{name}%"))
        if category:
            query = query.filter(SceneTemplate.category == category)
        if status_filter:
            query = query.filter(SceneTemplate.status == status_filter)
        if is_featured is not None:
            query = query.filter(SceneTemplate.is_featured == is_featured)
        if created_by:
            query = query.filter(SceneTemplate.created_by == created_by)
        
        # 非管理员只能看到已发布的模板
        if current_user.role not in ["admin", "editor"]:
            query = query.filter(SceneTemplate.status == "published")
        
        # 获取总数
        total = query.count()
        
        # 分页
        offset = (page - 1) * page_size
        templates = query.order_by(SceneTemplate.created_at.desc()).offset(offset).limit(page_size).all()
        
        # 计算总页数
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        
        return TemplateListResponse(
            data=[TemplateResponse.model_validate(t) for t in templates],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"Failed to list templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list templates: {str(e)}"
        )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取单个模板详情
    Get single template details
    """
    try:
        template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # 权限检查：非管理员只能查看已发布的模板
        if current_user.role not in ["admin", "editor"] and template.status != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this template"
            )
        
        # 增加使用次数
        template.usage_count += 1
        db.commit()
        
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get template: {str(e)}"
        )


@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    创建新模板
    Create a new template
    """
    try:
        # 创建模板
        template = SceneTemplate(
            name=template_data.name,
            description=template_data.description,
            category=template_data.category.value,
            status="draft",
            thumbnail_url=template_data.thumbnail_url,
            spark_config=template_data.spark_config.dict(),
            tags=template_data.tags or [],
            version=template_data.version,
            is_featured=template_data.is_featured,
            created_by=current_user.id,
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        logger.info(f"Template created: {template.id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}"
        )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新模板
    Update template
    """
    try:
        template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # 权限检查：只有创建者或管理员可以编辑
        if template.created_by != current_user.id and current_user.role not in ["admin", "editor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to edit this template"
            )
        
        # 如果修改了 spark_config，创建版本历史
        if template_data.spark_config and template_data.spark_config != template.spark_config:
            version = TemplateVersion(
                template_id=template_id,
                version=template.version,
                spark_config=template.spark_config.copy(),
                change_log=f"Auto-saved before update at {datetime.now()}",
                created_by=current_user.id,
            )
            db.add(version)
        
        # 更新字段
        update_data = template_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "category" and value is not None:
                setattr(template, field, value.value)
            elif field == "status" and value is not None:
                setattr(template, field, value.value)
            else:
                setattr(template, field, value)
        
        db.commit()
        db.refresh(template)
        
        logger.info(f"Template updated: {template_id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update template: {str(e)}"
        )


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    删除模板
    Delete template
    """
    try:
        template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # 权限检查：只有创建者或管理员可以删除
        if template.created_by != current_user.id and current_user.role not in ["admin", "editor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this template"
            )
        
        db.delete(template)
        db.commit()
        
        logger.info(f"Template deleted: {template_id} by {current_user.username}")
        return {"message": "Template deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete template: {str(e)}"
        )


@router.post("/{template_id}/review", response_model=TemplateResponse)
async def review_template(
    template_id: str,
    review_data: TemplateReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """
    审核模板（仅管理员/编辑）
    Review template (admin/editor only)
    """
    try:
        template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # 更新状态
        template.status = review_data.status.value
        db.commit()
        db.refresh(template)
        
        logger.info(f"Template reviewed: {template_id} -> {review_data.status.value} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to review template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to review template: {str(e)}"
        )


@router.post("/batch-review")
async def batch_review_templates(
    review_data: BatchReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """
    批量审核模板
    Batch review templates
    """
    try:
        updated_count = 0
        for template_id in review_data.template_ids:
            template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
            if template:
                template.status = review_data.status.value
                updated_count += 1
        
        db.commit()
        
        logger.info(f"Batch reviewed {updated_count} templates by {current_user.username}")
        return {
            "message": f"Successfully reviewed {updated_count} templates",
            "updated_count": updated_count
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to batch review templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to batch review templates: {str(e)}"
        )


@router.post("/{template_id}/versions", response_model=TemplateVersionResponse)
async def create_template_version(
    template_id: str,
    version_data: TemplateVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    创建模板版本
    Create template version
    """
    try:
        template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # 权限检查
        if template.created_by != current_user.id and current_user.role not in ["admin", "editor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to create versions for this template"
            )
        
        # 创建版本
        version = TemplateVersion(
            template_id=template_id,
            version=version_data.version,
            spark_config=version_data.spark_config.dict(),
            change_log=version_data.change_log,
            created_by=current_user.id,
        )
        
        # 更新模板的当前配置和版本
        template.spark_config = version_data.spark_config.dict()
        template.version = version_data.version
        
        db.add(version)
        db.commit()
        db.refresh(version)
        
        logger.info(f"Template version created: {template_id} v{version_data.version}")
        return TemplateVersionResponse.model_validate(version)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create template version: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template version: {str(e)}"
        )


@router.get("/{template_id}/versions", response_model=List[TemplateVersionResponse])
async def list_template_versions(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取模板版本历史
    Get template version history
    """
    try:
        template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        versions = db.query(TemplateVersion).filter(
            TemplateVersion.template_id == template_id
        ).order_by(TemplateVersion.created_at.desc()).all()
        
        return [TemplateVersionResponse.model_validate(v) for v in versions]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list template versions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list template versions: {str(e)}"
        )


@router.post("/{template_id}/like")
async def like_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    点赞模板
    Like template
    """
    try:
        template = db.query(SceneTemplate).filter(SceneTemplate.id == template_id).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        template.like_count += 1
        db.commit()
        
        return {"message": "Template liked", "like_count": template.like_count}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to like template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to like template: {str(e)}"
        )
