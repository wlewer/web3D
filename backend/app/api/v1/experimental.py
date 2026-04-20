"""
实验性AI 3D生成功能 - 后台管理专用
TODO: 需要实施完整的TripoSR和HuggingFace服务
"""
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse, FileResponse
import uuid
import asyncio
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

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
    background_tasks: BackgroundTasks = None
):
    """
    HuggingFace API生成（需要登录）
    
    TODO: 实施完整的HuggingFace API调用
    当前返回Mock数据用于UI测试
    """
    task_id = f"hf_{uuid.uuid4().hex[:8]}"
    
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = upload_dir / f"{task_id}_input.png"
    with open(image_path, 'wb') as f:
        f.write(await file.read())
    
    logger.info(f"[EXPERIMENTAL] Received image for HuggingFace: {image_path}")
    
    task_status[task_id] = {
        'status': 'processing',
        'progress': 0
    }
    
    # TODO: 实施真实的HuggingFace API调用
    async def mock_process():
        import time
        await asyncio.sleep(1)
        task_status[task_id]['progress'] = 30
        task_status[task_id]['message'] = '正在上传图片到云端...'
        
        await asyncio.sleep(1)
        task_status[task_id]['progress'] = 60
        task_status[task_id]['message'] = '云端GPU处理中...'
        
        await asyncio.sleep(1)
        task_status[task_id]['progress'] = 90
        task_status[task_id]['message'] = '正在下载结果...'
        
        await asyncio.sleep(1)
        task_status[task_id]['progress'] = 100
        task_status[task_id]['status'] = 'completed'
        task_status[task_id]['message'] = '生成完成！'
        
        # 复制示例GLB文件（尝试多个路径）
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
        'status': 'processing'
    }


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """查询任务状态"""
    if task_id not in task_status:
        raise HTTPException(status_code=404, detail='Task not found')
    
    return task_status[task_id]


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
