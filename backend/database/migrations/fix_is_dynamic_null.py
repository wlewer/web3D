"""
数据库迁移：修复 template_slots.is_dynamic NULL 值
Migration: Fix NULL values in template_slots.is_dynamic column

运行方式:
    cd backend && python database/migrations/fix_is_dynamic_null.py
    或: python -m backend.database.migrations.fix_is_dynamic_null
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import asyncio
from sqlalchemy import text
from loguru import logger

from app.database import async_session_maker


async def fix_is_dynamic_null():
    """将所有NULL值更新为False"""
    async with async_session_maker() as session:
        try:
            # 1. 统计当前NULL值数量
            result = await session.execute(
                text("SELECT COUNT(*) FROM template_slots WHERE is_dynamic IS NULL")
            )
            null_count = result.scalar()
            logger.info(f"Found {null_count} template_slots with is_dynamic=NULL")

            # 2. 更新所有NULL值为0 (False)
            if null_count > 0:
                await session.execute(
                    text("UPDATE template_slots SET is_dynamic = 0 WHERE is_dynamic IS NULL")
                )
                await session.commit()
                logger.success(f"Updated {null_count} records: is_dynamic NULL -> False")
            else:
                logger.info("No NULL values found, nothing to fix")

            # 3. 验证修复结果
            result = await session.execute(
                text("SELECT COUNT(*) FROM template_slots WHERE is_dynamic IS NULL")
            )
            remaining = result.scalar()
            if remaining == 0:
                logger.success("All is_dynamic NULL values have been fixed")
            else:
                logger.warning(f"Still {remaining} NULL values remaining")

        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to fix is_dynamic NULL values: {e}")
            raise


if __name__ == "__main__":
    logger.info("Starting is_dynamic NULL fix migration...")
    asyncio.run(fix_is_dynamic_null())
    logger.info("Migration completed")
