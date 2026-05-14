"""
数据库迁移：创建官网模板系统表 + 导入 seed 数据
Migration: Create website template system tables + seed data

运行方式: python -m backend.database.migrations.create_website_template_tables
或: cd backend && python database/migrations/create_website_template_tables.py
"""
import sys
from pathlib import Path

# 添加 backend 目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import asyncio
import json
from sqlalchemy import inspect, text
from loguru import logger

from app.database import engine, Base, async_session_maker
from app.models.website_template import (
    WebsiteTemplate, NavMenu, TemplateSlot, RegisteredComponent,
    _register_user_relationships,
)
from app.models.user import User
import uuid


# ===== 确保 User 反向关系 =====
_register_user_relationships()


# ==================== Seed Data ====================

def get_nav_menus_seeds() -> list[dict]:
    """现有官网导航菜单 seed 数据（与 App.tsx 完全对应）"""
    return [
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "首页", "en": "Home"},
            "icon": None,
            "route": "/",
            "page_title": "Web3D - 首页",
            "page_component": "home",
            "sort_order": 1,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "画廊", "en": "Gallery"},
            "icon": None,
            "route": "/gallery",
            "page_title": "模型画廊",
            "page_component": "gallery",
            "sort_order": 2,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "3D车间", "en": "3D Workshop"},
            "icon": "\U0001f3ed",  # 🏭
            "route": "/workshop",
            "page_title": "3D 车间",
            "page_component": "workshop",
            "sort_order": 3,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "模型上传", "en": "Upload"},
            "icon": None,
            "route": "/upload",
            "page_title": "模型上传",
            "page_component": "upload",
            "sort_order": 4,
            "is_visible": True,
            "auth_required": True,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "Week 2组件验证", "en": "Week 2 Test"},
            "icon": "\U0001f9ea",  # 🧪
            "route": "/test/week2-components-test",
            "page_title": "组件验证",
            "page_component": "week2-components-test",
            "sort_order": 5,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "图书查看器", "en": "Book Viewer"},
            "icon": None,
            "route": "/book",
            "page_title": "图书查看器",
            "page_component": "book",
            "sort_order": 6,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "图书画廊", "en": "Book Gallery"},
            "icon": None,
            "route": "/book-gallery",
            "page_title": "图书画廊",
            "page_component": "book-gallery",
            "sort_order": 7,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "Spark编辑器", "en": "Spark Editor"},
            "icon": None,
            "route": "/editor/spark",
            "page_title": "Spark 3D 编辑器",
            "page_component": "spark-editor",
            "sort_order": 8,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
        {
            "id": str(uuid.uuid4()),
            "label": {"zh": "登录", "en": "Login"},
            "icon": None,
            "route": "/auth",
            "page_title": "用户登录",
            "page_component": "auth",
            "sort_order": 9,
            "is_visible": True,
            "auth_required": False,
            "template_id": None,
        },
    ]


