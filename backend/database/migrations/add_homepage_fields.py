"""
数据库迁移：为 models_3d 表新增首页展示字段
Database migration: Add homepage display fields to models_3d table
"""
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.database import engine, Base
from app.models.model import Model3D
from sqlalchemy import inspect, text
from loguru import logger


async def add_homepage_fields():
    """为 models_3d 表新增首页展示相关字段"""
    try:
        # 检查表是否存在
        async with engine.begin() as conn:
            def table_exists(sync_conn):
                inspector = inspect(sync_conn)
                return inspector.has_table("models_3d")
            exists = await conn.run_sync(table_exists)
            
            if not exists:
                logger.warning("models_3d 表不存在，跳过迁移")
                return False

            # 检查字段是否已存在
            def get_columns(sync_conn):
                inspector = inspect(sync_conn)
                return [col["name"] for col in inspector.get_columns("models_3d")]
            existing_columns = await conn.run_sync(get_columns)
            logger.info(f"models_3d 现有字段: {existing_columns}")

            # 逐个添加缺失字段
            new_columns = [
                ("display_name", "VARCHAR(255)", "ALTER TABLE models_3d ADD COLUMN display_name VARCHAR(255)"),
                ("icon", "VARCHAR(50)", "ALTER TABLE models_3d ADD COLUMN icon VARCHAR(50)"),
                ("color_hex", "VARCHAR(7)", "ALTER TABLE models_3d ADD COLUMN color_hex VARCHAR(7)"),
                ("show_on_homepage", "BOOLEAN", "ALTER TABLE models_3d ADD COLUMN show_on_homepage BOOLEAN DEFAULT 0"),
                ("show_in_gallery", "BOOLEAN", "ALTER TABLE models_3d ADD COLUMN show_in_gallery BOOLEAN DEFAULT 0"),
                ("sort_order", "INTEGER", "ALTER TABLE models_3d ADD COLUMN sort_order INTEGER DEFAULT 0"),
                ("model_url_fallback", "TEXT", "ALTER TABLE models_3d ADD COLUMN model_url_fallback TEXT"),
            ]

            for col_name, col_type, alter_sql in new_columns:
                if col_name not in existing_columns:
                    try:
                        await conn.execute(text(alter_sql))
                        logger.info(f"  ✅ 新增字段: {col_name} ({col_type})")
                    except Exception as e:
                        logger.warning(f"  ⚠️ 新增字段 {col_name} 失败: {e}")
                else:
                    logger.info(f"  ℹ️  字段已存在: {col_name}")

            logger.success("✅ models_3d 表首页展示字段迁移完成！")
            return True

    except Exception as e:
        logger.error(f"❌ 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import asyncio
    success = asyncio.run(add_homepage_fields())
    sys.exit(0 if success else 1)
