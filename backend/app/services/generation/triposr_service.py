"""
TripoSR 3D生成服务
TripoSR Generation Service - Ultra-fast concept verification (<1 second)

GitHub: https://github.com/VAST-AI-Research/TripoSR
速度: <1秒 | 显存: 4-6GB | 许可证: MIT
"""
import time
import shutil
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class TripoSRService:
    """TripoSR 3D生成服务
    
    优势：极速生成，适合概念验证
    - 超快：<1秒
    - 低显存：仅需4-6GB
    - 适合批量处理
    """
    
    def __init__(self, mode: str = "mock"):
        self.mode = mode
        self.model = None
        logger.info(f"TripoSRService initialized in {mode.upper()} mode")
    
    async def generate_from_image(self, image_path: str, **kwargs) -> dict:
        """从图片生成3D模型"""
        if self.mode == "mock":
            return await self._mock_generate(image_path)
        else:
            return await self._real_generate(image_path)
    
    async def _mock_generate(self, image_path: str) -> dict:
        """Mock模式：模拟快速生成（0.8秒）"""
        uid = f"triposr_{int(time.time())}"
        logger.info(f"[TripoSR MOCK] Generating: {uid}")
        
        output_dir = Path("uploads/generation") / uid
        output_dir.mkdir(parents=True, exist_ok=True)
        
        demo_glb = Path(__file__).parent.parent.parent.parent.parent / "src/hunyuan3d/assets/1.glb"
        output_glb = output_dir / "model.glb"
        
        if demo_glb.exists():
            shutil.copy2(demo_glb, output_glb)
        
        import asyncio
        await asyncio.sleep(0.8)
        
        return {
            "uid": uid,
            "status": "completed",
            "glb_path": str(output_glb),
            "generation_time": 0.8,
            "warning": "MOCK MODE - This is a demo model. Deploy TripoSR for real generation."
        }
    
    async def _real_generate(self, image_path: str) -> dict:
        """真实GPU模式"""
        uid = f"triposr_{int(time.time())}"
        logger.info(f"[TripoSR REAL] Generating: {uid}")
        
        # 尝试使用真实引擎
        try:
            from app.services.generation.real_generation_service import get_real_generation_service
            real_service = get_real_generation_service()
            
            if "triposr" in real_service.available_engines:
                output_dir = Path("uploads/generation") / uid
                output_dir.mkdir(parents=True, exist_ok=True)
                
                result = await real_service.generate_with_engine(
                    engine="triposr",
                    image_path=image_path,
                    output_dir=output_dir
                )
                
                return result
            else:
                logger.warning("TripoSR engine not available, falling back to mock mode")
        except Exception as e:
            logger.error(f"Real TripoSR generation failed: {e}, falling back to mock")
        
        # 回退到Mock结果
        return await self._mock_generate(image_path)


_triposr_service_instance: Optional[TripoSRService] = None


def get_triposr_service(mode: str = "mock") -> TripoSRService:
    """获取TripoSR服务实例"""
    global _triposr_service_instance
    if _triposr_service_instance is None:
        _triposr_service_instance = TripoSRService(mode=mode)
    return _triposr_service_instance
