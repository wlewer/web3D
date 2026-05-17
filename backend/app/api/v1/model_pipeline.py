"""
Web3D Backend - 模型优化管线API路由
Model Pipeline API: trigger optimization, query status, get LOD versions & analysis
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from pydantic import BaseModel, Field
from typing import Optional, List
from loguru import logger

from app.database import get_db
from app.models.model import Model3D
from app.models.model_asset import ModelAsset
from app.dependencies import get_current_user, require_role
from app.core.task_store import get_task_store
from app.services.model_pipeline.pipeline import ModelProcessingPipeline, PipelineOptions

router = APIRouter()


# ============== 请求/响应Schema ==============

class OptimizeRequest(BaseModel):
    """模型优化请求"""
    skip_analyze: bool = False
    skip_lod: bool = False
    skip_compress: bool = False
    skip_thumbnail: bool = False
    lod_levels: List[float] = Field(default_factory=lambda: [1.0, 0.5, 0.2])
    max_texture_resolution: int = 1024
    texture_quality: int = 80


class OptimizeResponse(BaseModel):
    """优化触发响应"""
    task_id: str
    model_id: str
    message: str


class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    task_id: str
    model_id: str
    status: str
    progress: int
    current_stage: str
    message: str


class LODItemResponse(BaseModel):
    """LOD版本条目"""
    id: str
    asset_type: str
    file_path: str
    file_size: Optional[int] = None
    metadata_json: Optional[str] = None
    created_at: Optional[str] = None


class LODListResponse(BaseModel):
    """LOD版本列表"""
    model_id: str
    lod_versions: List[LODItemResponse]
    total: int


class AnalysisResponse(BaseModel):
    """模型分析结果"""
    model_id: str
    analysis: dict


# ============== 辅助函数 ==============

def _resolve_file_path(model: Model3D) -> Optional[str]:
    """将模型的model_url解析为本地文件路径"""
    import os
    import urllib.parse

    url = model.model_url or ""
    if url.startswith("/static-models/"):
        # /static-models/xxx -> d:/HBuilderProjects/web3D/models/xxx
        filename = urllib.parse.unquote(url[len("/static-models/"):])
        project_root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
        )
        return os.path.join(project_root, "models", filename)
    elif url.startswith("/generation-models/"):
        # /generation-models/xxx -> backend/uploads/generation/xxx
        filename = urllib.parse.unquote(url[len("/generation-models/"):])
        backend_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..")
        )
        return os.path.join(backend_dir, "uploads", "generation", filename)
    elif os.path.isabs(url):
        return url
    else:
        # 相对路径
        backend_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..")
        )
        return os.path.join(backend_dir, url)


async def _save_pipeline_results(
    model_id: str,
    pipeline_result,
    db: AsyncSession,
):
    """将管线处理结果保存为ModelAsset记录"""
    import json
    import os

    # 保存分析结果
    if pipeline_result.analysis:
        # 删除旧的分析资产
        old_assets = await db.execute(
            select(ModelAsset).where(
                ModelAsset.model_id == model_id,
                ModelAsset.asset_type == "analysis",
            )
        )
        for old in old_assets.scalars().all():
            await db.delete(old)

        asset = ModelAsset(
            model_id=model_id,
            asset_type="analysis",
            file_path="",
            file_size=0,
            metadata_json=json.dumps(pipeline_result.analysis, ensure_ascii=False),
        )
        db.add(asset)

    # 保存LOD结果
    if pipeline_result.lod_results:
        # 删除旧的LOD资产
        old_lods = await db.execute(
            select(ModelAsset).where(
                ModelAsset.model_id == model_id,
                ModelAsset.asset_type.in_(["lod_high", "lod_medium", "lod_low"]),
            )
        )
        for old in old_lods.scalars().all():
            await db.delete(old)

        level_to_type = {1.0: "lod_high", 0.5: "lod_medium", 0.2: "lod_low"}
        for lod in pipeline_result.lod_results:
            lod_level = lod.get("level", 0)
            asset_type = level_to_type.get(lod_level, f"lod_{lod_level}")
            file_path = lod.get("output_path", "")
            file_size = lod.get("file_size", 0) or os.path.getsize(file_path) if file_path and os.path.exists(file_path) else 0

            asset = ModelAsset(
                model_id=model_id,
                asset_type=asset_type,
                file_path=file_path,
                file_size=file_size,
                metadata_json=json.dumps(lod, ensure_ascii=False),
            )
            db.add(asset)

    # 保存压缩结果
    if pipeline_result.compression_result:
        old_compressed = await db.execute(
            select(ModelAsset).where(
                ModelAsset.model_id == model_id,
                ModelAsset.asset_type == "compressed",
            )
        )
        for old in old_compressed.scalars().all():
            await db.delete(old)

        comp = pipeline_result.compression_result
        asset = ModelAsset(
            model_id=model_id,
            asset_type="compressed",
            file_path=comp.get("output_path", ""),
            file_size=comp.get("compressed_size", 0),
            metadata_json=json.dumps(comp, ensure_ascii=False),
        )
        db.add(asset)

    # 保存缩略图结果
    if pipeline_result.thumbnail_paths:
        old_thumbs = await db.execute(
            select(ModelAsset).where(
                ModelAsset.model_id == model_id,
                ModelAsset.asset_type.like("thumbnail_%"),
            )
        )
        for old in old_thumbs.scalars().all():
            await db.delete(old)

        for i, thumb_path in enumerate(pipeline_result.thumbnail_paths):
            angle_labels = ["thumbnail_front", "thumbnail_angle", "thumbnail_side"]
            asset_type = angle_labels[i] if i < len(angle_labels) else f"thumbnail_{i}"
            file_size = os.path.getsize(thumb_path) if os.path.exists(thumb_path) else 0

            asset = ModelAsset(
                model_id=model_id,
                asset_type=asset_type,
                file_path=thumb_path,
                file_size=file_size,
            )
            db.add(asset)

    await db.flush()


async def _run_pipeline_background(
    model_id: str,
    file_path: str,
    options: PipelineOptions,
    task_id: str,
):
    """后台执行管线处理"""
    from app.database import async_session_maker

    pipeline = ModelProcessingPipeline()
    task_store = get_task_store()

    try:
        result = await pipeline.process(
            model_id=model_id,
            file_path=file_path,
            task_store=task_store,
            options=options,
            task_id=task_id,
        )

        # 保存结果到数据库
        async with async_session_maker() as db:
            try:
                await _save_pipeline_results(model_id, result, db)
                await db.commit()
                logger.info(f"[PipelineAPI] Results saved for model {model_id}")
            except Exception as e:
                await db.rollback()
                logger.error(f"[PipelineAPI] Failed to save results for model {model_id}: {e}")

    except Exception as e:
        logger.error(f"[PipelineAPI] Pipeline execution failed for model {model_id}: {e}")
        try:
            await task_store.update_task(task_id, {
                "status": "failed",
                "message": f"Pipeline failed: {e}",
            })
        except Exception:
            pass


# ============== API端点 ==============

@router.post("/{model_id}/optimize", response_model=OptimizeResponse)
async def trigger_optimization(
    model_id: str,
    background_tasks: BackgroundTasks,
    request: OptimizeRequest = OptimizeRequest(),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("admin")),
):
    """
    触发模型优化管线（异步，返回task_id）
    Trigger model optimization pipeline (async, returns task_id)
    """
    # 1. 查找模型
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    # 2. 解析文件路径
    file_path = _resolve_file_path(model)
    if not file_path or not _file_exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model file not accessible: {model.model_url}",
        )

    # 3. 创建task_store条目
    task_store = get_task_store()
    import uuid
    task_id = str(uuid.uuid4())
    await task_store.set_task(task_id, {
        "task_id": task_id,
        "model_id": model_id,
        "status": "queued",
        "progress": 0,
        "current_stage": "init",
        "message": "Optimization task queued",
    })

    # 4. 构建管线选项
    options = PipelineOptions(
        skip_analyze=request.skip_analyze,
        skip_lod=request.skip_lod,
        skip_compress=request.skip_compress,
        skip_thumbnail=request.skip_thumbnail,
        lod_levels=request.lod_levels,
        max_texture_resolution=request.max_texture_resolution,
        texture_quality=request.texture_quality,
    )

    # 5. 后台执行管线
    background_tasks.add_task(
        _run_pipeline_background,
        model_id=model_id,
        file_path=file_path,
        options=options,
        task_id=task_id,
    )

    logger.info(f"[PipelineAPI] Optimization triggered for model {model_id}, task_id={task_id}")

    return OptimizeResponse(
        task_id=task_id,
        model_id=model_id,
        message="Optimization task queued. Use GET /optimize/status to check progress.",
    )


@router.get("/{model_id}/optimize/status", response_model=TaskStatusResponse)
async def get_optimization_status(
    model_id: str,
    task_id: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    """
    查询优化进度
    Query optimization progress by task_id or latest task for model_id
    """
    task_store = get_task_store()

    if task_id:
        task_data = await task_store.get_task(task_id)
        if not task_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )
        if task_data.get("model_id") != model_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task does not belong to this model",
            )
    else:
        # 没有指定task_id，返回模型最新的任务
        # 由于task_store不按model_id索引，这里返回提示
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="task_id is required. Please provide the task_id returned by the optimize endpoint.",
        )

    return TaskStatusResponse(
        task_id=task_data.get("task_id", ""),
        model_id=task_data.get("model_id", model_id),
        status=task_data.get("status", "unknown"),
        progress=task_data.get("progress", 0),
        current_stage=task_data.get("current_stage", ""),
        message=task_data.get("message", ""),
    )


@router.get("/{model_id}/lod", response_model=LODListResponse)
async def get_lod_versions(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    获取LOD版本列表
    Get LOD version list for a model
    """
    # 检查模型是否存在
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    # 查询LOD资产
    lod_result = await db.execute(
        select(ModelAsset).where(
            ModelAsset.model_id == model_id,
            ModelAsset.asset_type.in_(["lod_high", "lod_medium", "lod_low"]),
        ).order_by(ModelAsset.created_at.desc())
    )
    lod_assets = lod_result.scalars().all()

    lod_items = [
        LODItemResponse(
            id=asset.id,
            asset_type=asset.asset_type,
            file_path=asset.file_path,
            file_size=asset.file_size,
            metadata_json=asset.metadata_json,
            created_at=str(asset.created_at) if asset.created_at else None,
        )
        for asset in lod_assets
    ]

    return LODListResponse(
        model_id=model_id,
        lod_versions=lod_items,
        total=len(lod_items),
    )


@router.get("/{model_id}/analysis", response_model=AnalysisResponse)
async def get_model_analysis(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    获取模型分析结果
    Get model analysis result
    """
    # 检查模型是否存在
    result = await db.execute(
        select(Model3D).where(Model3D.id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found",
        )

    # 查询分析资产
    import json
    analysis_result = await db.execute(
        select(ModelAsset).where(
            ModelAsset.model_id == model_id,
            ModelAsset.asset_type == "analysis",
        ).order_by(ModelAsset.created_at.desc())
    )
    analysis_asset = analysis_result.scalar_one_or_none()

    if not analysis_asset or not analysis_asset.metadata_json:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis result not found. Run optimization first.",
        )

    try:
        analysis_data = json.loads(analysis_asset.metadata_json)
    except json.JSONDecodeError:
        analysis_data = {"raw": analysis_asset.metadata_json}

    return AnalysisResponse(
        model_id=model_id,
        analysis=analysis_data,
    )


def _file_exists(path: str) -> bool:
    """检查文件是否存在"""
    import os
    return os.path.isfile(path)
