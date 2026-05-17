"""
Web3D Backend - 模型处理管线编排
Model Processing Pipeline: analyze → LOD → compress → thumbnail
"""
import os
import json
import uuid
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

from loguru import logger

from app.services.model_pipeline.model_analyzer import ModelAnalyzer, ModelAnalysisResult
from app.services.model_pipeline.lod_generator import LODGenerator, LODResult
from app.services.model_pipeline.texture_compressor import TextureCompressor, CompressionResult
from app.services.model_pipeline.thumbnail_generator import ThumbnailGenerator


@dataclass
class PipelineOptions:
    """管线配置选项"""
    skip_analyze: bool = False
    skip_lod: bool = False
    skip_compress: bool = False
    skip_thumbnail: bool = False
    lod_levels: List[float] = field(default_factory=lambda: [1.0, 0.5, 0.2])
    max_texture_resolution: int = 1024
    texture_quality: int = 80
    thumbnail_angles: List[tuple] = field(default_factory=lambda: [(0, 0), (45, 45), (0, 90)])


@dataclass
class PipelineResult:
    """管线处理结果"""
    model_id: str
    task_id: str
    analysis: Optional[Dict[str, Any]] = None
    lod_results: Optional[List[Dict[str, Any]]] = None
    compression_result: Optional[Dict[str, Any]] = None
    thumbnail_paths: Optional[List[str]] = None
    errors: List[Dict[str, str]] = field(default_factory=list)
    success: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "task_id": self.task_id,
            "analysis": self.analysis,
            "lod_results": self.lod_results,
            "compression_result": self.compression_result,
            "thumbnail_paths": self.thumbnail_paths,
            "errors": self.errors,
            "success": self.success,
        }


