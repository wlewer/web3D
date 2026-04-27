"""
实验性AI 3D生成功能 - 后台管理专用
TODO: 需要实施完整的TripoSR和HuggingFace服务
"""
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Form, Depends
from fastapi.responses import JSONResponse, FileResponse
import uuid
import asyncio
from pathlib import Path
import logging
from dotenv import load_dotenv
import os
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)

# 加载.env文件（优先使用项目根目录的.env）
project_root = Path(__file__).parent.parent.parent.parent
env_path = project_root / '.env'
if not env_path.exists():
    env_path = Path(__file__).parent.parent.parent / '.env'  # 备用：backend/.env

load_dotenv(env_path)
logger.info(f"[EXPERIMENTAL] Loaded .env from: {env_path}")
logger.info(f"[EXPERIMENTAL] HUNYUAN3D_MODE={os.getenv('HUNYUAN3D_MODE', 'NOT SET')}")

router = APIRouter(prefix="/experimental", tags=["experimental"])

# 存储任务状态（内存中，生产环境应使用Redis）
task_status = {}

@router.post("/image-to-stl/upload")
async def upload_image_to_stl(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    ImageToSTL 图像浮雕转换（模块2：真实可用）
    
    技术原理：图片亮度 -> 高度图 -> 3D浮雕网格
    生成效果：真实的3D浮雕模型（从左侧打光可以看到原始图片）
    """
    task_id = f"imagetostl_{uuid.uuid4().hex[:8]}"
    
    # 保存上传文件
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())
    
    logger.info(f"[EXPERIMENTAL] Received image for ImageToSTL: {image_path}")
    
    # 初始化任务状态
    task_status[task_id] = {
        'status': 'processing',
        'progress': 0,
        'message': '正在启动生成...'
    }
    
    async def imagetostl_process():
        try:
            from app.services.generation.image_to_stl_service import ImageToSTLService
            
            task_status[task_id]['progress'] = 10
            task_status[task_id]['message'] = '正在加载图片...'
            
            # 创建服务实例
            service = ImageToSTLService(
                base_height=5.0,
                max_depth=2.0,
                resolution=256
            )
            
            task_status[task_id]['progress'] = 30
            task_status[task_id]['message'] = '正在生成高度图...'
            
            # 生成3D浮雕模型
            output_path = upload_dir / f"{task_id}_model.glb"
            result = await service.convert(
                image_path=str(image_path),
                output_path=str(output_path),
                output_format='glb'
            )
            
            task_status[task_id]['progress'] = 90
            task_status[task_id]['message'] = '正在优化模型...'
            
            if result['status'] == 'completed':
                task_status[task_id]['progress'] = 100
                task_status[task_id]['status'] = 'completed'
                task_status[task_id]['message'] = '生成完成！'
                task_status[task_id]['glb_path'] = result['file_path']
                task_status[task_id]['generation_time'] = result['elapsed_time']
                task_status[task_id]['vertices'] = result['vertices']
                task_status[task_id]['faces'] = result['faces']
                task_status[task_id]['file_size'] = result['file_size']
                logger.info(
                    f"[ImageToSTL] 生成成功: {result['file_path']}, "
                    f"vertices={result['vertices']}, faces={result['faces']}, "
                    f"time={result['elapsed_time']}"
                )
            else:
                task_status[task_id]['status'] = 'failed'
                task_status[task_id]['message'] = '生成失败'
                logger.error(f"[ImageToSTL] 生成失败")
                
        except Exception as e:
            logger.error(f"[ImageToSTL] 处理异常: {e}", exc_info=True)
            task_status[task_id]['status'] = 'failed'
            task_status[task_id]['message'] = f"异常: {str(e)}"
    
    if background_tasks:
        background_tasks.add_task(imagetostl_process)
    else:
        await imagetostl_process()
    
    return JSONResponse({
        'success': True,
        'task_id': task_id,
        'message': '任务已创建，正在生成中...'
    })

@router.post("/triposr/cpu/upload")
async def upload_triposr_cpu(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    TripoSR CPU版本生成（需要登录）
    
    支持两种模式：
    1. CPU模式 - 使用本地CPU运行TripoSR模型（当前）
    2. Mock模式 - 用于UI测试
    """
    import os
    mode = os.getenv('GENERATION_MODE', 'mock')
    logger.info(f"[EXPERIMENTAL] TripoSR CPU mode: {mode} (from .env)")
    
    task_id = f"triposr_cpu_{uuid.uuid4().hex[:8]}"
    
    # 保存上传文件
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())
    
    logger.info(f"[EXPERIMENTAL] Received image for TripoSR CPU: {image_path}, mode={mode}")
    
    # 初始化任务状态
    task_status[task_id] = {
        'status': 'processing',
        'progress': 0,
        'message': '正在启动生成...'
    }
    
    if mode == 'cpu':
        # CPU模式：使用真实TripoSR模型
        async def cpu_process():
            try:
                from app.services.generation.triposr_cpu_service import get_triposr_cpu
                
                task_status[task_id]['progress'] = 10
                task_status[task_id]['message'] = '正在加载模型...'
                
                # 获取CPU引擎
                engine = get_triposr_cpu()
                
                task_status[task_id]['progress'] = 30
                task_status[task_id]['message'] = '正在预处理图片...'
                
                # 生成3D模型
                output_path = upload_dir / f"{task_id}_model.glb"
                result = await engine.generate(
                    image_path=str(image_path),
                    output_path=str(output_path)
                )
                
                task_status[task_id]['progress'] = 90
                task_status[task_id]['message'] = '正在优化模型...'
                
                if result['success']:
                    task_status[task_id]['progress'] = 100
                    task_status[task_id]['status'] = 'completed'
                    task_status[task_id]['message'] = '生成完成！'
                    task_status[task_id]['glb_path'] = result['output_path']
                    task_status[task_id]['generation_time'] = result['generation_time']
                    logger.info(f"[CPU] TripoSR生成成功: {result['output_path']}, 耗时: {result['generation_time']:.2f}秒")
                else:
                    task_status[task_id]['status'] = 'failed'
                    task_status[task_id]['message'] = f"生成失败: {result.get('error', '未知错误')}"
                    logger.error(f"[CPU] TripoSR生成失败: {result.get('error')}")
                    
            except Exception as e:
                logger.error(f"[CPU] TripoSR处理异常: {e}")
                task_status[task_id]['status'] = 'failed'
                task_status[task_id]['message'] = f"异常: {str(e)}"
        
        if background_tasks:
            background_tasks.add_task(cpu_process)
        else:
            await cpu_process()
    else:
        # Mock模式：模拟进度（保持原有逻辑）
        async def mock_process():
            import time
            await asyncio.sleep(1)
            task_status[task_id]['progress'] = 20
            task_status[task_id]['message'] = '正在预处理图片...'
            
            await asyncio.sleep(1)
            task_status[task_id]['progress'] = 40
            task_status[task_id]['message'] = '正在进行3D重建...'
            
            await asyncio.sleep(1)
            task_status[task_id]['progress'] = 70
            task_status[task_id]['message'] = '正在生成网格...'
            
            await asyncio.sleep(1)
            task_status[task_id]['progress'] = 90
            task_status[task_id]['message'] = '正在优化模型...'
            
            await asyncio.sleep(1)
            task_status[task_id]['progress'] = 100
            task_status[task_id]['status'] = 'completed'
            task_status[task_id]['message'] = '生成完成！'
            
            # 复制示例GLB文件
            possible_paths = [
                Path(__file__).parent.parent.parent.parent.parent / 'src' / 'hunyuan3d' / 'assets' / '1.glb',
                Path('backend/assets/example.glb'),
                Path('assets/example.glb'),
                Path(__file__).parent.parent.parent.parent / 'assets' / 'example.glb',
                Path('backend/uploads/generation/mock_1776604333/white_mesh.glb'),
            ]
            
            example_glb = None
            for path in possible_paths:
                if path.exists():
                    example_glb = path
                    logger.info(f"[EXPERIMENTAL] Found example GLB at: {path} (size: {path.stat().st_size} bytes)")
                    break
            
            if example_glb:
                output_glb = upload_dir / f"{task_id}_model.glb"
                import shutil
                shutil.copy2(example_glb, output_glb)
                task_status[task_id]['glb_path'] = str(output_glb)
                logger.info(f"[EXPERIMENTAL] Copied example GLB to: {output_glb}")
            else:
                logger.warning("[EXPERIMENTAL] No example GLB found, creating valid minimal GLB")
                import struct
                import json
                output_glb = upload_dir / f"{task_id}_model.glb"
                        
                # 创建有效的最小GLB（包含一个简单的立方体几何）
                vertices = [
                    -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5,  0.5, -0.5,  -0.5,  0.5, -0.5,
                    -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
                ]
                normals = [0.0, 0.0, 1.0] * 8
                indices = [
                    0, 1, 2,  0, 2, 3,  4, 6, 5,  4, 7, 6,
                    3, 2, 6,  3, 6, 7,  0, 5, 1,  0, 4, 5,
                    1, 5, 6,  1, 6, 2,  0, 3, 7,  0, 7, 4,
                ]
                        
                indices_bytes = struct.pack('<' + 'I' * len(indices), *indices)
                vertices_bytes = struct.pack('<' + 'f' * len(vertices), *vertices)
                normals_bytes = struct.pack('<' + 'f' * len(normals), *normals)
                        
                bin_padding = (4 - (len(indices_bytes) + len(vertices_bytes) + len(normals_bytes)) % 4) % 4
                        
                gltf_json = {
                    "asset": {"version": "2.0"},
                    "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
                    "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "mode": 4}]}],
                    "accessors": [
                        {"bufferView": 0, "componentType": 5126, "count": 8, "type": "VEC3", "max": [0.5, 0.5, 0.5], "min": [-0.5, -0.5, -0.5]},
                        {"bufferView": 1, "componentType": 5126, "count": 8, "type": "VEC3"},
                        {"bufferView": 2, "componentType": 5123, "count": 36, "type": "SCALAR"}
                    ],
                    "bufferViews": [
                        {"buffer": 0, "byteOffset": 0, "byteLength": len(vertices_bytes)},
                        {"buffer": 0, "byteOffset": len(vertices_bytes), "byteLength": len(normals_bytes)},
                        {"buffer": 0, "byteOffset": len(vertices_bytes) + len(normals_bytes), "byteLength": len(indices_bytes)},
                    ],
                    "buffers": [{"byteLength": len(vertices_bytes) + len(normals_bytes) + len(indices_bytes) + bin_padding}]
                }
                        
                json_bytes = json.dumps(gltf_json, separators=(',', ':')).encode('utf-8')
                json_padding = (4 - len(json_bytes) % 4) % 4
                json_bytes_padded = json_bytes + b' ' * json_padding
                bin_data = vertices_bytes + normals_bytes + indices_bytes + b'\x00' * bin_padding
                total_length = 12 + (8 + len(json_bytes_padded)) + (8 + len(bin_data))
                        
                minimal_glb = bytearray()
                minimal_glb.extend(b'glTF')
                minimal_glb.extend(struct.pack('<I', 2))
                minimal_glb.extend(struct.pack('<I', total_length))
                minimal_glb.extend(struct.pack('<I', len(json_bytes_padded)))
                minimal_glb.extend(b'JSON')
                minimal_glb.extend(json_bytes_padded)
                minimal_glb.extend(struct.pack('<I', len(bin_data)))
                minimal_glb.extend(b'BIN\x00')
                minimal_glb.extend(bin_data)
                        
                output_glb.write_bytes(bytes(minimal_glb))
                task_status[task_id]['glb_path'] = str(output_glb)
                logger.info(f"[EXPERIMENTAL] Created valid minimal GLB at: {output_glb} ({len(minimal_glb)} bytes)")
        
        if background_tasks:
            background_tasks.add_task(mock_process)
        else:
            await mock_process()
    
    return {
        'task_id': task_id,
        'status': 'processing',
        'message': '生成任务已提交，请在后台查看进度'
    }


