"""
系统健康检查脚本
检查GPU可用性、已安装的模型引擎和配置状态
"""
import sys
import logging
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HealthCheck")


def check_python_version():
    """检查Python版本"""
    version = sys.version_info
    logger.info(f"Python版本: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        logger.warning("⚠️  Python版本过低，建议使用3.9+")
        return False
    return True


def check_gpu():
    """检查GPU可用性"""
    logger.info("\n=== GPU检查 ===")
    
    try:
        import torch
        
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            
            logger.info(f"✅ GPU可用: {gpu_name}")
            logger.info(f"   显存: {gpu_memory:.1f} GB")
            logger.info(f"   CUDA版本: {torch.version.cuda}")
            logger.info(f"   PyTorch版本: {torch.__version__}")
            
            return True
        else:
            logger.warning("⚠️  未检测到CUDA GPU")
            logger.info("   提示: 可以使用Mock模式进行开发和测试")
            return False
            
    except ImportError:
        logger.warning("⚠️  PyTorch未安装")
        logger.info("   安装命令: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")
        return False
    except Exception as e:
        logger.error(f"❌ GPU检查失败: {e}")
        return False


def check_model_engines(has_gpu: bool):
    """检查可用的模型引擎"""
    logger.info("\n=== 模型引擎检查 ===")
    
    engines = {
        "sf3d": {
            "name": "SF3D (Stability AI)",
            "package": "sf3d",
            "min_memory": 9,
            "speed": "~0.5秒"
        },
        "triposr": {
            "name": "TripoSR (VAST-AI)",
            "package": "triposr",
            "min_memory": 6,
            "speed": "<1秒"
        },
        "instantmesh": {
            "name": "InstantMesh (Tencent ARC)",
            "package": "instantmesh",
            "min_memory": 12,
            "speed": "10-25秒"
        },
        "hunyuan3d": {
            "name": "Hunyuan3D-2.1 (腾讯)",
            "package": "hunyuan3d",
            "min_memory": 16,
            "speed": "30-60秒"
        }
    }
    
    available = []
    
    for engine_id, info in engines.items():
        try:
            __import__(info["package"])
            logger.info(f"✅ {info['name']} - 已安装")
            logger.info(f"   速度: {info['speed']} | 最低显存: {info['min_memory']}GB")
            available.append(engine_id)
        except ImportError:
            status = "❌ 未安装" if has_gpu else "⚪ 可选（需要GPU）"
            logger.info(f"{status} {info['name']}")
            logger.info(f"   安装: pip install {info['package']}")
    
    if available:
        logger.info(f"\n🎉 可用引擎: {', '.join(available)}")
    else:
        logger.info("\n💡 提示: 所有引擎都处于Mock模式，可以正常演示UI流程")
    
    return available


def check_backend_config():
    """检查后端配置"""
    logger.info("\n=== 后端配置检查 ===")
    
    env_file = Path("backend/.env")
    if env_file.exists():
        logger.info(f"✅ .env文件存在: {env_file.absolute()}")
        
        with open(env_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if "HUNYUAN3D_MODE" in content:
            mode = [line.split('=')[1].strip() for line in content.split('\n') 
                   if line.startswith('HUNYUAN3D_MODE=')]
            if mode:
                logger.info(f"   Hunyuan3D模式: {mode[0]}")
        else:
            logger.info("   ⚠️  HUNYUAN3D_MODE未配置（默认使用mock模式）")
    else:
        logger.info("⚠️  .env文件不存在")
        logger.info("   创建命令: cp backend/.env.example backend/.env")


def check_frontend():
    """检查前端依赖"""
    logger.info("\n=== 前端检查 ===")
    
    package_json = Path("src/web-frontend/package.json")
    if package_json.exists():
        logger.info(f"✅ package.json存在")
        
        import json
        with open(package_json, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        deps = data.get("dependencies", {})
        
        required_deps = ["react", "@sparkjsdev/spark", "three"]
        for dep in required_deps:
            if dep in deps:
                logger.info(f"✅ {dep}: {deps[dep]}")
            else:
                logger.warning(f"⚠️  {dep} 未找到")
    else:
        logger.error("❌ package.json不存在")


def check_directory_structure():
    """检查目录结构"""
    logger.info("\n=== 目录结构检查 ===")
    
    required_dirs = [
        "backend/app/services/generation",
        "src/web-frontend/src/pages/Generation",
        "uploads/generation"
    ]
    
    for dir_path in required_dirs:
        path = Path(dir_path)
        if path.exists():
            logger.info(f"✅ {dir_path}")
        else:
            logger.warning(f"⚠️  {dir_path} 不存在")
            path.mkdir(parents=True, exist_ok=True)
            logger.info(f"   已创建: {dir_path}")


def print_summary(has_gpu: bool, available_engines: list):
    """打印总结"""
    logger.info("\n" + "="*60)
    logger.info("📊 系统状态总结")
    logger.info("="*60)
    
    if has_gpu:
        logger.info("✅ GPU: 可用")
        if available_engines:
            logger.info(f"✅ 真实引擎: {', '.join(available_engines)}")
            logger.info("🎯 可以进行真实的图片转3D生成！")
        else:
            logger.info("⚠️  无真实引擎，但可以使用Mock模式")
            logger.info("💡 建议: 部署至少一个引擎以获得真实效果")
    else:
        logger.info("⚠️  GPU: 不可用")
        logger.info("💻 当前模式: Mock模式（演示用）")
        logger.info("📝 说明:")
        logger.info("   - UI和交互流程完全可用")
        logger.info("   - 返回的是示例模型文件")
        logger.info("   - 部署GPU后可启用真实生成功能")
    
    logger.info("\n🔗 访问地址:")
    logger.info("   前端: http://localhost:5173")
    logger.info("   后端: http://localhost:8000")
    logger.info("   API文档: http://localhost:8000/docs")
    
    logger.info("\n🚀 下一步:")
    if not has_gpu:
        logger.info("   1. 查看部署指南: docs/03-技术文档/AI模型部署指南.md")
        logger.info("   2. 准备GPU环境（NVIDIA RTX 3060+）")
        logger.info("   3. 安装CUDA和PyTorch")
    elif not available_engines:
        logger.info("   1. 选择并安装一个模型引擎（推荐SF3D或TripoSR）")
        logger.info("   2. 参考: docs/03-技术文档/AI模型部署指南.md")
    else:
        logger.info("   1. 启动服务: cd backend && uvicorn app.main:app --reload")
        logger.info("   2. 访问前端进行测试")
        logger.info("   3. 上传图片体验真实3D生成！")
    
    logger.info("="*60)


def main():
    """主函数"""
    logger.info("🔍 Web3D 系统健康检查\n")
    
    # 检查Python版本
    check_python_version()
    
    # 检查GPU
    has_gpu = check_gpu()
    
    # 检查模型引擎
    available_engines = check_model_engines(has_gpu)
    
    # 检查配置
    check_backend_config()
    
    # 检查前端
    check_frontend()
    
    # 检查目录结构
    check_directory_structure()
    
    # 打印总结
    print_summary(has_gpu, available_engines)


if __name__ == "__main__":
    main()
