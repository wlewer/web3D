"""
Web3D Backend - 页面搭建器API路由
Page Builder API endpoints - Page CRUD, draft save, publish, versioning and rollback
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.page import Page
from app.schemas.page import (
    PageCreate,
    PageUpdate,
    PageDraftSave,
    PagePublish,
    PageResponse,
    PageListResponse,
    PageVersionResponse,
)
from app.dependencies import get_current_user
from app.services.page_service import PageService
from loguru import logger

router = APIRouter()


@router.post("/", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(
    data: PageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    创建页面
    Create a new page builder page
    """
    try:
        page = await PageService.create_page(
            db=db,
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            data=data,
        )
        return PageResponse.model_validate(page)
    except Exception as e:
        logger.error(f"[PagesAPI] Failed to create page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create page: {str(e)}"
        )


@router.get("/", response_model=PageListResponse)
async def list_pages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(20, ge=1, le=100, description="返回数量上限"),
    status_filter: Optional[str] = Query(None, alias="status", description="状态筛选: draft/published"),
    search: Optional[str] = Query(None, description="搜索关键词"),
):
    """
    获取页面列表（租户隔离）
    List pages with tenant isolation, pagination and filters
    """
    try:
        pages, total = await PageService.get_pages(
            db=db,
            tenant_id=current_user.tenant_id,
            skip=skip,
            limit=limit,
            status=status_filter,
            search=search,
        )
        return PageListResponse(
            data=[PageResponse.model_validate(p) for p in pages],
            total=total,
            skip=skip,
            limit=limit,
        )
    except Exception as e:
        logger.error(f"[PagesAPI] Failed to list pages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list pages: {str(e)}"
        )


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取页面详情
    Get page details by ID
    """
    page = await PageService.get_page(db=db, page_id=page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found"
        )

    # 租户隔离：非管理员只能查看自己租户的页面
    if current_user.tenant_id and page.tenant_id and page.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: page belongs to another tenant"
        )

    return PageResponse.model_validate(page)


@router.put("/{page_id}/draft", response_model=PageResponse)
async def save_draft(
    page_id: str,
    data: PageDraftSave,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    保存草稿（自动保存）
    Save page draft schema_json without publishing
    """
    page = await PageService.get_page(db=db, page_id=page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found"
        )

    # 租户隔离检查
    if current_user.tenant_id and page.tenant_id and page.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: page belongs to another tenant"
        )

    try:
        page = await PageService.save_draft(db=db, page=page, schema_json=data.schema_json)
        return PageResponse.model_validate(page)
    except Exception as e:
        logger.error(f"[PagesAPI] Failed to save draft: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save draft: {str(e)}"
        )


@router.post("/{page_id}/publish", response_model=PageResponse)
async def publish_page(
    page_id: str,
    data: PagePublish = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    发布页面
    Publish page: creates a new version and updates published_schema_json
    """
    page = await PageService.get_page(db=db, page_id=page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found"
        )

    # 租户隔离检查
    if current_user.tenant_id and page.tenant_id and page.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: page belongs to another tenant"
        )

    try:
        change_summary = data.change_summary if data else None
        page = await PageService.publish_page(
            db=db,
            page=page,
            user_id=current_user.id,
            change_summary=change_summary,
        )
        return PageResponse.model_validate(page)
    except Exception as e:
        logger.error(f"[PagesAPI] Failed to publish page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish page: {str(e)}"
        )


@router.get("/{page_id}/versions", response_model=list[PageVersionResponse])
async def get_versions(
    page_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取页面版本历史
    Get version history for a page
    """
    page = await PageService.get_page(db=db, page_id=page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found"
        )

    # 租户隔离检查
    if current_user.tenant_id and page.tenant_id and page.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: page belongs to another tenant"
        )

    versions = await PageService.get_versions(db=db, page_id=page_id)
    return [PageVersionResponse.model_validate(v) for v in versions]


@router.post("/{page_id}/rollback/{version}", response_model=PageResponse)
async def rollback_to_version(
    page_id: str,
    version: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    回滚到指定版本
    Rollback page to a specific version: restores schema_json and creates new version
    """
    page = await PageService.get_page(db=db, page_id=page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found"
        )

    # 租户隔离检查
    if current_user.tenant_id and page.tenant_id and page.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: page belongs to another tenant"
        )

    try:
        page = await PageService.rollback_to_version(
            db=db,
            page=page,
            version_number=version,
            user_id=current_user.id,
        )
        return PageResponse.model_validate(page)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[PagesAPI] Failed to rollback page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rollback page: {str(e)}"
        )


@router.delete("/{page_id}")
async def delete_page(
    page_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    删除页面（软删除：status改为archived）
    Soft-delete page by setting status to archived
    """
    page = await PageService.get_page(db=db, page_id=page_id)
    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Page not found"
        )

    # 租户隔离检查
    if current_user.tenant_id and page.tenant_id and page.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: page belongs to another tenant"
        )

    try:
        page = await PageService.delete_page(db=db, page=page)
        return {"message": "Page archived successfully", "page_id": page_id, "status": "archived"}
    except Exception as e:
        logger.error(f"[PagesAPI] Failed to delete page: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete page: {str(e)}"
        )
