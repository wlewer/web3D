"""
Hunyuan3D AI 生成服务
Hunyuan3D AI Generation Service
"""
import httpx
import asyncio
from typing import Optional
from pathlib import Path
import base64
import logging
import os

logger = logging.getLogger(__name__)


class Hunyuan3DService:
    """Hunyuan3D AI 生成服务封装
    
    支持三种运行模式：
    1. Mock模式 - 用于本地演示和技术验证
    2. Local模式 - 本地GPU服务 (http://localhost:8081)
    3. Cloud模式 - 腾讯官方云服务 (https://hy3d.dev)
    """
    
    def __init__(
        self,
        mode: str = "mock",  # mock | local | cloud
        base_url: str = "http://localhost:8081",
        cloud_api_key: str = None,  # 腾讯云服务 API Key
        secret_id: str = None,  # 腾讯云SecretId
        secret_key: str = None,  # 腾讯云SecretKey
        api_version: str = "rapid",  # rapid/pro
        timeout: int = 300  # 5分钟超时
    ):
        self.mode = mode
        self.base_url = base_url
        self.cloud_api_key = cloud_api_key
        self.secret_id = secret_id
        self.secret_key = secret_key
        self.api_version = api_version
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
        
        # cloud模式时初始化云端服务
        if mode == "cloud":
            try:
                from .hunyuan3d_cloud_service import Hunyuan3DCloudService
                self.cloud_service = Hunyuan3DCloudService(
                    secret_id=secret_id,
                    secret_key=secret_key,
                    version=api_version
                )
                logger.info(f"Hunyuan3DService initialized in {mode.upper()} mode with {api_version} version")
            except Exception as e:
                logger.error(f"Failed to initialize cloud service: {e}")
                raise
        else:
            self.cloud_service = None
            logger.info(f"Hunyuan3DService initialized in {mode.upper()} mode")
    
    async def generate_from_image(
        self,
        image_path: str,
        enable_texture: bool = False,
        octree_resolution: int = 128,
        num_steps: int = 5,
        guidance_scale: float = 5.0,
        seed: int = 1234
    ) -> dict:
        """
        从图片生成 3D 模型
        
        Args:
            image_path: 图片文件路径
            enable_texture: 是否生成纹理
            octree_resolution: 八叉树分辨率 (128/256/512)
            num_steps: 推理步数
            guidance_scale: 引导系数
            seed: 随机种子
            
        Returns:
            {
                "uid": "xxx",
                "status": "processing",
                "glb_path": None  # 完成后填充
            }
        """
        # 根据模式选择不同的生成方式
        if self.mode == "mock":
            return await self._mock_generate(image_path)
        elif self.mode == "local":
            return await self._local_generate(image_path, enable_texture, octree_resolution, num_steps, guidance_scale, seed)
        elif self.mode == "cloud":
            return await self._cloud_generate(image_path, enable_texture)
        else:
            raise ValueError(f"Unknown mode: {self.mode}")
    
    async def _mock_generate(self, image_path: str) -> dict:
        """Mock模式：返回模拟数据，用于演示"""
        import time
        mock_uid = f"mock_{int(time.time())}"
        logger.info(f"[MOCK] Generating mock 3D model: {mock_uid}")
        
        # 复制官方示例GLB到临时目录
        import shutil
        from pathlib import Path
        
        # 官方示例模型路径
        demo_glb_path = Path(__file__).parent.parent.parent.parent.parent / "src/hunyuan3d/assets/1.glb"
        
        # 创建临时输出目录
        output_dir = Path("uploads/generation") / mock_uid
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 复制示例模型
        output_glb = output_dir / "white_mesh.glb"
        if demo_glb_path.exists():
            shutil.copy2(demo_glb_path, output_glb)
            logger.info(f"[MOCK] Copied demo model to: {output_glb}")
        else:
            logger.warning(f"[MOCK] Demo model not found at: {demo_glb_path}")
        
        return {
            "uid": mock_uid,
            "status": "processing",
            "glb_path": str(output_glb)
        }
    
    async def _local_generate(
        self,
        image_path: str,
        enable_texture: bool,
        octree_resolution: int,
        num_steps: int,
        guidance_scale: float,
        seed: int
    ) -> dict:
        """本地GPU服务模式"""
        # 1. 读取图片并转为 base64
        with open(image_path, 'rb') as f:
            image_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # 2. 构建请求参数
        params = {
            "image": image_base64,
            "texture": enable_texture,
            "octree_resolution": octree_resolution,
            "num_inference_steps": num_steps,
            "guidance_scale": guidance_scale,
            "seed": seed,
            "type": "glb"
        }
        
        # 3. 提交异步任务到本地 Hunyuan3D API
        try:
            response = await self.client.post(
                f"{self.base_url}/send",
                json=params
            )
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"[LOCAL] Generation task submitted: {result['uid']}")
            return {
                "uid": result["uid"],
                "status": "processing",
                "glb_path": None
            }
        except Exception as e:
            logger.error(f"[LOCAL] Failed to submit generation task: {e}")
            raise
    
    async def _cloud_generate(
        self,
        image_path: str,
        enable_texture: bool = False
    ) -> dict:
        """云端API模式：调用腾讯官方云服务"""
        import uuid
        import time
        
        if not self.cloud_service:
            raise RuntimeError("Cloud service not initialized. Check your SecretId and SecretKey.")
        
        logger.info(f"[CLOUD] Starting cloud generation: {image_path}")
        
        try:
            # 使用云端服务生成
            uid = f"cloud_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            
            result = await self.cloud_service.generate(
                image_path=image_path,
                output_path=f"uploads/generation/{uid}/model.glb"
            )
            
            if result.get('success'):
                logger.info(f"[CLOUD] Generation completed: {uid}")
                return {
                    "uid": uid,
                    "status": "completed",
                    "glb_path": result['output_path'],
                    "task_id": result.get('task_id'),
                    "generation_time": result.get('generation_time', 0)
                }
            else:
                logger.error(f"[CLOUD] Generation failed: {result.get('error')}")
                return {
                    "uid": uid,
                    "status": "failed",
                    "error": result.get('error', 'Unknown error')
                }
                
        except Exception as e:
            logger.error(f"[CLOUD] Cloud generation error: {e}", exc_info=True)
            raise
    
    async def check_status(self, uid: str) -> dict:
        """
        检查生成状态
        
        Returns:
            {
                "status": "processing" | "completed",
                "glb_path": "/path/to/model.glb" or None,
                "model_base64": "base64_string" or None
            }
        """
        # 根据模式选择不同的状态检查方式
        if self.mode == "mock":
            return await self._mock_check_status(uid)
        elif self.mode == "local":
            return await self._local_check_status(uid)
        elif self.mode == "cloud":
            return await self._cloud_check_status(uid)
        else:
            raise ValueError(f"Unknown mode: {self.mode}")
    
    async def _mock_check_status(self, uid: str) -> dict:
        """Mock模式：模拟生成完成"""
        import time
        from pathlib import Path
        
        # 模拟5秒后完成
        mock_start_time = int(uid.split("_")[-1]) if "_" in uid else int(time.time()) - 10
        if int(time.time()) - mock_start_time >= 5:
            logger.info(f"[MOCK] Generation completed: {uid}")
            
            # 获取模型路径
            glb_path = Path("uploads/generation") / uid / "white_mesh.glb"
            
            if glb_path.exists():
                return {
                    "status": "completed",
                    "glb_path": str(glb_path),
                    "model_base64": None,
                    "warning": "This is a demo model from official examples."
                }
            else:
                return {
                    "status": "completed",
                    "model_base64": None,
                    "warning": "Demo model file not found. This is a mock response."
                }
        else:
            return {"status": "processing"}
    
    async def _local_check_status(self, uid: str) -> dict:
        """本地GPU服务模式"""
        try:
            response = await self.client.get(
                f"{self.base_url}/status/{uid}"
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"[LOCAL] Failed to check status: {e}")
            raise
    
    async def _cloud_check_status(self, uid: str) -> dict:
        """云端API模式：检查任务状态"""
        if not self.cloud_service:
            raise RuntimeError("Cloud service not initialized")
        
        # 从 uid 中提取 task_id（如果是cloud模式生成的）
        # cloud_1234567890_abcdef12 -> 需要查询云端状态
        # 由于云端API是同步等待完成的，这里直接返回completed
        
        # 检查文件是否存在
        from pathlib import Path
        glb_path = Path("uploads/generation") / uid / "model.glb"
        
        if glb_path.exists():
            return {
                "status": "completed",
                "glb_path": str(glb_path),
                "model_base64": None
            }
        else:
            # 如果文件不存在，可能是还在处理中或失败
            return {
                "status": "processing",
                "message": "Waiting for cloud generation to complete"
            }
    
    async def wait_for_completion(
        self,
        uid: str,
        poll_interval: float = 2.0,
        max_wait_time: float = 300.0
    ) -> str:
        """
        等待生成完成，返回 GLB 文件路径
        
        Args:
            uid: 任务 ID
            poll_interval: 轮询间隔（秒）
            max_wait_time: 最大等待时间（秒）
            
        Returns:
            GLB 文件路径
        """
        import time
        start_time = time.time()
        
        while True:
            # 检查超时
            if time.time() - start_time > max_wait_time:
                raise TimeoutError(f"Generation timeout after {max_wait_time}s")
            
            # 查询状态
            status = await self.check_status(uid)
            
            if status["status"] == "completed":
                logger.info(f"Generation completed: {uid}")
                return status.get("glb_path")
            
            # 等待后继续轮询
            await asyncio.sleep(poll_interval)
    
    async def close(self):
        """关闭 HTTP 客户端"""
        await self.client.aclose()