@router.post("/huggingface/upload")
async def upload_huggingface(
    file: UploadFile = File(...),
    version: str = Form(default="hy-3d-3.0", alias="model_version"),  # 使用version避免Pydantic警告
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    HuggingFace API生成 - 对接腾讯混元3D云端API（需要登录）
    
    技术文档：https://cloud.tencent.com.cn/document/product/1823/130082
    支持模型：
    - hy-3d-3.0: 标准版（默认）
    - hy-3d-3.1: 专业版  
    - HY-3D-Express: 极速版（即将开放）
    
    特点：云端GPU推理，无需本地GPU，按量付费
    
    【新增】额度管理：
    - 提交任务前检查并扣除额度
    - 任务失败时退还额度
    """
    import os
    from app.services.generation.hunyuan3d_cloud_service import get_hunyuan3d_cloud
    from app.services.quota_service import QuotaService
    
    task_id = f"hunyuan_cloud_{uuid.uuid4().hex[:8]}"
    
    # 检查运行模式
    generation_mode = os.getenv('HUNYUAN3D_MODE', 'mock').lower()
    logger.info(f"[EXPERIMENTAL] Hunyuan3D mode: {generation_mode}")
    
    # Mock模式：直接返回示例模型，不调用腾讯API
    if generation_mode == 'mock':
        return await _handle_mock_generation(task_id, file, version, current_user, db)
    
    # Cloud模式：调用腾讯混元3D API
    return await _handle_cloud_generation(task_id, file, version, current_user, db, background_tasks)


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    logger.info(f"[EXPERIMENTAL] Query task: {task_id}, exists={task_id in task_status}")
    if task_id not in task_status:
        logger.warning(f"[EXPERIMENTAL] Task not found: {task_id}")
        raise HTTPException(status_code=404, detail='Task not found')
    
    return task_status[task_id]


async def _handle_mock_generation(
    task_id: str,
    file: UploadFile,
    version: str,
    current_user,
    db: AsyncSession
):
    """Mock模式：返回示例模型，用于开发测试"""
    from app.services.quota_service import QuotaService
    
    # 版本成本映射
    cost_map = {
        'hy-3d-3.0': 10,
        'hy-3d-3.1': 20,
        'HY-3D-Express': 5,
    }
    cost_per_use = cost_map.get(version, 10)
    
    # 扣除额度
    quota_service = QuotaService(db)
    deduct_result = quota_service.deduct_quota(
        user_id=current_user.id,
        amount=cost_per_use,
        task_id=task_id
    )
    
    if not deduct_result['success']:
        raise HTTPException(
            status_code=402 if deduct_result.get('error_code') == 'INSUFFICIENT_QUOTA' else 400,
            detail=deduct_result['error']
        )
    
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存上传文件（仅用于记录）
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())
    
    logger.info(f"[EXPERIMENTAL] Mock mode: received image {image_path}")
    
    # 初始化任务状态
    task_status[task_id] = {
        'status': 'processing',
        'progress': 0,
        'message': f'[Mock] 正在生成3D模型... [模型: {version}]',
        'user_id': current_user.id,
        'cost': cost_per_use
    }
    logger.info(f"[EXPERIMENTAL] Task created: {task_id}, status keys={list(task_status.keys())}")
    
    async def mock_process():
        try:
            # 模拟进度更新
            for progress in [10, 30, 50, 70, 90, 100]:
                await asyncio.sleep(1)  # 每秒更新一次
                task_status[task_id]['progress'] = progress
                
                if progress < 100:
                    task_status[task_id]['message'] = f'[Mock] 生成中... {progress}%'
                else:
                    task_status[task_id]['message'] = '[Mock] 生成完成！'
            
            # 使用示例GLB文件
            example_glb = Path(__file__).parent.parent.parent.parent / 'assets' / 'example.glb'
            
            # 如果示例文件不存在，尝试其他可能的路径
            if not example_glb.exists():
                alternative_paths = [
                    Path('backend/assets/example.glb'),
                    Path('assets/example.glb'),
                    Path(__file__).parent.parent.parent.parent / 'assets' / 'example_model.glb',
                ]
                for alt_path in alternative_paths:
                    if alt_path.exists():
                        example_glb = alt_path
                        break
            
            # 如果还是找不到，创建一个简单的GLB
            if not example_glb.exists():
                logger.warning(f"[EXPERIMENTAL] Example GLB not found, creating placeholder")
                # 创建一个最小的有效GLB文件（空场景）
                output_path = upload_dir / f"{task_id}_model.glb"
                # GLB文件最小结构：12字节header + 空chunk
                minimal_glb = bytes([
                    0x67, 0x6C, 0x54, 0x46,  # magic: "glTF"
                    0x02, 0x00, 0x00, 0x00,  # version: 2
                    0x0C, 0x00, 0x00, 0x00,  # length: 12 bytes
                ])
                output_path.write_bytes(minimal_glb)
                task_status[task_id]['glb_path'] = str(output_path)
                logger.info(f"[EXPERIMENTAL] Created minimal GLB placeholder: {output_path}")
            else:
                # 复制示例文件
                output_path = upload_dir / f"{task_id}_model.glb"
                import shutil
                shutil.copy2(example_glb, output_path)
                task_status[task_id]['glb_path'] = str(output_path)
                logger.info(f"[EXPERIMENTAL] Copied example GLB: {example_glb} -> {output_path}")
            
            task_status[task_id]['status'] = 'completed'
            task_status[task_id]['generation_time'] = 6.0
            
            # 记录成功
            quota_service.record_generation_success(current_user.id)
            
            logger.info(f"[EXPERIMENTAL] Mock generation completed: {output_path}")
            
        except Exception as e:
            logger.error(f"[EXPERIMENTAL] Mock process failed: {e}", exc_info=True)
            task_status[task_id]['status'] = 'failed'
            task_status[task_id]['message'] = f"异常: {str(e)}"
            
            # 退还额度
            quota_service.refund_quota(
                user_id=current_user.id,
                amount=cost_per_use,
                reason=f"Mock模式异常: {str(e)}"
            )
    
    # 启动后台任务
    asyncio.create_task(mock_process())
    
    return {
        'task_id': task_id,
        'status': 'processing',
        'message': 'Mock模式：生成任务已提交',
        'quota_deducted': cost_per_use,
        'remaining_quota': deduct_result['remaining_quota'],
        'mode': 'mock'
    }


async def _handle_cloud_generation(
    task_id: str,
    file: UploadFile,
    version: str,
    current_user,
    db: AsyncSession,
    background_tasks: BackgroundTasks
):
    """Cloud模式：调用腾讯混元3D API"""
    from app.services.generation.hunyuan3d_cloud_service import get_hunyuan3d_cloud
    from app.services.quota_service import QuotaService
    
    # 模型版本映射和成本计算
    # 注意：腾讯云混元3D只有两个版本：rapid（标准版）和pro（专业版）
    # express（极速版）不存在，会自动降级为rapid
    version_map = {
        'hy-3d-3.0': {'api_version': 'rapid', 'cost': 10},  # 标准版
        'hy-3d-3.1': {'api_version': 'pro', 'cost': 20},     # 专业版
        'HY-3D-Express': {'api_version': 'rapid', 'cost': 5}, # 极速版 -> 自动降级为标准版
        'rapid': {'api_version': 'rapid', 'cost': 10},       # 标准版
        'pro': {'api_version': 'pro', 'cost': 20},           # 专业版
        'express': {'api_version': 'rapid', 'cost': 5}       # 极速版 -> 自动降级为标准版
    }
    
    model_config = version_map.get(version, version_map['hy-3d-3.0'])
    api_version = model_config['api_version']
    cost_per_use = model_config['cost']
    
    # 检查并扣除额度
    quota_service = QuotaService(db)
    deduct_result = await quota_service.deduct_quota(
        user_id=current_user.id,
        amount=cost_per_use,
        task_id=task_id
    )
    
    if not deduct_result['success']:
        raise HTTPException(
            status_code=402 if deduct_result.get('error_code') == 'INSUFFICIENT_QUOTA' else 400,
            detail=deduct_result['error']
        )
    
    logger.info(f"[EXPERIMENTAL] Deducted {cost_per_use} points, remaining: {deduct_result['remaining_quota']}")
    
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())
    
    logger.info(f"[EXPERIMENTAL] Cloud mode: received image {image_path}")
    
    task_status[task_id] = {
        'status': 'processing',
        'progress': 0,
        'message': '正在上传图片到云端...',
        'user_id': current_user.id,
        'cost': cost_per_use
    }
    
    async def cloud_process():
        try:
            engine = get_hunyuan3d_cloud(version=api_version)
            
            task_status[task_id]['progress'] = 10
            task_status[task_id]['message'] = '正在上传图片到云端...'
            
            output_path = upload_dir / f"{task_id}_model.glb"
            
            # 提示用户当前版本的实际使用情况
            if version == 'HY-3D-Express':
                task_status[task_id]['message'] = f'云端GPU处理中（极速版暂时使用标准版，预计30-60秒）... [模型: {version}]'
            else:
                task_status[task_id]['message'] = f'云端GPU处理中（预计1-3分钟）... [模型: {version}]'
            
            task_status[task_id]['progress'] = 30
            
            result = await engine.generate(
                image_path=str(image_path),
                output_path=str(output_path)
            )
            
            if result['success']:
                task_status[task_id]['progress'] = 100
                task_status[task_id]['status'] = 'completed'
                task_status[task_id]['message'] = '生成完成！'
                task_status[task_id]['glb_path'] = result['output_path']
                task_status[task_id]['generation_time'] = result['generation_time']
                
                quota_service.record_generation_success(current_user.id)
                
                # 将生成的模型复制到标准存储目录
                import shutil
                from pathlib import Path as PathLib
                model_dir = PathLib(f"uploads/generation/{task_id}")
                model_dir.mkdir(parents=True, exist_ok=True)
                model_filename = f"model_hunyuan_cloud_{task_id[:8]}.glb"
                standard_path = model_dir / model_filename
                
                # 复制文件到标准位置
                shutil.copy2(result['output_path'], standard_path)
                logger.info(f"[Cloud] Model copied to: {standard_path}")
                
                # 保存模型记录到数据库
                try:
                    from app.models.model import Model3D
                    from app.database import async_session_maker
                    from sqlalchemy import select
                    
                    file_size = standard_path.stat().st_size
                    
                    async with async_session_maker() as db:
                        # 创建模型记录
                        model = Model3D(
                            name=f"混元3D生成模型_{task_id[:8]}",
                            description=f"通过腾讯混元3D云端API生成的3D模型 [版本: {version}]",
                            category='other',
                            status='approved',  # 自动审核通过
                            model_url=str(standard_path),
                            format='glb',
                            file_size=file_size,
                            generation_engine='hunyuan3d_cloud',
                            created_by=current_user.id,
                            tags=["AI生成", "混元3D", "云端"]
                        )
                        db.add(model)
                        await db.commit()
                        await db.refresh(model)
                        
                        task_status[task_id]['model_id'] = model.id
                        logger.info(f"[Cloud] Model saved to database: {model.id}")
                        
                except Exception as db_error:
                    logger.error(f"[Cloud] Failed to save model to database: {db_error}", exc_info=True)
                    # 不影响生成结果，仅记录错误
                
                logger.info(f"[Cloud] Generation success: {result['output_path']}, time: {result['generation_time']:.2f}s")
            else:
                task_status[task_id]['status'] = 'failed'
                task_status[task_id]['message'] = f"生成失败: {result.get('error', '未知错误')}"
                
                refund_result = quota_service.refund_quota(
                    user_id=current_user.id,
                    amount=cost_per_use,
                    reason=f"任务失败: {result.get('error', '未知错误')}"
                )
                logger.warning(f"[Cloud] Refunded {cost_per_use} points: {refund_result}")
                
        except Exception as e:
            logger.error(f"[Cloud] Generation exception: {e}", exc_info=True)
            task_status[task_id]['status'] = 'failed'
            task_status[task_id]['message'] = f"异常: {str(e)}"
            
            refund_result = quota_service.refund_quota(
                user_id=current_user.id,
                amount=cost_per_use,
                reason=f"系统异常: {str(e)}"
            )
            logger.warning(f"[Cloud] Refunded {cost_per_use} points due to exception: {refund_result}")
    
    if background_tasks:
        background_tasks.add_task(cloud_process)
    else:
        await cloud_process()
    
    return {
        'task_id': task_id,
        'status': 'processing',
        'message': '生成任务已提交，请在后台查看进度',
        'quota_deducted': cost_per_use,
        'remaining_quota': deduct_result['remaining_quota'],
        'mode': 'cloud'
    }


@router.get("/download/{task_id}")
async def download_result(task_id: str):
    """下载生成结果"""
    result = task_status.get(task_id)
    if not result or result.get('status') != 'completed':
        raise HTTPException(status_code=404, detail='Result not ready')
    
    glb_path = result.get('glb_path')
    if not glb_path or not Path(glb_path).exists():
        raise HTTPException(status_code=404, detail='File not found')
    
    logger.info(f"[EXPERIMENTAL] Downloading model: {glb_path}")
    
    return FileResponse(
        path=glb_path,
        filename=f"model_{task_id}.glb",
        media_type="model/gltf-binary"
    )
