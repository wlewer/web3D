"""重置管理员密码"""
import asyncio
from app.database import async_session_maker
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select


async def reset_admin_password():
    """重置管理员密码为 Admin123456"""
    async with async_session_maker() as db:
        try:
            # 查找管理员
            result = await db.execute(
                select(User).where(User.username == 'admin')
            )
            user = result.scalar_one_or_none()
            
            if not user:
                print('❌ 未找到管理员账户')
                return
            
            # 重置密码
            new_password = 'Admin123456'
            user.password_hash = get_password_hash(new_password)
            
            await db.commit()
            await db.refresh(user)
            
            print('✅ 管理员密码重置成功！')
            print('=' * 50)
            print(f'用户名: admin')
            print(f'邮箱: {user.email}')
            print(f'新密码: {new_password}')
            print(f'角色: {user.role}')
            print('=' * 50)
            print('\n现在可以使用以上凭据登录后台管理系统')
            
        except Exception as e:
            print(f'❌ 重置失败: {e}')
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(reset_admin_password())
