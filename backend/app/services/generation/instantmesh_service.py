"""
InstantMesh 3D生成服务
InstantMesh Generation Service - High-quality mesh generation (10-25 seconds)

GitHub: https://github.com/TencentARC/InstantMesh
速度: 10-25秒 | 显存: 8-12GB | 许可证: 待确认
"""
import time
import shutil
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class InstantMeshService:
    """InstantMesh 3D生成服务
    
    优势：高质量网格生成
    - 精细建模
    - 高质量纹理
    - 适合专业项目
    """
    
    def __init__(self, mode: str = "mock"):
        self.mode = mode
        self.model = None
        logger.info(f"InstantMeshService initialized in {mode.upper()} mode")
    
    async def generate_from_image(self, image_path: str, **kwargs) -> dict:
        """从图片生成3D模型"""
        if self.mode == "mock":
            return await self._mock_generate(image_path)
        else:
            return await self._real_generate(image_path)
    
    async def _mock_generate(self, image_path: str) -> dict:
        """Mock模式：模拟生成（15秒）"""
        uid = f"instantmesh_{int(time.time())}"
        logger.info(f"[InstantMesh MOCK] Generating: {uid}")
        
        output_dir = Path("uploads/generation") / uid
        output_dir.mkdir(parents=True, exist_ok=True)
        
        demo_glb = Path(__file__).parent.parent.parent.parent.parent / "src/hunyuan3d/assets/1.glb"
        output_glb = output_dir / "model.glb"
        
        if demo_glb.exists():
            shutil.copy2(demo_glb, output_glb)
        
        import asyncio
        await asyncio.sleep(15)  # 模拟较长的生成时间
        
        return {
            "uid": uid,
            "status": "completed",
            "glb_path": str(output_glb),
            "generation_time": 15,
            "warning": "MOCK MODE - This is a demo model. Deploy InstantMesh for real generation."
        }
    
    async def _real_generate(self, image_path: str) -> dict:
        """真实GPU模式"""
        uid = f"instantmesh_{int(time.time())}"
        logger.info(f"[InstantMesh REAL] Generating: {uid}")
        
        # 尝试使用真实引擎
        try:
            from app.services.generation.real_generation_service import get_real_generation_service
            real_service = get_real_generation_service()
            
            if "instantmesh" in real_service.available_engines:
                output_dir = Path("uploads/generation") / uid
                output_dir.mkdir(parents=True, exist_ok=True)
                
                result = await real_service.generate_with_engine(
                    engine="instantmesh",
                    image_path=image_path,
                    output_dir=output_dir
                )
                
                return result
            else:
                logger.warning("InstantMesh engine not available, falling back to mock mode")
        except Exception as e:
            logger.error(f"Real InstantMesh generation failed: {e}, falling back to mock")
        
        # 回退到Mock结果
        return await self._mock_generate(image_path)


_instantmesh_service_instance: Optional[InstantMeshService] = None


def get_instantmesh_service(mode: str = "mock") -> InstantMeshService:
    """获取InstantMesh服务实例"""
    global _instantmesh_service_instance
    if _instantmesh_service_instance is None:
        _instantmesh_service_instance = InstantMeshService(mode=mode)
    return _instantmesh_service_instance
