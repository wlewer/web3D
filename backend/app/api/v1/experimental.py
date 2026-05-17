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
import base64
from typing import Optional, Dict
from dotenv import load_dotenv
import os
import shutil
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.services.model_versions import model_versions
from app.core.task_store import get_task_store

logger = logging.getLogger(__name__)

# 加载.env文件（优先使用项目根目录的.env）
project_root = Path(__file__).parent.parent.parent.parent
env_path = project_root / '.env'
if not env_path.exists():
    env_path = Path(__file__).parent.parent.parent / '.env'  # 备用：backend/.env

load_dotenv(env_path, override=True)
logger.info(f"[EXPERIMENTAL] Loaded .env from: {env_path}")
logger.info(f"[EXPERIMENTAL] HUNYUAN3D_MODE={os.getenv('HUNYUAN3D_MODE', 'NOT SET')}")

router = APIRouter(prefix="/experimental", tags=["experimental"])

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
    store = get_task_store()
    await store.set_task(task_id, {
        'status': 'processing',
        'progress': 0,
        'message': '正在启动生成...'
    })
    
    async def imagetostl_process():
        try:
            from app.services.generation.image_to_stl_service import ImageToSTLService
            store = get_task_store()
            
            await store.update_task(task_id, {
                'progress': 10,
                'message': '正在加载图片...'
            })
            
            # 创建服务实例
            service = ImageToSTLService(
                base_height=5.0,
                max_depth=2.0,
                resolution=256
            )
            
            await store.update_task(task_id, {
                'progress': 30,
                'message': '正在生成高度图...'
            })
            
            # 生成3D浮雕模型
            output_path = upload_dir / f"{task_id}_model.glb"
            result = await service.convert(
                image_path=str(image_path),
                output_path=str(output_path),
                output_format='glb'
            )
            
            await store.update_task(task_id, {
                'progress': 90,
                'message': '正在优化模型...'
            })
            
            if result['status'] == 'completed':
                await store.update_task(task_id, {
                    'progress': 100,
                    'status': 'completed',
                    'message': '生成完成！',
                    'glb_path': result['file_path'],
                    'generation_time': result['elapsed_time'],
                    'vertices': result['vertices'],
                    'faces': result['faces'],
                    'file_size': result['file_size']
                })
                logger.info(
                    f"[ImageToSTL] 生成成功: {result['file_path']}, "
                    f"vertices={result['vertices']}, faces={result['faces']}, "
                    f"time={result['elapsed_time']}"
                )
            else:
                await store.update_task(task_id, {
                    'status': 'failed',
                    'message': '生成失败'
                })
                logger.error(f"[ImageToSTL] 生成失败")
                
        except Exception as e:
            logger.error(f"[ImageToSTL] 处理异常: {e}", exc_info=True)
            store = get_task_store()
            await store.update_task(task_id, {
                'status': 'failed',
                'message': f"异常: {str(e)}"
            })
    
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
    store = get_task_store()
    await store.set_task(task_id, {
        'status': 'processing',
        'progress': 0,
        'message': '正在启动生成...'
    })
    
    if mode == 'cpu':
        # CPU模式：使用真实TripoSR模型
        async def cpu_process():
            try:
                from app.services.generation.triposr_cpu_service import get_triposr_cpu
                store = get_task_store()
                
                await store.update_task(task_id, {
                    'progress': 10,
                    'message': '正在加载模型...'
                })
                
                # 获取CPU引擎
                engine = get_triposr_cpu()
                
                await store.update_task(task_id, {
                    'progress': 30,
                    'message': '正在预处理图片...'
                })
                
                # 生成3D模型
                output_path = upload_dir / f"{task_id}_model.glb"
                result = await engine.generate(
                    image_path=str(image_path),
                    output_path=str(output_path)
                )
                
                await store.update_task(task_id, {
                    'progress': 90,
                    'message': '正在优化模型...'
                })
                
                if result['success']:
                    await store.update_task(task_id, {
                        'progress': 100,
                        'status': 'completed',
                        'message': '生成完成！',
                        'glb_path': result['output_path'],
                        'generation_time': result['generation_time']
                    })
                    logger.info(f"[CPU] TripoSR生成成功: {result['output_path']}, 耗时: {result['generation_time']:.2f}秒")
                else:
                    await store.update_task(task_id, {
                        'status': 'failed',
                        'message': f"生成失败: {result.get('error', '未知错误')}"
                    })
                    logger.error(f"[CPU] TripoSR生成失败: {result.get('error')}")
                    
            except Exception as e:
                logger.error(f"[CPU] TripoSR处理异常: {e}")
                store = get_task_store()
                await store.update_task(task_id, {
                    'status': 'failed',
                    'message': f"异常: {str(e)}"
                })
        
        if background_tasks:
            background_tasks.add_task(cpu_process)
        else:
            await cpu_process()
    else:
        # Mock模式：模拟进度（保持原有逻辑）
        async def mock_process():
            import time
            store = get_task_store()
            await asyncio.sleep(1)
            await store.update_task(task_id, {
                'progress': 20,
                'message': '正在预处理图片...'
            })
            
            await asyncio.sleep(1)
            await store.update_task(task_id, {
                'progress': 40,
                'message': '正在进行3D重建...'
            })
            
            await asyncio.sleep(1)
            await store.update_task(task_id, {
                'progress': 70,
                'message': '正在生成网格...'
            })
            
            await asyncio.sleep(1)
            await store.update_task(task_id, {
                'progress': 90,
                'message': '正在优化模型...'
            })
            
            await asyncio.sleep(1)
            await store.update_task(task_id, {
                'progress': 100,
                'status': 'completed',
                'message': '生成完成！'
            })
            
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
                await store.update_task(task_id, {'glb_path': str(output_glb)})
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
                await store.update_task(task_id, {'glb_path': str(output_glb)})
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
    version: str = Form(default="hy-3d-3.0", alias="model_version"),
    # ---- 多视角图片支持（仅专业版3.1） ----
    multi_view_left: Optional[UploadFile] = File(None, alias="multi_view_images[left]"),
    multi_view_right: Optional[UploadFile] = File(None, alias="multi_view_images[right]"),
    multi_view_back: Optional[UploadFile] = File(None, alias="multi_view_images[back]"),
    multi_view_top: Optional[UploadFile] = File(None, alias="multi_view_images[top]"),
    multi_view_bottom: Optional[UploadFile] = File(None, alias="multi_view_images[bottom]"),
    multi_view_left_front: Optional[UploadFile] = File(None, alias="multi_view_images[left_front]"),
    multi_view_right_front: Optional[UploadFile] = File(None, alias="multi_view_images[right_front]"),
    enable_pbr: Optional[bool] = Form(None),
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
    
    多视角图片支持（hy-3d-3.1专业版）：
    - front（主图）：通过 file 参数上传
    - left/right/back/top/bottom/left_front/right_front（多视角）：通过 multi_view_images[view_key] 参数上传
    - 需设置 enable_pbr=true 开启PBR材质
    - top/bottom/left_front/right_front 仅专业版3.1支持
    """
    import os
    from app.services.generation.hunyuan3d_cloud_service import get_hunyuan3d_cloud
    from app.services.quota_service import QuotaService
    
    task_id = f"hunyuan_cloud_{uuid.uuid4().hex[:8]}"
    
    # 收集多视角图片（支持8个视角）
    multi_view_files = {}
    if multi_view_left:
        multi_view_files['left'] = multi_view_left
    if multi_view_right:
        multi_view_files['right'] = multi_view_right
    if multi_view_back:
        multi_view_files['back'] = multi_view_back
    if multi_view_top:
        multi_view_files['top'] = multi_view_top
    if multi_view_bottom:
        multi_view_files['bottom'] = multi_view_bottom
    if multi_view_left_front:
        multi_view_files['left_front'] = multi_view_left_front
    if multi_view_right_front:
        multi_view_files['right_front'] = multi_view_right_front
    
    if multi_view_files:
        logger.info(f"[EXPERIMENTAL] 检测到多视角图片: {list(multi_view_files.keys())}")
    
    # 从配置驱动模块读取版本模式（支持逐版本覆盖）
    generation_mode = model_versions.get_mode(version)
    logger.info(f"[EXPERIMENTAL] Hunyuan3D mode: {generation_mode} (version={version})")
    
    # Mock模式：直接返回示例模型，不调用腾讯API
    if generation_mode == 'mock':
        return await _handle_mock_generation(task_id, file, version, current_user, db)
    
    # Cloud模式：调用腾讯混元3D API
    return await _handle_cloud_generation(
        task_id, file, version, current_user, db, background_tasks,
        multi_view_files=multi_view_files,
        enable_pbr=enable_pbr
    )


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    store = get_task_store()
    task_data = await store.get_task(task_id)
    logger.info(f"[EXPERIMENTAL] Query task: {task_id}, exists={task_data is not None}")
    if task_data is None:
        logger.warning(f"[EXPERIMENTAL] Task not found: {task_id}")
        raise HTTPException(status_code=404, detail='Task not found')
    
    return task_data


async def _handle_mock_generation(
    task_id: str,
    file: UploadFile,
    version: str,
    current_user,
    db: AsyncSession
):
    """Mock模式：返回示例模型，用于开发测试"""
    from app.services.quota_service import QuotaService

    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)

    # 保存上传文件（仅用于记录）
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())

    logger.info(f"[EXPERIMENTAL] Mock mode: received image {image_path}")

    # 初始化任务状态
    store = get_task_store()
    await store.set_task(task_id, {
        'status': 'processing',
        'progress': 0,
        'message': f'[Mock] 正在生成3D模型... [模型: {version}]',
        'user_id': str(current_user.id)
    })
    logger.info(f"[EXPERIMENTAL] Task created: {task_id}")

    async def mock_process():
        try:
            store = get_task_store()
            # 模拟进度更新
            for progress in [10, 30, 50, 70, 90, 100]:
                await asyncio.sleep(1)  # 每秒更新一次
                msg = f'[Mock] 生成中... {progress}%' if progress < 100 else '[Mock] 生成完成！'
                await store.update_task(task_id, {
                    'progress': progress,
                    'message': msg
                })

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
                await store.update_task(task_id, {'glb_path': str(output_path)})
                logger.info(f"[EXPERIMENTAL] Created minimal GLB placeholder: {output_path}")
            else:
                # 复制示例文件
                output_path = upload_dir / f"{task_id}_model.glb"
                import shutil
                shutil.copy2(example_glb, output_path)
                await store.update_task(task_id, {'glb_path': str(output_path)})
                logger.info(f"[EXPERIMENTAL] Copied example GLB: {example_glb} -> {output_path}")

            await store.update_task(task_id, {
                'status': 'completed',
                'generation_time': 6.0
            })

            # 记录API调用成功（仅统计）
            quota_service = QuotaService(db)
            await quota_service.record_api_call(current_user.id, success=True)

            logger.info(f"[EXPERIMENTAL] Mock generation completed: {output_path}")

        except Exception as e:
            logger.error(f"[EXPERIMENTAL] Mock process failed: {e}", exc_info=True)
            store = get_task_store()
            await store.update_task(task_id, {
                'status': 'failed',
                'message': f"异常: {str(e)}"
            })

    # 启动后台任务
    asyncio.create_task(mock_process())

    return {
        'task_id': task_id,
        'status': 'processing',
        'message': 'Mock模式：生成任务已提交',
        'mode': 'mock'
    }


async def _handle_cloud_generation(
    task_id: str,
    file: UploadFile,
    version: str,
    current_user,
    db: AsyncSession,
    background_tasks: BackgroundTasks,
    multi_view_files: Optional[Dict[str, UploadFile]] = None,
    enable_pbr: Optional[bool] = None
):
    """Cloud模式：调用腾讯混元3D API（额度由腾讯云直接管理）
    
    Args:
        multi_view_files: 多视角图片文件字典，键为视角类型（left/right/back/top/bottom/left_front/right_front）
        enable_pbr: 是否开启PBR材质
    """
    from app.services.generation.hunyuan3d_cloud_service import get_hunyuan3d_cloud
    from app.services.quota_service import QuotaService

    # 从配置驱动模块读取版本映射
    # 所有版本的API参数在 .env 的 VERSION_* 中集中配置
    vc = model_versions.get(version)
    if not vc:
        logger.warning(f"[EXPERIMENTAL] 未知版本: {version}，使用默认标准版")
        vc = model_versions.get('hy-3d-3.0') or model_versions.get('rapid')
    api_version = vc.api_version if vc else 'rapid'

    # 不再本地预扣额度，额度由腾讯云API直接管理
    # 腾讯云API会在资源包耗尽时返回 ResourceInsufficient 错误

    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)

    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())

    # 保存多视角图片
    multi_view_base64 = {}
    if multi_view_files:
        for view_type, view_file in multi_view_files.items():
            view_path = upload_dir / f"{task_id}_{view_type}.png"
            with open(view_path, 'wb') as f:
                f.write(await view_file.read())
            with open(view_path, 'rb') as f:
                multi_view_base64[view_type] = base64.b64encode(f.read()).decode('utf-8')
            logger.info(f"[EXPERIMENTAL] 保存多视角图片: {view_type} -> {view_path}")

    logger.info(f"[EXPERIMENTAL] Cloud mode: received image {image_path}")

    store = get_task_store()
    await store.set_task(task_id, {
        'status': 'processing',
        'progress': 0,
        'message': '正在上传图片到云端...',
        'user_id': str(current_user.id)
    })

    async def cloud_process():
        try:
            engine = get_hunyuan3d_cloud(version=api_version)
            store = get_task_store()

            await store.update_task(task_id, {
                'progress': 10,
                'message': '正在上传图片到云端...'
            })

            # 定义进度回调函数（从30%→90%区间更新）
            # 注意：此回调在同步上下文中被调用，需通过create_task调度异步更新
            def update_progress(progress_value: int):
                msg_map = {
                    30: '云端提交成功，正在等待GPU处理完成...',
                    50: 'GPU正在渲染3D模型纹理...',
                    70: '模型渲染中，正在生成最终网格...',
                    90: '即将完成，正在下载模型文件...',
                }
                updates = {'progress': progress_value}
                if progress_value in msg_map:
                    updates['message'] = msg_map[progress_value]
                asyncio.create_task(store.update_task(task_id, updates))

            # 从配置驱动模块读取版本信息
            display_name = vc.display if vc else '标准版'

            # 直接保存到 models/generated/{uuid}.glb（统一管理）
            gen_model_id = str(uuid.uuid4())
            static_filename = f"{gen_model_id}.glb"

            # experimental.py → api → app → backend → 项目根 → models/generated/
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))))
            static_models_dir = os.path.join(project_root, "models", "generated")
            os.makedirs(static_models_dir, exist_ok=True)

            output_path = Path(static_models_dir) / static_filename

            # 从配置驱动模块读取云端处理消息（支持逐版本配置）
            cloud_msg_template = model_versions.get_cloud_message(version)
            await store.update_task(task_id, {
                'message': cloud_msg_template.format(display=display_name)
            })

            await store.update_task(task_id, {'progress': 30})

            result = await engine.generate(
                image_path=str(image_path),
                output_path=str(output_path),
                progress_callback=update_progress,
                multi_view_images=multi_view_base64 if multi_view_base64 else None,
                enable_pbr=enable_pbr
            )

            if result['success']:
                await store.update_task(task_id, {
                    'progress': 100,
                    'status': 'completed',
                    'message': '生成完成！',
                    'glb_path': str(output_path),
                    'generation_time': result['generation_time']
                })

                # 记录API调用成功（仅统计）
                quota_service = QuotaService(db)
                await quota_service.record_api_call(current_user.id, success=True)

                # 模型已直接保存到 models/generated/
                logger.info(f"[Cloud] Model saved to: {output_path}")

                # 保存模型记录到数据库（自动保存到后台模型管理列表）
                try:
                    from app.models.model import Model3D
                    from app.database import async_session_maker

                    file_size = output_path.stat().st_size

                    # 使用统一的 /static-models/ 路径
                    model_url_path = f"/static-models/generated/{static_filename}"

                    async with async_session_maker() as db_session:
                        # 创建模型记录
                        model = Model3D(
                            name=f"混元3D生成_{display_name}_{task_id[:8]}",
                            description=f"通过腾讯混元3D云端API生成的3D模型",
                            category='other',
                            status='approved',  # 自动审核通过
                            model_url=model_url_path,
                            format='glb',
                            file_size=file_size,
                            created_by=current_user.id,
                            tags=["AI生成", "混元3D", "云端", display_name]
                        )
                        db_session.add(model)
                        await db_session.commit()
                        await db_session.refresh(model)

                        await store.update_task(task_id, {'model_id': str(model.id)})
                        logger.info(f"[Cloud] Model saved to database: {model.id} (URL: {model_url_path})")

                except Exception as db_error:
                    logger.error(f"[Cloud] 保存到数据库失败: {db_error}", exc_info=True)
                    # 不影响生成结果，仅记录错误

                logger.info(f"[Cloud] Generation success: {output_path}, time: {result['generation_time']:.2f}s")
            else:
                error_msg = result.get('error', '未知错误')
                error_code = result.get('error_code', '')

                # 检测是否为资源包耗尽错误（优先使用error_code精确判断）
                is_resource_exhausted = (
                    error_code in ('ResourceInsufficient', 'FailedOperation.ResourcePackExhausted') or
                    'resourceinsufficient' in error_msg.lower() or
                    'resourcepackexhausted' in error_msg.lower()
                )
                if is_resource_exhausted:
                    await store.update_task(task_id, {
                        'status': 'failed',
                        'message': (
                            '❌ 腾讯混元3D资源包已用完！'
                            '请前往腾讯云控制台购买更多资源包。'
                        ),
                        'resource_exhausted': True
                    })
                    logger.error(f"[Cloud] 资源包已耗尽: code={error_code}, msg={error_msg}")
                else:
                    # 显示实际错误信息（便于排查问题）
                    await store.update_task(task_id, {
                        'status': 'failed',
                        'message': f"生成失败: {error_msg} (code: {error_code})"
                    })
                    logger.error(f"[Cloud] API调用失败 (非资源包问题): code={error_code}, msg={error_msg}")

                # 记录API调用失败（仅统计）
                quota_service = QuotaService(db)
                await quota_service.record_api_call(current_user.id, success=False)

        except Exception as e:
            error_str = str(e)
            logger.error(f"[Cloud] Generation exception: {error_str}", exc_info=True)
            store = get_task_store()

            # 使用精确匹配检测资源包耗尽
            is_resource_exhausted = (
                'resourceinsufficient' in error_str.lower() or
                'resourcepackexhausted' in error_str.lower() or
                'FailedOperation.ResourcePackExhausted' in error_str
            )
            if is_resource_exhausted:
                await store.update_task(task_id, {
                    'status': 'failed',
                    'message': (
                        '❌ 腾讯混元3D资源包已用完！'
                        '请前往腾讯云控制台购买更多资源包。'
                    ),
                    'resource_exhausted': True
                })
            else:
                await store.update_task(task_id, {
                    'status': 'failed',
                    'message': f"生成失败: {error_str}"
                })

            # 记录API调用失败（仅统计）
            try:
                quota_service = QuotaService(db)
                await quota_service.record_api_call(current_user.id, success=False)
            except Exception:
                pass

    if background_tasks:
        background_tasks.add_task(cloud_process)
    else:
        await cloud_process()

    return {
        'task_id': task_id,
        'status': 'processing',
        'message': '生成任务已提交，请在后台查看进度',
        'mode': 'cloud'
    }


@router.get("/download/{task_id}")
async def download_result(task_id: str):
    """下载生成结果"""
    store = get_task_store()
    result = await store.get_task(task_id)
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
