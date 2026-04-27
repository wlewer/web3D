"""检查数据库中的用户"""
import asyncio
from app.database import async_session_maker
from sqlalchemy import select
from app.models.user import User
from loguru import logger


async def check_users():
    """检查所有用户"""
    db = async_session_maker()
    
    try:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        if not users:
            logger.info("❌ 数据库中没有用户")
            return
        
        logger.info(f"📋 数据库中共有 {len(users)} 个用户：\n")
        
        for user in users:
            logger.info(f"   ID: {user.id}")
            logger.info(f"   用户名: {user.username}")
            logger.info(f"   邮箱: {user.email}")
            logger.info(f"   角色: {user.role}")
            logger.info(f"   状态: {user.status}")
            logger.info(f"   创建时间: {user.created_at}")
            logger.info("-" * 50)
        
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(check_users())