# 全局服务实例（单例模式）
_hunyuan_service_instance: Optional[Hunyuan3DService] = None


def get_hunyuan3d_service(
    mode: str = None,  # mock | local | cloud
    base_url: str = None,
    cloud_api_key: str = None,
    secret_id: str = None,
    secret_key: str = None,
    api_version: str = None
) -> Hunyuan3DService:
    """
    获取 Hunyuan3D 服务实例
    
    Args:
        mode: 运行模式
            - mock: Mock模式，用于演示（默认）
            - local: 本地GPU服务模式
            - cloud: 腾讯云端API模式
        base_url: 本地服务地址（local模式使用）
        cloud_api_key: 腾讯云服务API Key（cloud模式使用）
        secret_id: 腾讯云SecretId（cloud模式使用）
        secret_key: 腾讯云SecretKey（cloud模式使用）
        api_version: API版本（rapid/pro）
        
    Returns:
        Hunyuan3DService实例
    """
    global _hunyuan_service_instance
    
    # 从环境变量读取配置（优先级低于参数）
    if mode is None:
        mode = os.getenv("HUNYUAN3D_MODE", "mock")
    if base_url is None:
        base_url = os.getenv("HUNYUAN3D_BASE_URL", "http://localhost:8081")
    if cloud_api_key is None:
        cloud_api_key = os.getenv("HUNYUAN3D_CLOUD_API_KEY")
    if secret_id is None:
        secret_id = os.getenv("HUNYUAN3D_SECRET_ID")
    if secret_key is None:
        secret_key = os.getenv("HUNYUAN3D_SECRET_KEY")
    if api_version is None:
        api_version = os.getenv("HUNYUAN3D_API_VERSION", "rapid")
    
    # 如果配置变更，重新创建实例
    if _hunyuan_service_instance is None:
        _hunyuan_service_instance = Hunyuan3DService(
            mode=mode,
            base_url=base_url,
            cloud_api_key=cloud_api_key,
            secret_id=secret_id,
            secret_key=secret_key,
            api_version=api_version
        )
    
    return _hunyuan_service_instance
