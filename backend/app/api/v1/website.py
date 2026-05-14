"""
Web3D Backend - 官网模板系统 API 路由
Website Template System API endpoints:
  /api/v1/nav-menus           - 导航菜单 CRUD
  /api/v1/website-templates   - 模板 CRUD + 插槽管理
  /api/v1/components          - 注册组件列表（只读）
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text
from typing import Optional, List
import math
import uuid

from app.database import get_db
from app.models.user import User
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
from app.dependencies import get_current_user, require_role
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
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    include_hidden: bool = Query(False, description="是否包含隐藏菜单"),
):
    """
    获取导航菜单（树形结构）
    前台无需认证，后台管理需要认证
    """
    try:
        query = db.query(NavMenu).filter(NavMenu.parent_id.is_(None))
        if not include_hidden:
            query = query.filter(NavMenu.is_visible == True)
        query = query.order_by(NavMenu.sort_order)

        root_menus = query.all()

        def build_tree(menu: NavMenu) -> dict:
            data = NavMenuResponse.model_validate(menu).model_dump()
            children = db.query(NavMenu).filter(
                NavMenu.parent_id == menu.id
            ).order_by(NavMenu.sort_order).all()
            if children:
                data['children'] = [build_tree(c) for c in children]
            return data

        result = [build_tree(m) for m in root_menus]
        total = db.query(NavMenu).count()

        return NavMenuListResponse(data=result, total=total)
    except Exception as e:
        logger.error(f"Failed to list nav menus: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to list nav menus: {str(e)}")


@nav_router.get("/flat", response_model=NavMenuListResponse)
async def list_nav_menus_flat(
    db: Session = Depends(get_db),
    include_hidden: bool = Query(False),
):
    """获取导航菜单（平铺列表，供 admin 表格使用）"""
    try:
        query = db.query(NavMenu).order_by(NavMenu.parent_id.asc(), NavMenu.sort_order.asc())
        if not include_hidden:
            query = query.filter(NavMenu.is_visible == True)
        menus = query.all()
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
async def get_nav_menu(menu_id: str, db: Session = Depends(get_db)):
    """获取单个导航菜单"""
    menu = db.query(NavMenu).filter(NavMenu.id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nav menu not found")
    return NavMenuResponse.model_validate(menu)


@nav_router.post("", response_model=NavMenuResponse, status_code=status.HTTP_201_CREATED)
async def create_nav_menu(
    menu_data: NavMenuCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """创建导航菜单项（管理员/编辑）"""
    try:
        # 检查 route 唯一性
        existing = db.query(NavMenu).filter(NavMenu.route == menu_data.route).first()
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
        db.commit()
        db.refresh(menu)
        logger.info(f"NavMenu created: {menu.id} by {current_user.username}")
        return NavMenuResponse.model_validate(menu)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create nav menu: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create nav menu: {str(e)}")


@nav_router.put("/{menu_id}", response_model=NavMenuResponse)
async def update_nav_menu(
    menu_id: str,
    menu_data: NavMenuUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """更新导航菜单项"""
    try:
        menu = db.query(NavMenu).filter(NavMenu.id == menu_id).first()
        if not menu:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nav menu not found")

        update_data = menu_data.dict(exclude_unset=True)

        # 检查 route 唯一性
        if 'route' in update_data and update_data['route'] != menu.route:
            existing = db.query(NavMenu).filter(NavMenu.route == update_data['route']).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                                    detail=f"Route '{update_data['route']}' already exists")

        for field, value in update_data.items():
            setattr(menu, field, value)

        db.commit()
        db.refresh(menu)
        logger.info(f"NavMenu updated: {menu_id} by {current_user.username}")
        return NavMenuResponse.model_validate(menu)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update nav menu: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update nav menu: {str(e)}")


@nav_router.delete("/{menu_id}")
async def delete_nav_menu(
    menu_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """删除导航菜单项（同时删除子菜单）"""
    try:
        menu = db.query(NavMenu).filter(NavMenu.id == menu_id).first()
        if not menu:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nav menu not found")

        # 删除子菜单
        db.query(NavMenu).filter(NavMenu.parent_id == menu_id).delete()
        db.delete(menu)
        db.commit()
        logger.info(f"NavMenu deleted: {menu_id} by {current_user.username}")
        return {"message": "Nav menu deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete nav menu: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete nav menu: {str(e)}")


@nav_router.post("/batch-sort")
async def batch_sort_nav_menus(
    sort_data: NavMenuBatchSortRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """批量更新导航菜单排序"""
    try:
        for item in sort_data.items:
            menu = db.query(NavMenu).filter(NavMenu.id == item.id).first()
            if menu:
                menu.sort_order = item.sort_order
                if item.parent_id is not None:
                    menu.parent_id = item.parent_id
        db.commit()
        logger.info(f"NavMenu batch sorted by {current_user.username}")
        return {"message": f"Successfully sorted {len(sort_data.items)} menus"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to batch sort nav menus: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to batch sort: {str(e)}")


# ===================================================================
#  WebsiteTemplate - 模板 CRUD
# ===================================================================

template_router = APIRouter(prefix="/website-templates", tags=["网站模板"])


@template_router.get("", response_model=TemplateListResponse)
async def list_templates(
    db: Session = Depends(get_db),
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
        query = db.query(WebsiteTemplate)

        if name:
            query = query.filter(WebsiteTemplate.name.ilike(f"%{name}%"))
        if category:
            query = query.filter(WebsiteTemplate.category == category)
        if status_filter:
            query = query.filter(WebsiteTemplate.status == status_filter)
        if layout_type:
            query = query.filter(WebsiteTemplate.layout_type == layout_type)

        # 非管理员只能看到已发布
        if current_user and current_user.role not in ["admin", "editor"]:
            query = query.filter(WebsiteTemplate.status == "published")

        total = query.count()
        offset = (page - 1) * page_size
        templates = query.order_by(WebsiteTemplate.updated_at.desc()).offset(offset).limit(page_size).all()
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
async def get_template(template_id: str, db: Session = Depends(get_db)):
    """获取模板详情（含插槽列表）"""
    try:
        template = db.query(WebsiteTemplate).filter(WebsiteTemplate.id == template_id).first()
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
    db: Session = Depends(get_db),
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
        db.commit()
        db.refresh(template)
        logger.info(f"WebsiteTemplate created: {template.id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create template: {str(e)}")


@template_router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """更新模板"""
    try:
        template = db.query(WebsiteTemplate).filter(WebsiteTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        update_data = template_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(template, field, value)

        db.commit()
        db.refresh(template)
        logger.info(f"WebsiteTemplate updated: {template_id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update template: {str(e)}")


@template_router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """删除模板（级联删除插槽）"""
    try:
        template = db.query(WebsiteTemplate).filter(WebsiteTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        # 清空引用此模板的导航菜单
        db.query(NavMenu).filter(NavMenu.template_id == template_id).update(
            {NavMenu.template_id: None}
        )

        db.delete(template)
        db.commit()
        logger.info(f"WebsiteTemplate deleted: {template_id} by {current_user.username}")
        return {"message": "Template deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete template: {str(e)}")


@template_router.post("/{template_id}/publish", response_model=TemplateResponse)
async def publish_template(
    template_id: str,
    publish_data: Optional[TemplatePublishRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """发布模板（状态 draft->published，可选更新版本号）"""
    try:
        template = db.query(WebsiteTemplate).filter(WebsiteTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        template.status = "published"
        if publish_data and publish_data.version:
            template.version = publish_data.version

        db.commit()
        db.refresh(template)
        logger.info(f"WebsiteTemplate published: {template_id} by {current_user.username}")
        return TemplateResponse.model_validate(template)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to publish template: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to publish template: {str(e)}")


# ===================================================================
#  TemplateSlot - 插槽管理 (sub-resource of templates)
# ===================================================================

@template_router.get("/{template_id}/slots", response_model=List[SlotResponse])
async def list_template_slots(template_id: str, db: Session = Depends(get_db)):
    """获取模板的所有插槽"""
    template = db.query(WebsiteTemplate).filter(WebsiteTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    slots = db.query(TemplateSlot).filter(
        TemplateSlot.template_id == template_id
    ).order_by(TemplateSlot.sort_order).all()
    return [SlotResponse.model_validate(s) for s in slots]


@template_router.post("/{template_id}/slots", response_model=SlotResponse, status_code=status.HTTP_201_CREATED)
async def create_template_slot(
    template_id: str,
    slot_data: SlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """为模板添加插槽"""
    try:
        template = db.query(WebsiteTemplate).filter(WebsiteTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        # 检查 slot_key 同模板内唯一性
        existing = db.query(TemplateSlot).filter(
            TemplateSlot.template_id == template_id,
            TemplateSlot.slot_key == slot_data.slot_key,
        ).first()
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
        db.commit()
        db.refresh(slot)
        return SlotResponse.model_validate(slot)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create slot: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to create slot: {str(e)}")


@template_router.put("/{template_id}/slots/{slot_id}", response_model=SlotResponse)
async def update_template_slot(
    template_id: str,
    slot_id: str,
    slot_data: SlotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """更新模板插槽"""
    try:
        slot = db.query(TemplateSlot).filter(
            TemplateSlot.id == slot_id,
            TemplateSlot.template_id == template_id,
        ).first()
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

        update_data = slot_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(slot, field, value)

        db.commit()
        db.refresh(slot)
        return SlotResponse.model_validate(slot)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update slot: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to update slot: {str(e)}")


@template_router.delete("/{template_id}/slots/{slot_id}")
async def delete_template_slot(
    template_id: str,
    slot_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """删除模板插槽"""
    try:
        slot = db.query(TemplateSlot).filter(
            TemplateSlot.id == slot_id,
            TemplateSlot.template_id == template_id,
        ).first()
        if not slot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

        db.delete(slot)
        db.commit()
        return {"message": "Slot deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete slot: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to delete slot: {str(e)}")


@template_router.post("/{template_id}/slots/batch", response_model=List[SlotResponse])
async def batch_update_template_slots(
    template_id: str,
    batch_data: SlotBatchUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """批量替换模板的全部插槽（先删后建）"""
    try:
        template = db.query(WebsiteTemplate).filter(WebsiteTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

        # 删除现有插槽
        db.query(TemplateSlot).filter(TemplateSlot.template_id == template_id).delete()

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

        db.commit()
        for s in created:
            db.refresh(s)
        return [SlotResponse.model_validate(s) for s in created]
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to batch update slots: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to batch update slots: {str(e)}")


# ===================================================================
#  RegisteredComponent - 组件注册表（只读列表）
# ===================================================================

component_router = APIRouter(prefix="/components", tags=["注册组件"])


@component_router.get("", response_model=ComponentListResponse)
async def list_components(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """获取注册组件列表（只读，供 admin 组件面板使用）"""
    try:
        query = db.query(RegisteredComponent)
        if category:
            query = query.filter(RegisteredComponent.category == category)
        if is_active is not None:
            query = query.filter(RegisteredComponent.is_active == is_active)
        query = query.order_by(RegisteredComponent.category, RegisteredComponent.component_type)

        components = query.all()
        return ComponentListResponse(
            data=[ComponentResponse.model_validate(c) for c in components],
            total=len(components),
        )
    except Exception as e:
        logger.error(f"Failed to list components: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to list components: {str(e)}")
