"""检查管理员账户信息"""
import asyncio
from app.database import async_session_maker
from app.models.user import User
from sqlalchemy import select


async def check_admin():
    """检查管理员账户"""
    async with async_session_maker() as db:
        result = await db.execute(
            select(User).where(User.username == 'admin')
        )
        user = result.scalar_one_or_none()
        
        if user:
            print('✅ 找到管理员账户')
            print('=' * 50)
            print(f'用户名: {user.username}')
            print(f'邮箱: {user.email}')
            print(f'角色: {user.role}')
            print(f'状态: {user.status}')
            print(f'密码哈希前50字符: {user.password_hash[:50]}...')
            print('=' * 50)
            print('\n提示: 如果登录失败，可能需要重置密码')
        else:
            print('❌ 未找到管理员账户')


if __name__ == "__main__":
    asyncio.run(check_admin())
