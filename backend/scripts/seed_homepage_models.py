"""
数据种子脚本：为现有模型添加首页展示配置
Seed script: Configure existing models for homepage display

用法：cd backend && python scripts/seed_homepage_models.py

此脚本会为一批精选模型设置 show_on_homepage=true，
并分配 display_name / icon / color_hex / sort_order 等首页展示字段。
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
from sqlalchemy import select, text
from loguru import logger

from app.database import engine, async_session_maker
from app.models.model import Model3D

# 首页模型配置（按 sort_order 降序排列，越大越靠前）
# 字段: name_pattern, display_name, icon, color_hex, sort_order
HOMEPAGE_MODELS = [
    # 按 sort_order 降序：先出现的排序值更高（首页轮播靠前）
    {"name_like": "Butterfly Ai",        "display_name": "蓝色大闪蝶",  "icon": "🦋", "color_hex": "#667eea", "sort_order": 100},
    {"name_like": "Robot Head",          "display_name": "机器人头",    "icon": "🤖", "color_hex": "#06b6d4", "sort_order": 90},
    {"name_like": "Dessert 3DGS",        "display_name": "精致甜点",    "icon": "🍰", "color_hex": "#fd79a8", "sort_order": 80},
    {"name_like": "Penguin",             "display_name": "南极企鹅",   "icon": "🐧", "color_hex": "#ff6b6b", "sort_order": 70},
    {"name_like": "Woobles",             "display_name": "可爱玩偶",   "icon": "🧸", "color_hex": "#f093fb", "sort_order": 60},
    {"name_like": "Fireplace",           "display_name": "温馨壁炉",   "icon": "🔥", "color_hex": "#ff6b35", "sort_order": 50},
    {"name_like": "Valley",              "display_name": "山谷风光",   "icon": "🏔️", "color_hex": "#00b894", "sort_order": 40},
    {"name_like": "Snow Street",         "display_name": "雪街",       "icon": "❄️", "color_hex": "#74b9ff", "sort_order": 30},
    {"name_like": "Forge",               "display_name": "锻造炉",     "icon": "🔨", "color_hex": "#ff4757", "sort_order": 20},
    {"name_like": "Branzino Amarin",     "display_name": "海鲈鱼",     "icon": "🐟", "color_hex": "#00cec9", "sort_order": 15},
    {"name_like": "Furry Logo Pedestal", "display_name": "毛绒标志",   "icon": "🦊", "color_hex": "#e17055", "sort_order": 10},
    {"name_like": "Burger From Amboy",   "display_name": "汉堡包",     "icon": "🍔", "color_hex": "#e17055", "sort_order": 5},
]


async def seed_homepage_models():
    """为已有模型设置首页展示字段"""
    updated_count = 0
    not_found = []

    async with async_session_maker() as session:
        for cfg in HOMEPAGE_MODELS:
            # 使用 ilike 模糊匹配模型名称
            result = await session.execute(
                select(Model3D).where(Model3D.name.ilike(f"%{cfg['name_like']}%"))
            )
            model = result.scalar_one_or_none()

            if not model:
                not_found.append(cfg['name_like'])
                continue

            # 更新首页展示字段
            model.display_name = cfg['display_name']
            model.icon = cfg['icon']
            model.color_hex = cfg['color_hex']
            model.show_on_homepage = True
            model.show_in_gallery = True
            model.sort_order = cfg['sort_order']
            updated_count += 1
            logger.info(f"  ✅ {cfg['name_like']:30s} → {cfg['display_name']:10s} | sort={cfg['sort_order']}")

        await session.commit()

    # 输出结果
    total_configured = len([c for c in HOMEPAGE_MODELS if c['name_like'] not in not_found])
    logger.success(f"\n✅ 种子数据配置完成！")
    logger.info(f"   共配置 {updated_count}/{len(HOMEPAGE_MODELS)} 个首页模型")
    if not_found:
        logger.warning(f"   以下模型未在数据库中找到（可忽略，后续上传后再配置）：")
        for name in not_found:
            logger.warning(f"     - {name}")
    return True


async def main():
    logger.info("🚀 开始配置首页模型种子数据...")
    logger.info(f"   数据库: {engine.url}")
    
    try:
        success = await seed_homepage_models()
        if success:
            logger.info("\n💡 现在你可以刷新前端页面，首页将从API加载这些模型！")
        return success
    except Exception as e:
        logger.error(f"❌ 种子数据配置失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
