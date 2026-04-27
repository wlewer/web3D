"""腾讯混元3D云端API服务

官方文档: https://cloud.tencent.com/document/product/1804/120696
API域名: ai3d.tencentcloudapi.com
地域: ap-guangzhou

支持模型：
- 标准版：SubmitHunyuanTo3DRapidJob
- 专业版：SubmitHunyuanTo3DProJob

特点：
- 云端GPU推理，无需本地GPU
- 支持文生3D、图生3D
- 按量付费，有免费额度

认证方式：SecretId + SecretKey（TC3-HMAC-SHA256签名）
"""
import time
import uuid
import base64
import asyncio
import json
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import aiohttp
from PIL import Image

# 使用腾讯云官方SDK
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.ai3d.v20250513 import ai3d_client, models

logger = logging.getLogger(__name__)


class Hunyuan3DCloudService:
    """腾讯混元3D云端API服务
    
    使用腾讯云官方SDK调用混元3D生成服务
    文档：https://cloud.tencent.com/document/product/1804/120696
    """
    
    REGION = "ap-guangzhou"
    
    def __init__(
        self,
        secret_id: str,
        secret_key: str,
        version: str = "rapid",  # rapid=标准版, pro=专业版
        timeout: int = 300  # 5分钟超时
    ):
        """
        Args:
            secret_id: 腾讯云SecretId
            secret_key: 腾讯云SecretKey
            version: API版本
                - rapid: 标准版（SubmitHunyuanTo3DRapidJob）- 30-60秒，消耗10积分
                - pro: 专业版（SubmitHunyuanTo3DProJob）- 60-120秒，消耗20积分
                ⚠️ 注意：极速版（express）不存在，请使用rapid代替
            timeout: 请求超时时间（秒）
        """
        self.secret_id = secret_id
        self.secret_key = secret_key
        
        # 验证version参数，极速版不存在，自动降级为标准版
        if version == "express":
            logger.warning(f"[Hunyuan3D Cloud] 极速版（express）不存在，自动降级为标准版（rapid）")
            version = "rapid"
        
        self.version = version
        self.timeout = timeout
        
        # 根据版本设置Action名称
        if version == "pro":
            self.submit_action = "SubmitHunyuanTo3DProJob"
            self.query_action = "QueryHunyuanTo3DProJob"
        else:  # rapid (default)
            self.submit_action = "SubmitHunyuanTo3DRapidJob"
            self.query_action = "QueryHunyuanTo3DRapidJob"
        
        # 初始化腾讯云SDK客户端
        cred = credential.Credential(secret_id, secret_key)
        
        http_profile = HttpProfile()
        http_profile.endpoint = "ai3d.tencentcloudapi.com"
        http_profile.reqTimeout = timeout
        
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile
        
        self.client = ai3d_client.Ai3dClient(cred, self.REGION, client_profile)
        
        logger.info(f"[Hunyuan3D Cloud] 初始化成功: version={version}, region={self.REGION}")
    
    async def generate(
        self,
        image_path: str,
        output_path: str,
        prompt: str = None,
        result_format: str = "glb"
    ) -> Dict[str, Any]:
        """
        从图片生成3D模型
        
        Args:
            image_path: 输入图片路径
            output_path: 输出GLB文件路径
            prompt: 可选的文本提示
            result_format: 输出格式（glb/obj）
            
        Returns:
            dict: {
                'success': bool,
                'output_path': str,
                'generation_time': float,
                'error': str (if failed)
            }
        """
        try:
            start_time = time.time()
            logger.info(f"[Hunyuan3D Cloud] 开始生成: {image_path}")
            
            # 1. 读取图片并转为base64
            with open(image_path, 'rb') as f:
                image_data = f.read()
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            logger.info(f"[Hunyuan3D Cloud] 图片已编码: {len(image_base64)} bytes")
            
            # 2. 提交生成任务
            task_id = await self._submit_task(
                image_base64=image_base64,
                prompt=prompt
            )
            
            logger.info(f"[Hunyuan3D Cloud] 任务已提交: {task_id}")
            
            # 3. 轮询查询任务状态
            result_data = await self._poll_task_status(task_id)
            
            if not result_data:
                return {
                    'success': False,
                    'error': '任务超时或失败',
                    'generation_time': time.time() - start_time
                }
            
            # 4. 下载GLB文件
            download_url = result_data.get('ResultUrl')
            if not download_url:
                return {
                    'success': False,
                    'error': '响应中没有GLB下载链接',
                    'generation_time': time.time() - start_time
                }
            
            # 5. 下载GLB文件
            glb_data = await self._download_glb(download_url)
            
            # 6. 保存GLB文件
            output_path_obj = Path(output_path)
            output_path_obj.parent.mkdir(parents=True, exist_ok=True)
            output_path_obj.write_bytes(glb_data)
            
            elapsed = time.time() - start_time
            file_size = output_path_obj.stat().st_size
            
            logger.info(
                f"[Hunyuan3D Cloud] 生成完成: "
                f"task_id={task_id}, "
                f"time={elapsed:.2f}s, "
                f"size={file_size/1024:.1f}KB"
            )
            
            return {
                'success': True,
                'output_path': str(output_path),
                'generation_time': elapsed,
                'task_id': task_id,
                'file_size': file_size
            }
            
        except Exception as e:
            logger.error(f"[Hunyuan3D Cloud] 生成失败: {e}", exc_info=True)
            elapsed = time.time() - start_time
            return {
                'success': False,
                'error': str(e),
                'generation_time': elapsed
            }
    
    async def _submit_task(
        self,
        image_base64: str,
        prompt: str = None
    ) -> str:
        """提交3D生成任务（使用腾讯云官方SDK）
        
        官方要求：
        - ImageBase64、ImageUrl和Prompt必填其一
        - Prompt和ImageBase64/ImageUrl不能同时存在
        - 图片格式：jpg, png, jpeg, webp
        - 图片大小：单边分辨率128-5000，≤6MB（base64编码后约8MB）
        """
        try:
            # 根据版本选择请求模型
            if self.version == "pro":
                req = models.SubmitHunyuanTo3DProJobRequest()
            else:  # rapid (default)
                req = models.SubmitHunyuanTo3DRapidJobRequest()
            
            # 设置参数（图生3D只能提供ImageBase64，不能同时提供Prompt）
            # 官方要求：ImageBase64、ImageUrl和Prompt三选一
            if image_base64:
                req.ImageBase64 = image_base64
            elif prompt:
                req.Prompt = prompt
            else:
                raise ValueError("必须提供ImageBase64或Prompt其中之一")
            
            # 调用API
            if self.version == "pro":
                resp = self.client.SubmitHunyuanTo3DProJob(req)
            else:  # rapid
                resp = self.client.SubmitHunyuanTo3DRapidJob(req)
            
            job_id = resp.JobId
            logger.info(f"[Hunyuan3D Cloud] 任务提交成功: JobId={job_id}, version={self.version}")
            return job_id
            
        except Exception as e:
            logger.error(f"[Hunyuan3D Cloud] 提交任务失败: {e}")
            raise
    
    async def _poll_task_status(
        self,
        task_id: str,
        poll_interval: int = 5,
        max_retries: int = 60  # 最多轮询5分钟
    ) -> Optional[Dict[str, Any]]:
        """轮询查询任务状态，返回结果数据（使用腾讯云官方SDK）"""
        for attempt in range(max_retries):
            try:
                # 根据版本选择请求模型
                if self.version == "pro":
                    req = models.QueryHunyuanTo3DProJobRequest()
                else:  # rapid (default)
                    req = models.QueryHunyuanTo3DRapidJobRequest()
                
                req.JobId = task_id
                
                # 调用API
                if self.version == "pro":
                    resp = self.client.QueryHunyuanTo3DProJob(req)
                else:  # rapid
                    resp = self.client.QueryHunyuanTo3DRapidJob(req)
                
                # 调试：打印响应对象的原始内容
                logger.debug(f"[Hunyuan3D Cloud] 响应对象类型: {type(resp)}")
                logger.debug(f"[Hunyuan3D Cloud] 响应对象属性: {dir(resp)}")
                if hasattr(resp, 'to_json_string'):
                    logger.debug(f"[Hunyuan3D Cloud] 响应JSON: {resp.to_json_string()}")
                
                # 转换为字典（安全访问属性）
                response_data = {
                    'JobId': getattr(resp, 'JobId', None) or task_id,  # 查询时JobId可能不在响应中
                    'Status': getattr(resp, 'Status', 'UNKNOWN'),
                    'ResultFile3Ds': getattr(resp, 'ResultFile3Ds', []) or [],
                    'ErrorMessage': getattr(resp, 'ErrorMessage', None),
                }
                
                status = getattr(resp, 'Status', 'UNKNOWN')
                logger.info(f"[Hunyuan3D Cloud] 任务状态: {status} (attempt {attempt + 1}/{max_retries})")
                
                # 官方状态值：WAIT(等待中)、RUN(执行中)、FAIL(失败)、DONE(成功)
                if status == 'DONE':
                    # 任务完成，从ResultFile3Ds中提取GLB下载链接
                    result_file_3ds = response_data.get('ResultFile3Ds', [])
                    glb_url = None
                    
                    # ResultFile3Ds是一个列表，包含多个文件对象
                    # 每个对象有Type和Url字段，找到Type为GLB的
                    if result_file_3ds:
                        for file_obj in result_file_3ds:
                            file_type = file_obj.get('Type', '').upper() if isinstance(file_obj, dict) else getattr(file_obj, 'Type', '')
                            file_url = file_obj.get('Url', '') if isinstance(file_obj, dict) else getattr(file_obj, 'Url', '')
                            
                            # 优先查找GLB格式
                            if file_type == 'GLB' and file_url:
                                glb_url = file_url
                                logger.info(f"[Hunyuan3D Cloud] 找到GLB下载链接: {glb_url}")
                                break
                        
                        # 如果没有GLB，尝试使用OBJ格式（官方默认返回OBJ）
                        if not glb_url:
                            for file_obj in result_file_3ds:
                                file_type = file_obj.get('Type', '').upper() if isinstance(file_obj, dict) else getattr(file_obj, 'Type', '')
                                file_url = file_obj.get('Url', '') if isinstance(file_obj, dict) else getattr(file_obj, 'Url', '')
                                
                                if file_type == 'OBJ' and file_url:
                                    glb_url = file_url
                                    logger.warning(f"[Hunyuan3D Cloud] 未找到GLB格式，使用OBJ格式: {glb_url}")
                                    break
                        
                        # 如果还没有，使用第一个可用的文件
                        if not glb_url and result_file_3ds:
                            first_file = result_file_3ds[0]
                            glb_url = first_file.get('Url', '') if isinstance(first_file, dict) else getattr(first_file, 'Url', '')
                            logger.warning(f"[Hunyuan3D Cloud] 使用默认文件格式: {glb_url}")
                    
                    # 将GLB URL添加到response_data中，供后续下载使用
                    response_data['ResultUrl'] = glb_url
                    
                    if not glb_url:
                        logger.error(f"[Hunyuan3D Cloud] ResultFile3Ds为空或未包含有效的下载链接: {result_file_3ds}")
                        raise Exception("任务完成但未找到3D模型下载链接")
                    
                    # 任务完成，返回结果数据
                    return response_data
                
                elif status == 'FAIL':
                    error_msg = response_data.get('ErrorMessage', '未知错误')
                    error_code = response_data.get('ErrorCode', 'UNKNOWN')
                    raise Exception(f"任务失败 [{error_code}]: {error_msg}")
                
                elif status in ['WAIT', 'RUN']:
                    # 继续轮询
                    await asyncio.sleep(poll_interval)
                else:
                    logger.warning(f"[Hunyuan3D Cloud] 未知状态: {status}，继续轮询")
                    await asyncio.sleep(poll_interval)
                    
            except Exception as e:
                if "任务失败" in str(e):
                    raise
                logger.warning(f"[Hunyuan3D Cloud] 查询异常: {e}")
                await asyncio.sleep(poll_interval)
        
        raise Exception(f"任务超时: {task_id}")
    
    async def _download_glb(self, download_url: str) -> bytes:
        """从URL下载GLB文件"""
        logger.info(f"[Hunyuan3D Cloud] 开始下载GLB: {download_url}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(download_url, timeout=self.timeout) as response:
                if response.status != 200:
                    raise Exception(f"下载GLB失败: HTTP {response.status}")
                
                glb_data = await response.read()
                logger.info(f"[Hunyuan3D Cloud] GLB下载完成: {len(glb_data)} bytes")
                return glb_data
    
    async def check_balance(self) -> Dict[str, Any]:
        """检查账户余额（可选）"""
        # TODO: 实现余额查询API
        return {
            'status': 'not_implemented',
            'message': '余额查询功能待实现'
        }


# 全局服务实例
_hunyuan_cloud_service = None


def get_hunyuan3d_cloud(
    secret_id: str = None,
    secret_key: str = None,
    version: str = None
) -> Hunyuan3DCloudService:
    """获取腾讯混元3D云端服务实例（单例模式）
    
    Args:
        secret_id: 腾讯云SecretId（从环境变量读取）
        secret_key: 腾讯云SecretKey（从环境变量读取）
        version: API版本（rapid=标准版，pro=专业版）
        
    Returns:
        Hunyuan3DCloudService实例
    """
    global _hunyuan_cloud_service
    
    import os
    
    # 从环境变量读取配置
    if secret_id is None:
        secret_id = os.getenv("HUNYUAN3D_SECRET_ID")
    if secret_key is None:
        secret_key = os.getenv("HUNYUAN3D_SECRET_KEY")
    if version is None:
        version = os.getenv("HUNYUAN3D_API_VERSION", "rapid")
    
    if not secret_id or not secret_key:
        raise ValueError(
            "HUNYUAN3D_SECRET_ID或HUNYUAN3D_SECRET_KEY未配置，请在.env文件中设置。\n"
            "请访问 https://console.cloud.tencent.com/cam/capi 获取密钥"
        )
    
    # 如果配置变更或首次调用，创建新实例
    # 注意：这里不使用严格的单例模式，允许不同version版本创建不同实例
    if _hunyuan_cloud_service is None or _hunyuan_cloud_service.version != version:
        _hunyuan_cloud_service = Hunyuan3DCloudService(
            secret_id=secret_id,
            secret_key=secret_key,
            version=version
        )
        logger.info(f"创建Hunyuan3D云端服务实例，版本: {version}")
    
    return _hunyuan_cloud_service
