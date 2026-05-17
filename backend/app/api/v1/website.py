"""
Web3D Backend - 官网模板系统 API 路由
Website Template System API endpoints:
  /api/v1/nav-menus           - 导航菜单 CRUD
  /api/v1/website-templates   - 模板 CRUD + 插槽管理
  /api/v1/components          - 注册组件列表（只读）
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy import select, func, text, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Optional, List
import math
import uuid

from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant, TenantConfig
from app.models.website_template import (
    WebsiteTemplate,
    NavMenu,
    TemplateSlot,
    RegisteredComponent,
    _register_user_relationships,
)
from app.schemas.website_template import (
    NavMenuCreate,
    NavMenuUpdate,
    NavMenuResponse,
    NavMenuListResponse,
    NavMenuBatchSortRequest,
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListResponse,
    TemplatePublishRequest,
    SlotCreate,
    SlotUpdate,
    SlotResponse,
    SlotBatchUpdateRequest,
    ComponentResponse,
    ComponentListResponse,
)
from app.dependencies import get_current_user, get_optional_current_user, require_role
from app.config import settings
from loguru import logger

# 确保 User 反向关系已注册
_register_user_relationships()

router = APIRouter()

# ===================================================================
#  NavMenu - 导航菜单 CRUD
# ===================================================================

nav_router = APIRouter(prefix="/nav-menus", tags=["导航菜单"])


@nav_router.get("", response_model=NavMenuListResponse)
async def list_nav_menus(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    include_hidden: bool = Query(False, description="是否包含隐藏菜单"),
):
    """获取导航菜单（树形结构）前台无需认证，后台管理需要认证"""
    try:
        root_stmt = select(NavMenu).where(NavMenu.parent_id.is_(None))
        if not include_hidden:
            root_stmt = root_stmt.where(NavMenu.is_visible == True)
        root_stmt = root_stmt.order_by(NavMenu.sort_order)
        root_result = await db.execute(root_stmt)
        root_menus = root_result.scalars().all()

        async def build_tree(menu: NavMenu) -> dict:
            data = NavMenuResponse.model_validate(menu).model_dump()
            child_result = await db.execute(
                select(NavMenu).where(NavMenu.parent_id == menu.id).order_by(NavMenu.sort_order)
            )
            children = child_result.scalars().all()
            if children:
                data['children'] = [await build_tree(c) for c in children]
            return data

        result = []
        for m in root_menus:
            result.append(await build_tree(m))

        total_result = await db.execute(select(func.count()).select_from(NavMenu))
        total = total_result.scalar()

        return NavMenuListResponse(data=result, total=total)
    except Exception as e:
        logger.error(f"Failed to list nav menus: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to list nav menus: {str(e)}")


@nav_router.get("/flat", response_model=NavMenuListResponse)
async def list_nav_menus_flat(
    db: AsyncSession = Depends(get_db),
    include_hidden: bool = Query(False),
):
    """获取导航菜单（平铺列表，供 admin 表格使用）"""
    try:
        stmt = select(NavMenu).order_by(NavMenu.parent_id.asc(), NavMenu.sort_order.asc())
        if not include_hidden:
            stmt = stmt.where(NavMenu.is_visible == True)
        result = await db.execute(stmt)
        menus = result.scalars().all()
        total = len(menus)
        return NavMenuListResponse(
            data=[NavMenuResponse.model_validate(m) for m in menus],
            total=total,
        )
    except Exception as e:
        logger.error(f"Failed to list nav menus flat: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to list nav menus: {str(e)}")


@nav_router.get("/{menu_id}", response_model=NavMenuResponse)
async def get_nav_menu(menu_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个导航菜单"""
    result = await db.execute(select(NavMenu).where(NavMenu.id == menu_id))
    menu = result.scalar_one_or_none()
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nav menu not found")
    return NavMenuResponse.model_validate(menu)


@nav_router.post("", response_model=NavMenuResponse, status_code=status.HTTP_201_CREATED)
async def create_nav_menu(
    menu_data: NavMenuCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """创建导航菜单项（管理员/编辑）"""
    try:
        result = await db.execute(select(NavMenu).where(NavMenu.route == menu_data.route))
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail=f"Route '{menu_data.route}' already exists")

        menu = NavMenu(
            id=str(uuid.uuid4()),
            parent_id=menu_data.parent_id,
            label=menu_data.label,
            icon=menu_data.icon,
            route=menu_data.route,
            page_title=menu_data.page_title,
            template_id=menu_data.template_id,
            page_component=menu_data.page_component,
            sort_order=menu_data.sort_order,
            is_visible=menu_data.is_visible,
            auth_required=menu_data.auth_required,
            config=menu_data.config or {},
        )
        db.add(menu)
        await db.commit()
        await db.refresh(menu)
        logger.info(f"NavMenu created: {menu.id} by {current_user.username}")
        return NavMenuResponse.model_validate(menu)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create nav menu: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create nav menu: {str(e)}")


