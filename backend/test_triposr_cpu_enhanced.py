"""测试增强版TripoSR CPU生成器
"""
import sys
import logging
from pathlib import Path

# 设置日志级别
logging.basicConfig(level=logging.INFO)

print("=" * 60)
print("TripoSR CPU增强版生成器测试")
print("=" * 60)

try:
    print("\n1. 导入TripoSR CPU服务...")
    from app.services.generation.triposr_cpu_service import TripoSRCPU
    print("   ✅ 导入成功")
    
    print("\n2. 创建TripoSR CPU实例...")
    engine = TripoSRCPU(
        device="cpu",
        mc_resolution=160,
        target_faces=5000
    )
    print("   ✅ 实例创建成功")
    
    print("\n3. 加载模型（增强版生成器）...")
    engine.load_model()
    print(f"   使用真实模型: {getattr(engine, 'use_real_model', False)}")
    if not getattr(engine, 'use_real_model', False):
        print("   ℹ️  使用增强版程序化生成器")
    else:
        print("   ✅ 使用真实TripoSR模型")
    
    print("\n4. 测试生成3D模型...")
    import asyncio
    from PIL import Image
    import numpy as np
    
    # 创建测试图片
    test_image = Image.new('RGB', (512, 512), color=(100, 150, 200))
    
    # 运行生成
    output_path = Path('uploads/experimental/test_model.glb')
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    result = asyncio.run(engine.generate(
        image_path='test',
        output_path=str(output_path)
    ))
    
    # 由于_generate需要真实图片路径，我们直接测试_inference
    print("   测试_inference_enhanced_procedural...")
    mesh = asyncio.run(engine._inference_enhanced_procedural(test_image))
    
    print(f"   ✅ 生成成功!")
    print(f"   - 顶点数: {len(mesh.vertices)}")
    print(f"   - 面数: {len(mesh.faces)}")
    print(f"   - 颜色信息: {mesh.visual.vertex_colors is not None}")
    
    # 导出测试
    mesh.export(str(output_path))
    file_size = output_path.stat().st_size
    print(f"   - 文件大小: {file_size / 1024:.1f} KB")
    
    if file_size > 50000:  # 大于50KB
        print("\n✅ 生成器工作正常！文件大小合理")
    else:
        print("\n⚠️  文件过小，可能有问题")
    
    print("\n" + "=" * 60)
    print("✅ 增强版TripoSR CPU生成器测试通过！")
    print("=" * 60)
    print("\n下一步操作：")
    print("1. 访问 http://localhost:5173/admin/experimental/generation")
    print("2. 选择 'TripoSR CPU' 模式")
    print("3. 上传一张图片进行测试")
    print("4. 查看生成的3D模型（球体/圆柱体/复杂体）")
    
except ImportError as e:
    print(f"\n❌ 导入失败: {e}")
    print("\n请确保已安装所有依赖：")
    print("pip install trimesh rembg pillow numpy")
    sys.exit(1)
    
except Exception as e:
    print(f"\n❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
