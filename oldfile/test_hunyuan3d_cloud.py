"""
腾讯混元3D云端API测试脚本

使用方法：
1. 确保已在 .env 文件中配置 HUNYUAN3D_CLOUD_API_KEY
2. 准备一张测试图片（建议512x512或1024x1024）
3. 运行此脚本：python test_hunyuan3d_cloud.py

示例：
    python test_hunyuan3d_cloud.py --image test.png --model hy-3d-3.0
"""
import asyncio
import argparse
from pathlib import Path
from app.services.generation.hunyuan3d_cloud_service import get_hunyuan3d_cloud


async def test_generation(image_path: str, model_version: str = "hy-3d-3.0"):
    """测试3D生成"""
    print("=" * 60)
    print("🚀 腾讯混元3D云端API测试")
    print("=" * 60)
    
    # 检查图片是否存在
    image_file = Path(image_path)
    if not image_file.exists():
        print(f"❌ 错误：图片文件不存在 - {image_path}")
        return
    
    print(f"\n📷 测试图片: {image_path}")
    print(f"🎯 模型版本: {model_version}")
    print(f"💾 文件大小: {image_file.stat().st_size / 1024:.2f} KB")
    
    # 获取服务实例
    try:
        engine = get_hunyuan3d_cloud(model=model_version)
        print(f"✅ 服务初始化成功")
    except Exception as e:
        print(f"❌ 服务初始化失败: {e}")
        print("\n💡 提示：请检查 .env 文件中是否配置了 HUNYUAN3D_CLOUD_API_KEY")
        return
    
    # 设置输出路径
    output_path = f"test_output_{model_version.replace('-', '_')}.glb"
    
    print(f"\n⏳ 开始生成3D模型...")
    print(f"   预计耗时: 1-3分钟")
    print("-" * 60)
    
    try:
        # 调用生成API
        result = await engine.generate(
            image_path=str(image_path),
            output_path=output_path
        )
        
        if result['success']:
            print("\n" + "=" * 60)
            print("✅ 生成成功！")
            print("=" * 60)
            print(f"📦 输出文件: {result['output_path']}")
            print(f"⏱️  生成耗时: {result['generation_time']:.2f} 秒")
            print(f"💾 文件大小: {result['file_size'] / 1024:.2f} KB")
            print(f"🆔 任务ID: {result['task_id']}")
            print("=" * 60)
            print("\n💡 提示：可以使用以下命令查看模型：")
            print(f"   浏览器打开: http://localhost:8000/static/{Path(output_path).name}")
        else:
            print("\n" + "=" * 60)
            print("❌ 生成失败")
            print("=" * 60)
            print(f"错误信息: {result.get('error', '未知错误')}")
            
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ 发生异常")
        print("=" * 60)
        print(f"异常类型: {type(e).__name__}")
        print(f"异常信息: {str(e)}")
        import traceback
        traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(description="腾讯混元3D云端API测试")
    parser.add_argument(
        "--image", 
        type=str, 
        default="test_image.png",
        help="测试图片路径（默认: test_image.png）"
    )
    parser.add_argument(
        "--model", 
        type=str, 
        default="hy-3d-3.0",
        choices=["hy-3d-3.0", "hy-3d-3.1", "HY-3D-Express"],
        help="模型版本（默认: hy-3d-3.0）"
    )
    
    args = parser.parse_args()
    
    # 运行测试
    asyncio.run(test_generation(args.image, args.model))


if __name__ == "__main__":
    main()