@nav_router.put("/{menu_id}", response_model=NavMenuResponse)
async def update_nav_menu(
    menu_id: str,
    menu_data: NavMenuUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """更新导航菜单项"""
    try:
        result = await db.execute(select(NavMenu).where(NavMenu.id == menu_id))
        menu = result.scalar_one_or_none()
        if not menu:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nav menu not found")

        update_data = menu_data.dict(exclude_unset=True)

        if 'route' in update_data and update_data['route'] != menu.route:
            route_result = await db.execute(select(NavMenu).where(NavMenu.route == update_data['route']))
            existing = route_result.scalar_one_or_none()
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail=f"Route '{update_data['route']}' already exists")

        for field, value in update_data.items():
            setattr(menu, field, value)

        await db.commit()
        await db.refresh(menu)
        logger.info(f"NavMenu updated: {menu_id} by {current_user.username}")
        return NavMenuResponse.model_validate(menu)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update nav menu: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update nav menu: {str(e)}")


@nav_router.delete("/{menu_id}")
async def delete_nav_menu(
    menu_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """删除导航菜单项（同时删除子菜单）"""
    try:
        result = await db.execute(select(NavMenu).where(NavMenu.id == menu_id))
        menu = result.scalar_one_or_none()
        if not menu:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nav menu not found")

        await db.execute(sa_delete(NavMenu).where(NavMenu.parent_id == menu_id))
        await db.delete(menu)
        await db.commit()
        logger.info(f"NavMenu deleted: {menu_id} by {current_user.username}")
        return {"message": "Nav menu deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete nav menu: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete nav menu: {str(e)}")


@nav_router.post("/batch-sort")
async def batch_sort_nav_menus(
    sort_data: NavMenuBatchSortRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """批量更新导航菜单排序"""
    try:
        for item in sort_data.items:
            result = await db.execute(select(NavMenu).where(NavMenu.id == item.id))
            menu = result.scalar_one_or_none()
            if menu:
                menu.sort_order = item.sort_order
                if item.parent_id is not None:
                    menu.parent_id = item.parent_id
        await db.commit()
        logger.info(f"NavMenu batch sorted by {current_user.username}")
        return {"message": f"Successfully sorted {len(sort_data.items)} menus"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to batch sort nav menus: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to batch sort: {str(e)}")


# ===================================================================
#  WebsiteTemplate - 模板 CRUD
# ===================================================================

template_router = APIRouter(prefix="/website-templates", tags=["网站模板"])


@template_router.get("", response_model=TemplateListResponse)
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    name: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    layout_type: Optional[str] = None,
):
    """获取模板列表（分页+筛选）"""
    try:
        conditions = []
        if name:
            conditions.append(WebsiteTemplate.name.ilike(f"%{name}%"))
        if category:
            conditions.append(WebsiteTemplate.category == category)
        if status_filter:
            conditions.append(WebsiteTemplate.status == status_filter)
        if layout_type:
            conditions.append(WebsiteTemplate.layout_type == layout_type)

        # 非管理员只能看到已发布
        if current_user and current_user.role not in ["admin", "editor"]:
            conditions.append(WebsiteTemplate.status == "published")

        count_result = await db.execute(
            select(func.count()).select_from(WebsiteTemplate).where(*conditions)
        )
        total = count_result.scalar()

        offset = (page - 1) * page_size
        stmt = select(WebsiteTemplate).options(selectinload(WebsiteTemplate.slots)).where(*conditions).order_by(WebsiteTemplate.updated_at.desc()).offset(offset).limit(page_size)
        result = await db.execute(stmt)
        templates = result.scalars().all()
        total_pages = math.ceil(total / page_size) if total > 0 else 0

        return TemplateListResponse(
            data=[TemplateResponse.model_validate(t) for t in templates],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"Failed to list website templates: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to list templates: {str(e)}")


@template_router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, db: AsyncSession = Depends(get_db)):
    """获取模板详情（含插槽列表）"""
    try:
        result = await db.execute(select(WebsiteTemplate).options(selectinload(WebsiteTemplate.slots)).where(WebsiteTemplate.id == template_id))
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to get template: {str(e)}")


@template_router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """创建新模板"""
    try:
        template = WebsiteTemplate(
            id=str(uuid.uuid4()),
            name=template_data.name,
            description=template_data.description,
            thumbnail_url=template_data.thumbnail_url,
            category=template_data.category,
            layout_type=template_data.layout_type,
            status="draft",
            is_default=template_data.is_default,
            layout_config=template_data.layout_config,
            theme_config=template_data.theme_config,
            meta_info=template_data.meta_info,
            created_by=current_user.id,
        )
        db.add(template)
        await db.commit()
        await db.refresh(template)
        # 显式设置空插槽列表，避免懒加载触发 MissingGreenlet
        template.slots = []
        logger.info(f"WebsiteTemplate created: {template.id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create template: {str(e)}")


@template_router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """更新模板"""
    try:
        result = await db.execute(select(WebsiteTemplate).options(selectinload(WebsiteTemplate.slots)).where(WebsiteTemplate.id == template_id))
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        update_data = template_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)

        await db.commit()
        await db.refresh(template)
        logger.info(f"WebsiteTemplate updated: {template_id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update template: {str(e)}")


