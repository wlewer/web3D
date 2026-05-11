"""
将真实生成的混元3D模型添加到数据库
"""
import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.database import async_session_maker
from app.models.model import Model3D


async def add_model_to_database():
    """将模型添加到数据库"""
    
    # 模型文件路径
    model_path = Path("uploads/generation/hunyuan_6c6b3457/model_hunyuan_cloud_6c6b3457.glb")
    
    if not model_path.exists():
        print(f"❌ 模型文件不存在: {model_path}")
        return
    
    # 获取文件大小
    file_size = model_path.stat().st_size
    print(f"📦 模型文件大小: {file_size / 1024 / 1024:.2f} MB")
    
    try:
        async with async_session_maker() as db:
            # 创建模型记录
            model = Model3D(
                name="混元3D真实生成模型_6c6b3457",
                description="通过腾讯混元3D云端API（专业版 hy-3d-3.1）真实生成的3D模型",
                category='other',
                status='approved',  # 审核通过
                model_url=str(model_path),
                format='glb',
                file_size=file_size,
                created_by='00000000-0000-0000-0000-000000000000',  # 系统用户ID
                tags=["AI生成", "混元3D", "云端", "真实生成", "专业版"],
                metadata_json={
                    "generation_engine": "hunyuan3d_cloud",
                    "api_version": "hy-3d-3.1",
                    "generation_time": "2026-04-27"
                }
            )
            
            db.add(model)
            await db.commit()
            await db.refresh(model)
            
            print(f"\n✅ 模型已成功添加到数据库！")
            print(f"📋 模型ID: {model.id}")
            print(f"📝 模型名称: {model.name}")
            print(f"📂 文件路径: {model.model_url}")
            print(f"📏 文件大小: {model.file_size / 1024 / 1024:.2f} MB")
            print(f"🏷️  格式: {model.format}")
            print(f"🔧 生成引擎: hunyuan3d_cloud")
            print(f"✨ 状态: {model.status}")
            print(f"🏷️  标签: {model.tags}")
            
    except Exception as e:
        print(f"\n❌ 添加模型失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("=" * 60)
    print("🎯 将真实生成的混元3D模型添加到数据库")
    print("=" * 60)
    print()
    
    asyncio.run(add_model_to_database())
    
    print()
    print("=" * 60)
    print("✅ 完成！")
    print("=" * 60)
