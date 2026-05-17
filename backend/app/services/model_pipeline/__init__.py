"""
Web3D Backend - 模型优化管线服务包
Model optimization pipeline: analyze → LOD decimation → texture compress → thumbnail
"""
from app.services.model_pipeline.model_analyzer import ModelAnalyzer, ModelAnalysisResult
from app.services.model_pipeline.lod_generator import LODGenerator, LODResult
from app.services.model_pipeline.texture_compressor import TextureCompressor, CompressionResult
from app.services.model_pipeline.thumbnail_generator import ThumbnailGenerator
from app.services.model_pipeline.pipeline import ModelProcessingPipeline, PipelineOptions, PipelineResult

__all__ = [
    "ModelAnalyzer",
    "ModelAnalysisResult",
    "LODGenerator",
    "LODResult",
    "TextureCompressor",
    "CompressionResult",
    "ThumbnailGenerator",
    "ModelProcessingPipeline",
    "PipelineOptions",
    "PipelineResult",
]