class ModelProcessingPipeline:
    """模型处理管线：分析→减面→压缩→缩略图"""

    def __init__(self):
        self.analyzer = ModelAnalyzer()
        self.lod_generator = LODGenerator()
        self.texture_compressor = TextureCompressor()
        self.thumbnail_generator = ThumbnailGenerator()

    async def process(
        self,
        model_id: str,
        file_path: str,
        task_store,
        options: PipelineOptions = None,
        task_id: str = None,
    ) -> PipelineResult:
        """
        执行完整处理流程，通过task_store更新进度

        Pipeline stages:
            analyze(10%) → lod(40%) → compress(70%) → thumbnail(90%) → done(100%)

        Args:
            model_id: 模型ID
            file_path: 模型文件路径
            task_store: TaskStore实例，用于更新进度
            options: 管线配置选项

        Returns:
            PipelineResult
        """
        if options is None:
            options = PipelineOptions()

        if task_id is None:
            task_id = str(uuid.uuid4())
        result = PipelineResult(model_id=model_id, task_id=task_id)

        # 创建输出目录
        output_base = os.path.join(
            os.path.dirname(file_path),
            "pipeline_output",
            model_id,
        )
        os.makedirs(output_base, exist_ok=True)

        # 初始化任务状态
        await task_store.set_task(task_id, {
            "task_id": task_id,
            "model_id": model_id,
            "status": "processing",
            "progress": 0,
            "current_stage": "init",
            "message": "Pipeline initialized",
        })

        # ============ Stage 1: 分析 (0% → 10%) ============
        if not options.skip_analyze:
            try:
                await task_store.update_task(task_id, {
                    "current_stage": "analyze",
                    "progress": 5,
                    "message": "Analyzing model...",
                })

                analysis: ModelAnalysisResult = self.analyzer.analyze(file_path)
                result.analysis = analysis.to_dict()

                await task_store.update_task(task_id, {
                    "progress": 10,
                    "message": f"Analysis complete: {analysis.face_count or 0} faces, {analysis.vertex_count or 0} vertices",
                    "analysis": result.analysis,
                })

                logger.info(f"[Pipeline] Analysis done for model {model_id}: faces={analysis.face_count}")
            except Exception as e:
                logger.error(f"[Pipeline] Analysis failed for model {model_id}: {e}")
                result.errors.append({"stage": "analyze", "error": str(e)})
                await task_store.update_task(task_id, {
                    "progress": 10,
                    "message": f"Analysis failed: {e}",
                })
        else:
            await task_store.update_task(task_id, {"progress": 10, "message": "Analysis skipped"})

        # ============ Stage 2: LOD减面 (10% → 40%) ============
        if not options.skip_lod:
            try:
                await task_store.update_task(task_id, {
                    "current_stage": "lod",
                    "progress": 15,
                    "message": "Generating LOD models...",
                })

                lod_dir = os.path.join(output_base, "lod")
                lod_results: List[LODResult] = self.lod_generator.generate_lod(
                    input_path=file_path,
                    output_dir=lod_dir,
                    levels=options.lod_levels,
                )
                result.lod_results = [r.to_dict() for r in lod_results]

                successful_lods = sum(1 for r in lod_results if r.success)
                await task_store.update_task(task_id, {
                    "progress": 40,
                    "message": f"LOD generation complete: {successful_lods}/{len(lod_results)} levels",
                    "lod_results": result.lod_results,
                })

                logger.info(f"[Pipeline] LOD done for model {model_id}: {successful_lods} levels")
            except Exception as e:
                logger.error(f"[Pipeline] LOD generation failed for model {model_id}: {e}")
                result.errors.append({"stage": "lod", "error": str(e)})
                await task_store.update_task(task_id, {
                    "progress": 40,
                    "message": f"LOD generation failed: {e}",
                })
        else:
            await task_store.update_task(task_id, {"progress": 40, "message": "LOD generation skipped"})

        # ============ Stage 3: 纹理压缩 (40% → 70%) ============
        if not options.skip_compress:
            try:
                await task_store.update_task(task_id, {
                    "current_stage": "compress",
                    "progress": 45,
                    "message": "Compressing textures...",
                })

                compress_dir = os.path.join(output_base, "compressed")
                os.makedirs(compress_dir, exist_ok=True)

                ext = os.path.splitext(file_path)[1].lower()
                compressed_path = os.path.join(
                    compress_dir,
                    f"{os.path.splitext(os.path.basename(file_path))[0]}_compressed{ext}",
                )

                compression: CompressionResult = self.texture_compressor.compress(
                    input_path=file_path,
                    output_path=compressed_path,
                    max_resolution=options.max_texture_resolution,
                    quality=options.texture_quality,
                )
                result.compression_result = compression.to_dict()

                await task_store.update_task(task_id, {
                    "progress": 70,
                    "message": f"Texture compression complete: {compression.compression_ratio:.1%} ratio",
                    "compression_result": result.compression_result,
                })

                logger.info(
                    f"[Pipeline] Texture compression done for model {model_id}: "
                    f"{compression.original_size} -> {compression.compressed_size} bytes"
                )
            except Exception as e:
                logger.error(f"[Pipeline] Texture compression failed for model {model_id}: {e}")
                result.errors.append({"stage": "compress", "error": str(e)})
                await task_store.update_task(task_id, {
                    "progress": 70,
                    "message": f"Texture compression failed: {e}",
                })
        else:
            await task_store.update_task(task_id, {"progress": 70, "message": "Texture compression skipped"})

        # ============ Stage 4: 缩略图生成 (70% → 90%) ============
        if not options.skip_thumbnail:
            try:
                await task_store.update_task(task_id, {
                    "current_stage": "thumbnail",
                    "progress": 75,
                    "message": "Generating thumbnails...",
                })

                thumb_dir = os.path.join(output_base, "thumbnails")
                thumbnail_paths: List[str] = self.thumbnail_generator.generate(
                    input_path=file_path,
                    output_dir=thumb_dir,
                    angles=options.thumbnail_angles,
                )
                result.thumbnail_paths = thumbnail_paths

                await task_store.update_task(task_id, {
                    "progress": 90,
                    "message": f"Thumbnail generation complete: {len(thumbnail_paths)} images",
                    "thumbnail_paths": thumbnail_paths,
                })

                logger.info(f"[Pipeline] Thumbnails done for model {model_id}: {len(thumbnail_paths)} images")
            except Exception as e:
                logger.error(f"[Pipeline] Thumbnail generation failed for model {model_id}: {e}")
                result.errors.append({"stage": "thumbnail", "error": str(e)})
                await task_store.update_task(task_id, {
                    "progress": 90,
                    "message": f"Thumbnail generation failed: {e}",
                })
        else:
            await task_store.update_task(task_id, {"progress": 90, "message": "Thumbnail generation skipped"})

        # ============ 完成 (90% → 100%) ============
        final_status = "completed" if not result.errors else "completed_with_errors"
        result.success = len(result.errors) == 0

        await task_store.update_task(task_id, {
            "status": final_status,
            "progress": 100,
            "current_stage": "done",
            "message": f"Pipeline complete ({final_status})",
            "result": result.to_dict(),
        })

        logger.info(
            f"[Pipeline] Complete for model {model_id}: status={final_status}, "
            f"errors={len(result.errors)}"
        )

        return result
