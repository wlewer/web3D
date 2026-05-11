"""
测试云端3D生成API
Test cloud 3D generation API
"""
import asyncio
import sys
from pathlib import Path

# 添加backend到路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.generation.hunyuan3d_service import get_hunyuan3d_service


async def test_cloud_generation():
    """测试云端生成"""
    print("=" * 60)
    print("🧪 测试云端3D生成API")
    print("=" * 60)
    
    # 获取服务实例
    try:
        service = get_hunyuan3d_service()
        print(f"✅ 服务初始化成功")
        print(f"   模式: {service.mode}")
        print(f"   API版本: {service.api_version}")
        print(f"   SecretId: {service.secret_id[:20]}...")
    except Exception as e:
        print(f"❌ 服务初始化失败: {e}")
        return
    
    # 检查cloud_service是否初始化
    if service.mode == "cloud":
        if service.cloud_service:
            print(f"✅ 云端服务已初始化")
        else:
            print(f"❌ 云端服务未初始化")
            return
    
    # 测试图片路径
    test_image = Path("uploads/generation/test_image.png")
    if not test_image.exists():
        print(f"\n❌ 测试图片不存在: {test_image}")
        print("请先上传一张测试图片到 uploads/generation/test_image.png")
        return
    
    print(f"\n📷 测试图片: {test_image}")
    print(f"💾 文件大小: {test_image.stat().st_size / 1024:.2f} KB")
    
    print(f"\n⏳ 开始生成3D模型...")
    print(f"   预计耗时: 1-3分钟")
    print("-" * 60)
    
    try:
        # 调用生成API
        result = await service.generate_from_image(
            image_path=str(test_image),
            enable_texture=False
        )
        
        print("\n" + "=" * 60)
        if result.get('status') == 'completed':
            print("✅ 生成成功！")
            print("=" * 60)
            print(f"🆔 任务ID: {result['uid']}")
            print(f"📦 输出文件: {result.get('glb_path', 'N/A')}")
            print(f"⏱️  生成耗时: {result.get('generation_time', 0):.2f} 秒")
            print("=" * 60)
        else:
            print("❌ 生成失败")
            print("=" * 60)
            print(f"错误信息: {result.get('error', '未知错误')}")
            print("=" * 60)
            
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ 发生异常")
        print("=" * 60)
        print(f"异常类型: {type(e).__name__}")
        print(f"异常信息: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_cloud_generation())