@template_router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """删除模板（级联删除插槽）"""
    try:
        result = await db.execute(select(WebsiteTemplate).where(WebsiteTemplate.id == template_id))
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        # 清空引用此模板的导航菜单
        nav_result = await db.execute(select(NavMenu).where(NavMenu.template_id == template_id))
        for nav in nav_result.scalars().all():
            nav.template_id = None

        await db.delete(template)
        await db.commit()
        logger.info(f"WebsiteTemplate deleted: {template_id} by {current_user.username}")
        return {"message": "Template deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete template: {str(e)}")


@template_router.post("/{template_id}/publish", response_model=TemplateResponse)
async def publish_template(
    template_id: str,
    publish_data: Optional[TemplatePublishRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """发布模板（状态 draft->published，可选更新版本号）"""
    try:
        result = await db.execute(select(WebsiteTemplate).options(selectinload(WebsiteTemplate.slots)).where(WebsiteTemplate.id == template_id))
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        template.status = "published"
        if publish_data and publish_data.version:
            template.version = publish_data.version

        await db.commit()
        await db.refresh(template)
        logger.info(f"WebsiteTemplate published: {template_id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to publish template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to publish template: {str(e)}")


# ===================================================================
#  TemplateSlot - 插槽管理 (sub-resource of templates)
# ===================================================================

@template_router.get("/{template_id}/slots", response_model=List[SlotResponse])
async def list_template_slots(template_id: str, db: AsyncSession = Depends(get_db)):
    """获取模板的所有插槽"""
    tmpl_result = await db.execute(select(WebsiteTemplate).where(WebsiteTemplate.id == template_id))
    template = tmpl_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    slots_result = await db.execute(
        select(TemplateSlot).where(TemplateSlot.template_id == template_id).order_by(TemplateSlot.sort_order)
    )
    slots = slots_result.scalars().all()
    return [SlotResponse.model_validate(s) for s in slots]


@template_router.post("/{template_id}/slots", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
async def create_template_slot(
    template_id: str,
    slot_data: SlotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """为模板添加插槽"""
    try:
        tmpl_result = await db.execute(select(WebsiteTemplate).where(WebsiteTemplate.id == template_id))
        template = tmpl_result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        # 检查 slot_key 同模板内唯一性
        existing_result = await db.execute(
            select(TemplateSlot).where(
                TemplateSlot.template_id == template_id,
                TemplateSlot.slot_key == slot_data.slot_key,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                detail=f"Slot key '{slot_data.slot_key}' already exists in this template")

        slot = TemplateSlot(
            id=str(uuid.uuid4()),
            template_id=template_id,
            slot_key=slot_data.slot_key,
            component_type=slot_data.component_type,
            sort_order=slot_data.sort_order,
            component_config=slot_data.component_config,
            is_dynamic=slot_data.is_dynamic,
        )
        db.add(slot)
        await db.commit()
        await db.refresh(slot)
        return SlotResponse.model_validate(slot)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create slot: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create slot: {str(e)}")


@template_router.put("/{template_id}/slots/{slot_id}", response_model=SlotResponse)
async def update_template_slot(
    template_id: str,
    slot_id: str,
    slot_data: SlotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """更新模板插槽"""
    try:
        slot_result = await db.execute(
            select(TemplateSlot).where(
                TemplateSlot.id == slot_id,
                TemplateSlot.template_id == template_id,
            )
        )
        slot = slot_result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

        update_data = slot_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(slot, field, value)

        await db.commit()
        await db.refresh(slot)
        return SlotResponse.model_validate(slot)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to update slot: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update slot: {str(e)}")


@template_router.delete("/{template_id}/slots/{slot_id}")
async def delete_template_slot(
    template_id: str,
    slot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """删除模板插槽"""
    try:
        slot_result = await db.execute(
            select(TemplateSlot).where(
                TemplateSlot.id == slot_id,
                TemplateSlot.template_id == template_id,
            )
        )
        slot = slot_result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

        await db.delete(slot)
        await db.commit()
        return {"message": "Slot deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to delete slot: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete slot: {str(e)}")


@template_router.post("/{template_id}/slots/batch", response_model=List[SlotResponse])
async def batch_update_template_slots(
    template_id: str,
    batch_data: SlotBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """批量替换模板的全部插槽（先删后建）"""
    try:
        tmpl_result = await db.execute(select(WebsiteTemplate).where(WebsiteTemplate.id == template_id))
        template = tmpl_result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        # 删除现有插槽
        existing_result = await db.execute(
            select(TemplateSlot).where(TemplateSlot.template_id == template_id)
        )
        for existing_slot in existing_result.scalars().all():
            await db.delete(existing_slot)

        # 批量创建新插槽
        created = []
        for item in batch_data.slots:
            slot = TemplateSlot(
                id=str(uuid.uuid4()),
                template_id=template_id,
                slot_key=item.slot_key,
                component_type=item.component_type,
                sort_order=item.sort_order,
                component_config=item.component_config,
                is_dynamic=item.is_dynamic,
            )
            db.add(slot)
            created.append(slot)

        await db.commit()
        for s in created:
            await db.refresh(s)
        return [SlotResponse.model_validate(s) for s in created]
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to batch update slots: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to batch update slots: {str(e)}")


# ===================================================================
#  RegisteredComponent - 组件注册表（只读列表）
# ===================================================================

component_router = APIRouter(prefix="/components", tags=["注册组件"])


@component_router.get("", response_model=ComponentListResponse)
async def list_components(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """获取注册组件列表（只读，供 admin 组件面板使用）"""
    try:
        conditions = []
        if category:
            conditions.append(RegisteredComponent.category == category)
        if is_active is not None:
            conditions.append(RegisteredComponent.is_active == is_active)

        stmt = select(RegisteredComponent).where(*conditions).order_by(RegisteredComponent.category, RegisteredComponent.component_type)
        result = await db.execute(stmt)
        components = result.scalars().all()
        return ComponentListResponse(
            data=[ComponentResponse.model_validate(c) for c in components],
            total=len(components),
        )
    except Exception as e:
        logger.error(f"Failed to list components: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to list components: {str(e)}")


# ===================================================================
#  Public - 公开接口（无需认证）
# ===================================================================

public_router = APIRouter(prefix="/public", tags=["公开接口"])


@public_router.get("/tenant-config")
async def get_public_tenant_config(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    公开租户配置端点（无需认证）
    根据请求域名返回租户公开配置（主题/SEO/logo等）
    """
    tenant_id = getattr(request.state, "tenant_id", None)

    if not tenant_id:
        return {
            "tenant_id": None,
            "site_title": settings.APP_NAME,
            "site_description": None,
            "logo_url": None,
            "favicon_url": None,
            "theme_config": None,
        }

    result = await db.execute(
        select(Tenant, TenantConfig)
        .outerjoin(TenantConfig, Tenant.id == TenantConfig.tenant_id)
        .where(Tenant.id == tenant_id)
    )
    row = result.first()
    if not row:
        return {
            "tenant_id": None,
            "site_title": settings.APP_NAME,
            "site_description": None,
            "logo_url": None,
            "favicon_url": None,
            "theme_config": None,
        }

    tenant, config = row
    return {
        "tenant_id": tenant.id,
        "site_title": config.site_title if config else tenant.name,
        "site_description": config.site_description if config else None,
        "logo_url": tenant.logo_url,
        "favicon_url": tenant.favicon_url,
        "theme_config": config.theme_config if config else None,
    }
