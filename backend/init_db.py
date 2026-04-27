"""初始化数据库表"""
import asyncio
from app.database import engine, Base
# 导入所有模型以注册到 Base.metadata
from app.models import User, Model3D


async def create_tables():
    """创建所有数据库表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created successfully!")
    print(f"📋 Tables: {list(Base.metadata.tables.keys())}")


if __name__ == "__main__":
    asyncio.run(create_tables())
