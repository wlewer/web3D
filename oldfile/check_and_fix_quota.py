"""
检查和修复用户额度问题
Check and fix user quota issues
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import asyncio
from sqlalchemy import select
from app.database import get_db, engine
from app.models.quota import UserQuota
from app.services.quota_service import QuotaService
from app.models.user import User

async def check_and_fix_quota():
    """检查并修复用户额度"""
    print("=" * 60)
    print("用户额度检查与修复工具")
    print("=" * 60)
    print()
    
    async with engine.begin() as conn:
        # 创建异步会话
        from sqlalchemy.ext.asyncio import AsyncSession
        from sqlalchemy.orm import sessionmaker
        
        async_session = sessionmaker(
            conn, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as db:
            # 1. 检查所有用户
            print("[步骤1] 检查所有用户...")
            result = await db.execute(select(User))
            users = result.scalars().all()
            
            if not users:
                print("❌ 数据库中没有用户！")
                return
            
            print(f"✅ 找到 {len(users)} 个用户\n")
            
            # 2. 检查每个用户的额度
            print("[步骤2] 检查用户额度...")
            for user in users:
                print(f"\n用户: {user.username} (ID: {user.id})")
                print(f"  邮箱: {user.email}")
                print(f"  角色: {user.role}")
                
                # 查询额度记录
                result = await db.execute(
                    select(UserQuota).where(UserQuota.user_id == user.id)
                )
                quota = result.scalar_one_or_none()
                
                if not quota:
                    print(f"  ❌ 额度记录不存在")
                    print(f"  🔧 正在创建默认额度记录...")
                    
                    # 创建默认额度
                    quota_service = QuotaService(db)
                    new_quota = await quota_service.get_or_create_quota(user.id, 'standard')
                    
                    print(f"  ✅ 已创建额度记录:")
                    print(f"     总额度: {new_quota.total_quota} 积分")
                    print(f"     已使用: {new_quota.used_quota} 积分")
                    print(f"     剩余: {new_quota.remaining_quota} 积分")
                else:
                    print(f"  ✅ 额度记录存在")
                    print(f"     总额度: {quota.total_quota} 积分")
                    print(f"     已使用: {quota.used_quota} 积分")
                    print(f"     剩余: {quota.remaining_quota} 积分")
                    
                    # 检查是否有问题
                    if quota.total_quota == 0:
                        print(f"  ⚠️  总额度为0！正在修复...")
                        quota.total_quota = 200
                        quota.remaining_quota = 200 - quota.used_quota
                        await db.commit()
                        print(f"  ✅ 已修复: 总额度=200, 剩余={quota.remaining_quota}")
                    elif quota.remaining_quota != quota.total_quota - quota.used_quota:
                        print(f"  ⚠️  剩余额度计算不正确！正在修复...")
                        quota.remaining_quota = quota.total_quota - quota.used_quota
                        await db.commit()
                        print(f"  ✅ 已修复: 剩余={quota.remaining_quota}")
            
            # 3. 总结
            print("\n" + "=" * 60)
            print("[步骤3] 检查完成！")
            print("=" * 60)
            
            # 再次查询所有额度
            result = await db.execute(select(UserQuota))
            all_quotas = result.scalars().all()
            
            print(f"\n总计: {len(all_quotas)} 个额度记录")
            for quota in all_quotas:
                user_result = await db.execute(select(User).where(User.id == quota.user_id))
                user = user_result.scalar_one_or_none()
                username = user.username if user else 'Unknown'
                print(f"  - {username}: 总额度={quota.total_quota}, 已使用={quota.used_quota}, 剩余={quota.remaining_quota}")
            
            print("\n✅ 所有用户额度已检查并修复！")
            print("\n💡 下一步:")
            print("  1. 刷新浏览器页面 (F5)")
            print("  2. 重新登录查看额度")
            print("  3. 测试3D生成功能")

if __name__ == "__main__":
    asyncio.run(check_and_fix_quota())
