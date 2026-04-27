"""
真实3D生成服务 - 基于开源模型
Real 3D Generation Service using open-source models

支持多种生成引擎：
1. Hunyuan3D-2.1 (腾讯) - 高质量
2. TripoSR (VAST-AI) - 超快速
3. InstantMesh (Tencent ARC) - 精细网格
4. SF3D (Stability AI) - 平衡方案
"""
import asyncio
import time
import shutil
from pathlib import Path
from typing import Optional, Dict, Any
import logging
import subprocess
import os

logger = logging.getLogger(__name__)


class RealGenerationService:
    """真实3D生成服务
    
    根据可用硬件和配置选择合适的生成引擎
    """
    
    def __init__(self):
        self.available_engines = []
        self._detect_available_engines()
        
    def _detect_available_engines(self):
        """检测系统中可用的生成引擎"""
        # 检查是否有GPU
        has_gpu = self._check_gpu_availability()
        
        if has_gpu:
            logger.info("GPU detected, checking available generation engines...")
            
            # 检查Hunyuan3D
            if self._check_hunyuan3d():
                self.available_engines.append("hunyuan3d")
                
            # 检查TripoSR
            if self._check_triposr():
                self.available_engines.append("triposr")
                
            # 检查InstantMesh
            if self._check_instantmesh():
                self.available_engines.append("instantmesh")
                
            # 检查SF3D
            if self._check_sf3d():
                self.available_engines.append("sf3d")
        else:
            logger.warning("No GPU detected, only mock mode available")
        
        logger.info(f"Available engines: {self.available_engines}")
    
    def _check_gpu_availability(self) -> bool:
        """检查GPU可用性"""
        try:
            import torch
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                logger.info(f"GPU detected: {gpu_name} ({gpu_memory:.1f} GB)")
                return True
            else:
                logger.warning("No CUDA GPU found")
                return False
        except ImportError:
            logger.warning("PyTorch not installed")
            return False
        except Exception as e:
            logger.error(f"Error checking GPU: {e}")
            return False
    
    def _check_hunyuan3d(self) -> bool:
        """检查Hunyuan3D是否可用"""
        try:
            # 尝试导入Hunyuan3D
            import hunyuan3d
            logger.info("Hunyuan3D is available")
            return True
        except ImportError:
            logger.debug("Hunyuan3D not installed")
            return False
    
    def _check_triposr(self) -> bool:
        """检查TripoSR是否可用"""
        try:
            import triposr
            logger.info("TripoSR is available")
            return True
        except ImportError:
            logger.debug("TripoSR not installed")
            return False
    
    def _check_instantmesh(self) -> bool:
        """检查InstantMesh是否可用"""
        try:
            import instantmesh
            logger.info("InstantMesh is available")
            return True
        except ImportError:
            logger.debug("InstantMesh not installed")
            return False
    
    def _check_sf3d(self) -> bool:
        """检查SF3D是否可用"""
        try:
            import sf3d
            logger.info("SF3D is available")
            return True
        except ImportError:
            logger.debug("SF3D not installed")
            return False
    
    async def generate_with_engine(
        self,
        engine: str,
        image_path: str,
        output_dir: Path,
        **kwargs
    ) -> Dict[str, Any]:
        """
        使用指定引擎生成3D模型
        
        Args:
            engine: 生成引擎名称
            image_path: 输入图片路径
            output_dir: 输出目录
            **kwargs: 引擎特定参数
            
        Returns:
            {
                "uid": str,
                "status": str,
                "glb_path": str,
                "generation_time": float,
                "engine": str
            }
        """
        uid = f"{engine}_{int(time.time())}"
        logger.info(f"Starting generation with {engine}: {uid}")
        
        start_time = time.time()
        
        try:
            if engine == "hunyuan3d":
                result = await self._generate_hunyuan3d(image_path, output_dir, **kwargs)
            elif engine == "triposr":
                result = await self._generate_triposr(image_path, output_dir, **kwargs)
            elif engine == "instantmesh":
                result = await self._generate_instantmesh(image_path, output_dir, **kwargs)
            elif engine == "sf3d":
                result = await self._generate_sf3d(image_path, output_dir, **kwargs)
            else:
                raise ValueError(f"Unknown engine: {engine}")
            
            generation_time = time.time() - start_time
            
            return {
                "uid": uid,
                "status": "completed",
                "glb_path": result["glb_path"],
                "generation_time": generation_time,
                "engine": engine
            }
            
        except Exception as e:
            logger.error(f"Generation failed with {engine}: {e}", exc_info=True)
            raise
    
    async def _generate_hunyuan3d(
        self,
        image_path: str,
        output_dir: Path,
        enable_texture: bool = False,
        octree_resolution: int = 256,
        num_steps: int = 30,
        guidance_scale: float = 7.5,
        seed: int = 1234,
        **kwargs
    ) -> Dict[str, str]:
        """使用Hunyuan3D生成3D模型"""
        try:
            from hunyuan3d import Hunyuan3DPipeline
            
            pipeline = Hunyuan3DPipeline.from_pretrained(
                "tencent/Hunyuan3D-2mini",
                torch_dtype=torch.float16
            ).to("cuda")
            
            output_glb = output_dir / "model.glb"
            
            # 生成3D模型
            mesh = pipeline(
                image_path=image_path,
                enable_texture=enable_texture,
                octree_resolution=octree_resolution,
                num_inference_steps=num_steps,
                guidance_scale=guidance_scale,
                seed=seed
            )
            
            # 导出为GLB
            mesh.export(str(output_glb))
            
            logger.info(f"Hunyuan3D generation completed: {output_glb}")
            return {"glb_path": str(output_glb)}
            
        except Exception as e:
            logger.error(f"Hunyuan3D generation error: {e}")
            raise
    
    async def _generate_triposr(
        self,
        image_path: str,
        output_dir: Path,
        **kwargs
    ) -> Dict[str, str]:
        """使用TripoSR生成3D模型"""
        try:
            from triposr import TripoSRLite
            
            model = TripoSRLite.from_pretrained("VAST-AI/TripoSR-Lite")
            output_glb = output_dir / "model.glb"
            
            # 快速生成
            mesh = model.generate(image_path, target_face_count=5000)
            mesh.export(str(output_glb))
            
            logger.info(f"TripoSR generation completed: {output_glb}")
            return {"glb_path": str(output_glb)}
            
        except Exception as e:
            logger.error(f"TripoSR generation error: {e}")
            raise
    
    async def _generate_instantmesh(
        self,
        image_path: str,
        output_dir: Path,
        target_face_count: int = 10000,
        texture_size: int = 1024,
        **kwargs
    ) -> Dict[str, str]:
        """使用InstantMesh生成3D模型"""
        try:
            from instantmesh import InstantMeshPipeline
            
            pipeline = InstantMeshPipeline.from_pretrained(
                "TencentARC/InstantMesh"
            ).to("cuda")
            
            output_glb = output_dir / "model.glb"
            
            # 生成高质量网格
            mesh = pipeline(
                image_path=image_path,
                target_face_count=target_face_count,
                texture_size=texture_size
            )
            
            mesh.export(str(output_glb))
            
            logger.info(f"InstantMesh generation completed: {output_glb}")
            return {"glb_path": str(output_glb)}
            
        except Exception as e:
            logger.error(f"InstantMesh generation error: {e}")
            raise
    
    async def _generate_sf3d(
        self,
        image_path: str,
        output_dir: Path,
        target_face_count: int = 10000,
        texture_size: int = 1024,
        **kwargs
    ) -> Dict[str, str]:
        """使用SF3D生成3D模型"""
        try:
            from sf3d import SF3DPipeline
            
            pipeline = SF3DPipeline.from_pretrained(
                "stabilityai/sf3d"
            ).to("cuda")
            
            output_glb = output_dir / "model.glb"
            
            # 极速生成
            mesh = pipeline(
                image_path=image_path,
                target_face_count=target_face_count,
                texture_size=texture_size
            )
            
            mesh.export(str(output_glb))
            
            logger.info(f"SF3D generation completed: {output_glb}")
            return {"glb_path": str(output_glb)}
            
        except Exception as e:
            logger.error(f"SF3D generation error: {e}")
            raise


# 全局服务实例
_real_service_instance: Optional[RealGenerationService] = None


def get_real_generation_service() -> RealGenerationService:
    """获取真实生成服务实例"""
    global _real_service_instance
    
    if _real_service_instance is None:
        _real_service_instance = RealGenerationService()
    
    return _real_service_instance
