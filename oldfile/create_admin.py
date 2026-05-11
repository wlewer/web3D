"""创建默认管理员账户"""
import asyncio
from app.database import async_session_maker
from app.models.user import User
from app.services.auth_service import auth_service
from app.schemas.auth import UserCreate


async def create_admin():
    """创建默认管理员账户"""
    async with async_session_maker() as db:
        try:
            # 检查是否已存在管理员
            from sqlalchemy import select
            result = await db.execute(
                select(User).where(User.username == 'admin')
            )
            existing_admin = result.scalar_one_or_none()
            
            if existing_admin:
                print('⚠️  管理员账户已存在，跳过创建')
                print(f'用户名: {existing_admin.username}')
                print(f'邮箱: {existing_admin.email}')
                return
            
            # 创建管理员账户
            user_data = UserCreate(
                username='admin',
                email='admin@web3d.com',
                password='Admin123456',
                role='admin'
            )
            
            result = await auth_service.register(db, user_data)
            
            # 提交事务
            await db.commit()
            
            print('✅ 管理员账户创建成功！')
            print('=' * 50)
            print(f'用户名: admin')
            print(f'邮箱: admin@web3d.com')
            print(f'密码: Admin123456')
            print(f'角色: admin')
            print('=' * 50)
            print('\n请使用以上凭据登录后台管理系统')
            
        except Exception as e:
            print(f'❌ 创建失败: {e}')
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(create_admin())