def get_component_seeds() -> list[dict]:
    """内置组件注册 seed 数据"""
    return [
        {
            "id": str(uuid.uuid4()),
            "component_type": "hero-3d-carousel",
            "display_name": "3D 模型轮播",
            "description": "全屏 3D 模型轮播组件，支持自动播放、手势交互、详情弹窗",
            "icon": None,
            "category": "content",
            "prop_schema": {
                "props": [
                    {"key": "autoPlay", "type": "boolean", "label": "自动轮播", "default": True},
                    {"key": "interval", "type": "number", "label": "轮播间隔(秒)", "default": 15, "min": 3, "max": 60},
                    {"key": "transitionType", "type": "select", "label": "切换动画",
                     "options": [{"value": "fade", "label": "淡入淡出"}, {"value": "slide", "label": "滑动"}],
                     "default": "fade"},
                    {"key": "dataSource", "type": "datasource", "label": "数据来源"},
                    {"key": "renderConfig", "type": "renderConfig", "label": "渲染配置"},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "model-card-grid",
            "display_name": "模型卡片网格",
            "description": "响应式模型卡片网格布局，支持分页、筛选、排序",
            "icon": None,
            "category": "content",
            "prop_schema": {
                "props": [
                    {"key": "pageSize", "type": "number", "label": "每页数量", "default": 8, "min": 4, "max": 50},
                    {"key": "columns", "type": "number", "label": "列数", "default": 3, "min": 1, "max": 6},
                    {"key": "showPagination", "type": "boolean", "label": "显示分页", "default": True},
                    {"key": "dataSource", "type": "datasource", "label": "数据来源"},
                    {"key": "filterConfig", "type": "object", "label": "筛选配置"},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "gallery-sidebar",
            "display_name": "分类筛选侧栏",
            "description": "左侧分类导航侧栏，支持动态分类列表和图标展示",
            "icon": None,
            "category": "navigation",
            "prop_schema": {
                "props": [
                    {"key": "categories", "type": "select", "label": "分类来源",
                     "options": [{"value": "dynamic", "label": "动态(从数据推导)"}, {"value": "static", "label": "静态(手动配置)"}]},
                    {"key": "showCount", "type": "boolean", "label": "显示数量", "default": False},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "model-detail-view",
            "display_name": "模型 3D 详情",
            "description": "单模型 3D 预览 + 产品信息详情展示",
            "icon": None,
            "category": "media",
            "prop_schema": {
                "props": [
                    {"key": "modelId", "type": "string", "label": "模型ID"},
                    {"key": "orbitEnabled", "type": "boolean", "label": "允许旋转", "default": True},
                    {"key": "showProducts", "type": "boolean", "label": "显示产品标签", "default": True},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "text-block",
            "display_name": "文本区块",
            "description": "富文本内容区块，支持标题、段落和多语言",
            "icon": None,
            "category": "content",
            "prop_schema": {
                "props": [
                    {"key": "content", "type": "richtext", "label": "内容"},
                    {"key": "align", "type": "select", "label": "对齐",
                     "options": [{"value": "left", "label": "左"}, {"value": "center", "label": "中"}, {"value": "right", "label": "右"}]},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "image-block",
            "display_name": "图片区块",
            "description": "图片展示区块，支持本地和远程图片",
            "icon": None,
            "category": "media",
            "prop_schema": {
                "props": [
                    {"key": "src", "type": "image", "label": "图片地址"},
                    {"key": "alt", "type": "string", "label": "替代文本"},
                    {"key": "fit", "type": "select", "label": "填充方式",
                     "options": [{"value": "cover", "label": "覆盖"}, {"value": "contain", "label": "包含"}]},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "three-viewer",
            "display_name": "3D 查看器",
            "description": "独立 Three.js 3D 模型查看器，支持 GLB/GLTF/PLY 格式",
            "icon": None,
            "category": "media",
            "prop_schema": {
                "props": [
                    {"key": "modelUrl", "type": "string", "label": "模型地址"},
                    {"key": "autoRotate", "type": "boolean", "label": "自动旋转", "default": True},
                    {"key": "background", "type": "color", "label": "背景色", "default": "#0a0a0f"},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "workshop-3d",
            "display_name": "3D 车间场景",
            "description": "工业车间 3D 全景场景，包含机床模型和实时数据面板",
            "icon": None,
            "category": "content",
            "prop_schema": {
                "props": [
                    {"key": "machineModels", "type": "datasource", "label": "机床模型数据"},
                    {"key": "showDataPanel", "type": "boolean", "label": "显示数据面板", "default": True},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
        {
            "id": str(uuid.uuid4()),
            "component_type": "home-buttons",
            "display_name": "首页底部入口",
            "description": "首页底部导航入口按钮组",
            "icon": None,
            "category": "navigation",
            "prop_schema": {
                "props": [
                    {"key": "buttons", "type": "array", "label": "按钮配置"},
                ]
            },
            "is_builtin": True,
            "is_active": True,
        },
    ]


# ==================== Template Seed Data ====================

def get_template_seeds() -> dict:
    """
    返回 {page_component: (template_dict, slots_list)} 映射
    为每个导航页面创建对应的模板定义
    """
    seeds = {}

    # 1. 首页模板
    seeds["home"] = (
        {
            "id": str(uuid.uuid4()),
            "name": "默认首页模板",
            "description": "系统默认首页布局",
            "category": "full_page",
            "layout_type": "single_column",
            "status": "published",
            "version": "1.0.0",
            "is_default": True,
            "layout_config": {
                "sections": [
                    {"id": "hero-section", "width": "full",
                     "style": {"minHeight": "calc(100vh - 80px)"},
                     "children": ["slot:hero-3d"]},
                    {"id": "bottom-bar", "width": "full",
                     "style": {"position": "fixed", "bottom": "0"},
                     "children": ["slot:home-buttons"]},
                ],
            },
            "theme_config": {"cssVariables": {"--primary-color": "#667eea", "--bg-color": "#0a0a0f"}},
            "meta_info": {},
        },
        [
            {"slot_key": "hero-3d", "component_type": "hero-3d-carousel", "sort_order": 1,
             "component_config": {"dataSource": {"type": "api", "endpoint": "/api/v1/models/homepage"},
                                "props": {"autoPlay": True, "interval": 15}}},
            {"slot_key": "home-buttons", "component_type": "home-buttons", "sort_order": 2,
             "component_config": {"dataSource": {"type": "static", "data": []}, "props": {}}},
        ]
    )

    # 2. 画廊模板
    seeds["gallery"] = (
        {
            "id": str(uuid.uuid4()),
            "name": "画廊模板",
            "description": "模型画廊页面布局",
            "category": "full_page",
            "layout_type": "single_column",
            "status": "published",
            "version": "1.0.0",
            "is_default": False,
            "layout_config": {
                "sections": [{"id": "gallery-content", "width": "contained",
                              "children": ["slot:gallery-grid"]}],
            },
            "theme_config": {},
            "meta_info": {},
        },
        [
            {"slot_key": "gallery-grid", "component_type": "model-card-grid", "sort_order": 1,
             "component_config": {"dataSource": {"type": "api", "endpoint": "/api/v1/models"},
                                "props": {"pageSize": 8, "columns": 3}}},
        ]
    )

    # 3. 3D车间模板
    seeds["workshop"] = (
        {
            "id": str(uuid.uuid4()),
            "name": "3D车间模板",
            "description": "3D 车间场景页面布局",
            "category": "full_page",
            "layout_type": "single_column",
            "status": "published",
            "version": "1.0.0",
            "is_default": False,
            "layout_config": {
                "sections": [{"id": "workshop-content", "width": "full",
                              "children": ["slot:workshop-scene"]}],
            },
            "theme_config": {},
            "meta_info": {},
        },
        [
            {"slot_key": "workshop-scene", "component_type": "workshop-3d", "sort_order": 1,
             "component_config": {"dataSource": {"type": "api", "endpoint": "/api/v1/models/workshop"},
                                "props": {"showDataPanel": True}}},
        ]
    )

    # 4-9: 简单功能页面模板（共享简约结构）
    for pc, name in [
        ("upload", "模型上传模板"),
        ("auth", "用户登录模板"),
        ("book", "图书查看器模板"),
        ("book-gallery", "图书画廊模板"),
        ("spark-editor", "Spark 编辑器模板"),
        ("week2-components-test", "组件验证测试模板"),
    ]:
        seeds[pc] = (
            {
                "id": str(uuid.uuid4()),
                "name": name,
                "description": f"{name}页面布局",
                "category": "full_page",
                "layout_type": "single_column",
                "status": "published",
                "version": "1.0.0",
                "is_default": False,
                "layout_config": {
                    "sections": [{
                        "id": f"{pc}-content", "width": "contained",
                        "style": {"padding": "2rem"},
                        "children": [f"slot:{pc}-main"],
                    }],
                },
                "theme_config": {},
                "meta_info": {},
            },
            [
                {"slot_key": f"{pc}-main", "component_type": "text-block", "sort_order": 1,
                 "component_config": {
                     "dataSource": {"type": "context", "key": "route"},
                     "props": {"content": f"<h2>{name}</h2><p>页面内容待模板组件化</p>",
                                "align": "center"},
                 }},
            ]
        )

    return seeds


# ==================== Migration Logic ====================

async def create_tables():
    """创建所有新表"""
    logger.info("Creating template system tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.success("Tables created (if not exist)")


async def seed_nav_menus(template_map: dict):
    """插入导航菜单 seed 数据（仅当表为空时）
    template_map: {page_component: template_id} 映射
    """
    async with async_session_maker() as session:
        try:
            existing = await session.execute(
                text("SELECT COUNT(*) FROM nav_menus")
            )
            count = existing.scalar()
            if count > 0:
                logger.info(f"nav_menus already has {count} records, skipping seed")
                return

            seeds = get_nav_menus_seeds()
            for item in seeds:
                pc = item["page_component"]
                template_id = template_map.get(pc)  # 将 template_id 设为对应模板
                await session.execute(
                    text("""
                        INSERT INTO nav_menus (id, parent_id, label, icon, route, page_title,
                            template_id, page_component, sort_order, is_visible, auth_required, config)
                        VALUES (:id, :parent_id, :label, :icon, :route, :page_title,
                            :template_id, :page_component, :sort_order, :is_visible, :auth_required, :config)
                    """),
                    {
                        "id": item["id"],
                        "parent_id": item.get("parent_id"),
                        "label": json.dumps(item["label"], ensure_ascii=False),
                        "icon": item["icon"],
                        "route": item["route"],
                        "page_title": item.get("page_title"),
                        "template_id": template_id,
                        "page_component": item["page_component"],
                        "sort_order": item["sort_order"],
                        "is_visible": item["is_visible"],
                        "auth_required": item.get("auth_required", False),
                        "config": "{}",
                    }
                )
            await session.commit()
            logger.success(f"Seeded {len(seeds)} nav menu records with template bindings")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to seed nav menus: {e}")
            raise


async def seed_website_templates() -> dict:
    """
    创建所有页面模板 + slots
    兼容：已有部分模板时，补齐缺失的模板
    返回 {page_component: template_id} 映射
    """
    async with async_session_maker() as session:
        try:
            # 检查已有模板数量
            existing_result = await session.execute(
                text("SELECT COUNT(*) FROM website_templates")
            )
            existing_count = existing_result.scalar()

            # 获取 admin 用户
            admin_result = await session.execute(
                text("SELECT id FROM users WHERE role IN ('admin', 'editor') LIMIT 1")
            )
            admin_row = admin_result.fetchone()
            admin_id = admin_row[0] if admin_row else None
            if not admin_id:
                logger.warning("No admin user found, using placeholder admin ID")
                admin_id = "00000000-0000-0000-0000-000000000000"

            seeds = get_template_seeds()  # page_component: (template_dict, slots)
            all_pc = set(seeds.keys())  # 期望的 9 个 page_component

            if existing_count >= len(all_pc):
                logger.info(f"website_templates already has {existing_count} records, skipping seed")
                # 读取现有映射
                result = await session.execute(
                    text("""
                        SELECT n.page_component, n.template_id
                        FROM nav_menus n
                        WHERE n.template_id IS NOT NULL
                    """)
                )
                mapping = {row[0]: row[1] for row in result.fetchall() if row[0]}
                return mapping

            if existing_count > 0:
                logger.info(f"Found {existing_count} existing templates, checking for missing ones...")

            template_map = {}

            for pc, (tpl, slots) in seeds.items():
                tid = tpl["id"]

                # 检查模板是否已存在（通过名称而非 UUID，兼容旧迁移）
                if existing_count > 0:
                    check = await session.execute(
                        text("SELECT id FROM website_templates WHERE name = :name"),
                        {"name": tpl["name"]},
                    )
                    row = check.fetchone()
                    if row:
                        # 已存在，使用其真实 ID
                        existing_tid = row[0]
                        template_map[pc] = existing_tid

                        # 更新 nav_menus 的 template_id
                        await session.execute(
                            text("""
                                UPDATE nav_menus SET template_id = :tid
                                WHERE page_component = :pc AND template_id IS NULL
                            """),
                            {"tid": existing_tid, "pc": pc},
                        )
                        continue

                # 插入模板记录
                await session.execute(
                    text("""
                        INSERT INTO website_templates (id, name, description, category, layout_type,
                            status, version, is_default, layout_config, theme_config, meta_info, created_by)
                        VALUES (:id, :name, :description, :category, :layout_type,
                            :status, :version, :is_default, :layout_config, :theme_config, :meta_info, :created_by)
                    """),
                    {
                        "id": tid,
                        "name": tpl["name"],
                        "description": tpl.get("description", ""),
                        "category": tpl.get("category", "full_page"),
                        "layout_type": tpl.get("layout_type", "single_column"),
                        "status": tpl.get("status", "published"),
                        "version": tpl.get("version", "1.0.0"),
                        "is_default": tpl.get("is_default", False),
                        "layout_config": json.dumps(tpl.get("layout_config", {}), ensure_ascii=False),
                        "theme_config": json.dumps(tpl.get("theme_config", {}), ensure_ascii=False),
                        "meta_info": json.dumps(tpl.get("meta_info", {}), ensure_ascii=False),
                        "created_by": admin_id,
                    }
                )

                # 插入插槽记录
                for slot in slots:
                    await session.execute(
                        text("""
                            INSERT INTO template_slots (id, template_id, slot_key, component_type,
                                sort_order, component_config)
                            VALUES (:id, :template_id, :slot_key, :component_type,
                                :sort_order, :component_config)
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "template_id": tid,
                            "slot_key": slot["slot_key"],
                            "component_type": slot["component_type"],
                            "sort_order": slot.get("sort_order", 0),
                            "component_config": json.dumps(slot.get("component_config", {}), ensure_ascii=False),
                        }
                    )

                template_map[pc] = tid

                # 更新已存在 nav_menus 的 template_id（兼容旧迁移）
                if existing_count > 0:
                    await session.execute(
                        text("""
                            UPDATE nav_menus SET template_id = :tid
                            WHERE page_component = :pc AND template_id IS NULL
                        """),
                        {"tid": tid, "pc": pc},
                    )

            await session.commit()
            newly_created = len(template_map) - existing_count
            logger.success(f"Seeded {len(template_map)} website templates (created {newly_created} new)")
            return template_map
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to seed website templates: {e}")
            raise


async def seed_components():
    """插入注册组件 seed 数据"""
    async with async_session_maker() as session:
        try:
            existing = await session.execute(
                text("SELECT COUNT(*) FROM registered_components")
            )
            count = existing.scalar()
            if count > 0:
                logger.info(f"registered_components already has {count} records, skipping seed")
                return

            seeds = get_component_seeds()
            for item in seeds:
                await session.execute(
                    text("""
                        INSERT INTO registered_components (id, component_type, display_name, description,
                            icon, category, prop_schema, is_builtin, is_active)
                        VALUES (:id, :component_type, :display_name, :description,
                            :icon, :category, :prop_schema, :is_builtin, :is_active)
                    """),
                    {
                        "id": item["id"],
                        "component_type": item["component_type"],
                        "display_name": item["display_name"],
                        "description": item.get("description"),
                        "icon": item.get("icon"),
                        "category": item["category"],
                        "prop_schema": json.dumps(item["prop_schema"], ensure_ascii=False),
                        "is_builtin": item["is_builtin"],
                        "is_active": item["is_active"],
                    }
                )
            await session.commit()
            logger.success(f"Seeded {len(seeds)} registered components")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to seed components: {e}")
            raise


async def run_migration():
    """执行完整迁移流程"""
    logger.info("=" * 60)
    logger.info("Starting website template system migration...")
    logger.info("=" * 60)

    # Step 1: 创建表
    await create_tables()

    # Step 2: Seed 注册组件（无依赖，先执行）
    await seed_components()

    # Step 3: 创建页面模板 + slots（生成 template_map）
    template_map = await seed_website_templates()

    # Step 4: Seed 导航菜单（引用 template_map 设置 template_id）
    await seed_nav_menus(template_map)

    logger.success("Migration completed successfully!")
    logger.info("API endpoints ready:")
    logger.info("  GET  /api/v1/nav-menus           - 导航菜单列表(含template_id)")
    logger.info("  GET  /api/v1/website-templates   - 模板列表")
    logger.info("  GET  /api/v1/components          - 注册组件列表")


if __name__ == "__main__":
    asyncio.run(run_migration())
