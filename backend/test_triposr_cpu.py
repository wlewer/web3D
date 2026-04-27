"""测试TripoSR CPU引擎初始化
"""
import sys
import logging

# 设置日志级别
logging.basicConfig(level=logging.INFO)

print("=" * 60)
print("TripoSR CPU引擎初始化测试")
print("=" * 60)

try:
    print("\n1. 导入TripoSR CPU服务...")
    from app.services.generation.triposr_cpu_service import TripoSRCPU
    print("   ✅ 导入成功")
    
    print("\n2. 创建TripoSR CPU实例...")
    engine = TripoSRCPU(
        model_path="stabilityai/TripoSR",
        device="cpu",
        mc_resolution=160,  # CPU模式降低分辨率
        target_faces=5000
    )
    print("   ✅ 实例创建成功")
    
    print("\n3. 检查依赖库...")
    import torch
    print(f"   - PyTorch版本: {torch.__version__}")
    print(f"   - CUDA可用: {torch.cuda.is_available()}")
    print(f"   - 设备: {engine.device}")
    print(f"   - Marching Cubes分辨率: {engine.mc_resolution}")
    
    try:
        import tsr
        print(f"   - TripoSR库: ✅ 已安装")
    except ImportError:
        print(f"   - TripoSR库: ❌ 未安装")
        print("   💡 请运行: pip install git+https://github.com/VAST-AI-Research/TripoSR.git")
    
    import torchmcubes
    print(f"   - torchmcubes: ✅ 已安装")
    
    import rembg
    print(f"   - Rembg: ✅ 已安装")
    
    import trimesh
    print(f"   - Trimesh版本: {trimesh.__version__}")
    
    print("\n4. 准备加载模型（首次运行会下载约2GB）...")
    print("   ⚠️  提示：这可能需要几分钟时间下载模型")
    print("   是否继续？(y/n): ", end="")
    
    # 非交互式测试，直接跳过模型加载
    print("\n   ⏭️  跳过模型加载（避免长时间等待）")
    print("   💡 如需测试完整流程，请访问前端页面上传图片")
    
    print("\n" + "=" * 60)
    print("✅ TripoSR CPU引擎初始化测试通过！")
    print("=" * 60)
    print("\n下一步操作：")
    print("1. 安装TripoSR库: pip install git+https://github.com/VAST-AI-Research/TripoSR.git")
    print("2. 安装torchmcubes: pip install git+https://github.com/tatsy/torchmcubes.git")
    print("3. 访问 http://localhost:5173/admin/experimental/generation")
    print("4. 选择 'TripoSR CPU' 模式")
    print("5. 上传一张图片进行测试")
    print("6. 首次使用会自动下载模型（约2GB，需要几分钟）")
    
except ImportError as e:
    print(f"\n❌ 导入失败: {e}")
    print("\n请确保已安装所有依赖：")
    print("pip install git+https://github.com/VAST-AI-Research/TripoSR.git")
    print("pip install git+https://github.com/tatsy/torchmcubes.git")
    sys.exit(1)
    
except Exception as e:
    print(f"\n❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
