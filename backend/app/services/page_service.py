"""
Web3D Backend - 页面搭建器业务逻辑层
Page Builder service - Business logic for page CRUD, versioning and publishing
"""
import re
import unicodedata
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from loguru import logger

from app.models.page import Page, PageVersion
from app.schemas.page import PageCreate


def generate_slug(title: str) -> str:
    """
    从页面标题生成URL友好的slug
    Generate URL-friendly slug from page title
    """
    name = title.strip().lower()
    name = name.replace(" ", "-")
    name = unicodedata.normalize("NFD", name)
    name = "".join(ch for ch in name if unicodedata.category(ch) != "Mn")
    name = re.sub(r"[^a-z0-9\-]", "", name)
    name = re.sub(r"-{2,}", "-", name)
    name = name.strip("-")
    # 如果结果为空（如纯中文标题），用 page- 前缀+时间戳兜底
    if not name:
        import time
        name = f"page-{int(time.time())}"
    return name[:200]


class PageService:
    """页面搭建器业务逻辑"""

    @staticmethod
    async def create_page(
        db: AsyncSession,
        tenant_id: Optional[str],
        user_id: Optional[str],
        data: PageCreate,
    ) -> Page:
        """
        创建页面
        Create a new page
        
        Args:
            db: 异步数据库会话
            tenant_id: 租户ID（用于租户隔离）
            user_id: 创建者用户ID
            data: 创建页面请求数据
        
        Returns:
            Page: 创建的页面对象
        """
        # 1. 生成slug（如果未提供则自动生成）
        slug = data.slug or generate_slug(data.title)

        # 2. 确保slug在租户范围内唯一
        query = select(Page).where(Page.slug == slug)
        if tenant_id:
            query = query.where(Page.tenant_id == tenant_id)
        existing = await db.execute(query)
        if existing.scalar_one_or_none():
            import secrets
            slug = f"{slug}-{secrets.token_hex(3)}"

        # 3. 创建页面
        page = Page(
            tenant_id=tenant_id,
            title=data.title,
            slug=slug,
            description=data.description,
            status="draft",
            current_version=1,
            schema_json=data.schema_json,
            created_by=user_id,
        )
        db.add(page)
        await db.flush()
        await db.refresh(page)

        # 4. 创建初始版本记录
        version = PageVersion(
            page_id=page.id,
            version_number=1,
            schema_json=data.schema_json or "{}",
            change_summary="初始创建",
            created_by=user_id,
        )
        db.add(version)
        await db.flush()
        await db.refresh(page)

        logger.info(
            f"[PageService] Page created: id={page.id}, title={page.title}, "
            f"slug={page.slug}, tenant={tenant_id}"
        )
        return page

    @staticmethod
    async def get_pages(
        db: AsyncSession,
        tenant_id: Optional[str],
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[List[Page], int]:
        """
        获取页面列表（租户隔离）
        Get pages list with tenant isolation
        
        Args:
            db: 异步数据库会话
            tenant_id: 租户ID
            skip: 跳过数量
            limit: 返回数量上限
            status: 状态筛选
            search: 搜索关键词
        
        Returns:
            tuple: (页面列表, 总数)
        """
        query = select(Page)

        # 租户隔离：仅返回该租户的页面
        if tenant_id:
            query = query.where(Page.tenant_id == tenant_id)

        # 排除已归档（软删除）的页面
        query = query.where(Page.status != "archived")

        # 状态筛选
        if status:
            query = query.where(Page.status == status)

        # 搜索
        if search:
            query = query.where(Page.title.ilike(f"%{search}%"))

        # 获取总数
        count_query = select(sa_func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        # 分页 + 排序
        query = query.order_by(Page.updated_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        pages = list(result.scalars().all())

        return pages, total

    @staticmethod
    async def get_page(db: AsyncSession, page_id: str) -> Optional[Page]:
        """
        获取单个页面详情
        Get single page by ID
        """
        result = await db.execute(
            select(Page).where(Page.id == page_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def save_draft(
        db: AsyncSession,
        page: Page,
        schema_json: str,
    ) -> Page:
        """
        保存草稿（自动保存）
        Save draft schema_json without creating a version
        
        Args:
            db: 异步数据库会话
            page: 页面对象
            schema_json: 草稿JSON字符串
        
        Returns:
            Page: 更新后的页面对象
        """
        page.schema_json = schema_json
        await db.flush()
        await db.refresh(page)

        logger.debug(f"[PageService] Draft saved: page_id={page.id}")
        return page

    @staticmethod
    async def publish_page(
        db: AsyncSession,
        page: Page,
        user_id: Optional[str],
        change_summary: Optional[str] = None,
    ) -> Page:
        """
        发布页面
        Publish page: copy schema_json to published_schema_json, create version record
        
        Args:
            db: 异步数据库会话
            page: 页面对象
            user_id: 发布者用户ID
            change_summary: 变更摘要
        
        Returns:
            Page: 更新后的页面对象
        """
        # 1. 递增版本号
        page.current_version = (page.current_version or 0) + 1
        version_number = page.current_version

        # 2. 将当前草稿复制到已发布版本
        page.published_schema_json = page.schema_json
        page.status = "published"

        # 3. 创建版本记录
        version = PageVersion(
            page_id=page.id,
            version_number=version_number,
            schema_json=page.schema_json or "{}",
            change_summary=change_summary or f"版本 {version_number}",
            created_by=user_id,
        )
        db.add(version)
        await db.flush()
        await db.refresh(page)

        logger.info(
            f"[PageService] Page published: id={page.id}, version={version_number}"
        )
        return page

    @staticmethod
    async def get_versions(
        db: AsyncSession,
        page_id: str,
    ) -> List[PageVersion]:
        """
        获取页面版本历史
        Get version history for a page
        
        Args:
            db: 异步数据库会话
            page_id: 页面ID
        
        Returns:
            List[PageVersion]: 版本列表（按版本号降序）
        """
        result = await db.execute(
            select(PageVersion)
            .where(PageVersion.page_id == page_id)
            .order_by(PageVersion.version_number.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def rollback_to_version(
        db: AsyncSession,
        page: Page,
        version_number: int,
        user_id: Optional[str] = None,
    ) -> Page:
        """
        回滚到指定版本
        Rollback page to a specific version: restore schema_json and create a new version
        
        Args:
            db: 异步数据库会话
            page: 页面对象
            version_number: 目标版本号
            user_id: 操作者用户ID
        
        Returns:
            Page: 更新后的页面对象
        
        Raises:
            ValueError: 版本不存在
        """
        # 1. 查找目标版本
        result = await db.execute(
            select(PageVersion).where(
                PageVersion.page_id == page.id,
                PageVersion.version_number == version_number,
            )
        )
        target_version = result.scalar_one_or_none()
        if not target_version:
            raise ValueError(f"Version {version_number} not found for page {page.id}")

        # 2. 恢复schema_json到草稿
        page.schema_json = target_version.schema_json

        # 3. 创建新版本记录（回滚操作也产生新版本）
        page.current_version = (page.current_version or 0) + 1
        new_version = PageVersion(
            page_id=page.id,
            version_number=page.current_version,
            schema_json=target_version.schema_json,
            change_summary=f"回滚到版本 {version_number}",
            created_by=user_id,
        )
        db.add(new_version)
        await db.flush()
        await db.refresh(page)

        logger.info(
            f"[PageService] Page rolled back: id={page.id}, "
            f"from v={page.current_version - 1} to v={version_number}, "
            f"new version={page.current_version}"
        )
        return page

    @staticmethod
    async def delete_page(db: AsyncSession, page: Page) -> Page:
        """
        软删除页面（status改为archived）
        Soft-delete page by setting status to archived
        
        Args:
            db: 异步数据库会话
            page: 页面对象
        
        Returns:
            Page: 更新后的页面对象
        """
        page.status = "archived"
        await db.flush()
        await db.refresh(page)

        logger.info(f"[PageService] Page archived: id={page.id}, title={page.title}")
        return page
