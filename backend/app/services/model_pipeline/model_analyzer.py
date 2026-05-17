"""
Web3D Backend - 模型分析器
Model Analyzer: analyze 3D model metrics (vertices, faces, textures, bounding box, etc.)
"""
import os
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from loguru import logger


@dataclass
class ModelAnalysisResult:
    """模型分析结果"""
    file_path: str
    file_size: int                          # 文件大小（字节）
    format: str                             # 文件格式扩展名
    loadable: bool                          # trimesh是否可加载
    vertex_count: Optional[int] = None      # 顶点数
    face_count: Optional[int] = None        # 面数
    texture_count: Optional[int] = None     # 纹理贴图数
    bounding_box: Optional[Dict[str, List[float]]] = None  # 包围盒 {min: [x,y,z], max: [x,y,z]}
    mesh_count: Optional[int] = None        # 网格数量
    has_vertex_colors: Optional[bool] = None
    error: Optional[str] = None             # 加载失败时的错误信息
    extra: Dict[str, Any] = field(default_factory=dict)  # 额外信息

    def to_dict(self) -> Dict[str, Any]:
        return {
            "file_path": self.file_path,
            "file_size": self.file_size,
            "format": self.format,
            "loadable": self.loadable,
            "vertex_count": self.vertex_count,
            "face_count": self.face_count,
            "texture_count": self.texture_count,
            "bounding_box": self.bounding_box,
            "mesh_count": self.mesh_count,
            "has_vertex_colors": self.has_vertex_colors,
            "error": self.error,
            "extra": self.extra,
        }


# trimesh可加载的格式
TRIMESH_LOADABLE_FORMATS = {".glb", ".gltf", ".obj", ".stl", ".ply", ".off", ".xyz"}


class ModelAnalyzer:
    """分析3D模型的各项指标"""

    def analyze(self, file_path: str) -> ModelAnalysisResult:
        """
        分析3D模型文件

        Args:
            file_path: 模型文件绝对路径

        Returns:
            ModelAnalysisResult 包含面数/顶点数/纹理数/文件大小/包围盒/格式等
        """
        if not os.path.isfile(file_path):
            return ModelAnalysisResult(
                file_path=file_path,
                file_size=0,
                format="",
                loadable=False,
                error=f"File not found: {file_path}",
            )

        ext = os.path.splitext(file_path)[1].lower()
        file_size = os.path.getsize(file_path)

        # 非trimesh可加载格式：仅报告文件大小
        if ext not in TRIMESH_LOADABLE_FORMATS:
            logger.info(f"[ModelAnalyzer] Format {ext} not loadable by trimesh, reporting file size only: {file_path}")
            return ModelAnalysisResult(
                file_path=file_path,
                file_size=file_size,
                format=ext.lstrip("."),
                loadable=False,
                extra={"reason": f"Format {ext} not supported by trimesh for analysis"},
            )

        # 尝试用trimesh加载
        try:
            import trimesh
            scene = trimesh.load(file_path, force="scene")
            return self._analyze_scene(file_path, file_size, ext, scene)
        except Exception as e:
            logger.warning(f"[ModelAnalyzer] trimesh scene load failed for {file_path}: {e}, trying mesh load")
            try:
                import trimesh
                mesh = trimesh.load(file_path, force="mesh")
                return self._analyze_mesh(file_path, file_size, ext, mesh)
            except Exception as e2:
                logger.error(f"[ModelAnalyzer] Failed to load {file_path}: {e2}")
                return ModelAnalysisResult(
                    file_path=file_path,
                    file_size=file_size,
                    format=ext.lstrip("."),
                    loadable=False,
                    error=str(e2),
                )

    def _analyze_scene(self, file_path: str, file_size: int, ext: str, scene) -> ModelAnalysisResult:
        """分析trimesh.Scene对象"""
        import trimesh

        total_vertices = 0
        total_faces = 0
        texture_count = 0
        mesh_count = 0
        has_vertex_colors = False
        all_vertices = []

        for geometry in scene.geometry.values():
            if isinstance(geometry, trimesh.Trimesh):
                mesh_count += 1
                total_vertices += len(geometry.vertices)
                total_faces += len(geometry.faces)
                if geometry.visual and hasattr(geometry.visual, 'material'):
                    material = geometry.visual.material
                    if hasattr(material, 'image') and material.image is not None:
                        texture_count += 1
                    if hasattr(material, 'baseColorTexture') and material.baseColorTexture is not None:
                        texture_count += 1
                    if hasattr(material, 'emissiveTexture') and material.emissiveTexture is not None:
                        texture_count += 1
                    if hasattr(material, 'normalTexture') and material.normalTexture is not None:
                        texture_count += 1
                    if hasattr(material, 'metallicRoughnessTexture') and material.metallicRoughnessTexture is not None:
                        texture_count += 1
                if hasattr(geometry, 'visual') and hasattr(geometry.visual, 'vertex_attributes'):
                    if geometry.visual.vertex_attributes is not None:
                        has_vertex_colors = True
                all_vertices.append(geometry.vertices)

        # 计算包围盒
        bounding_box = None
        if all_vertices:
            import numpy as np
            try:
                all_v = np.vstack(all_vertices)
                bounding_box = {
                    "min": all_v.min(axis=0).tolist(),
                    "max": all_v.max(axis=0).tolist(),
                }
            except Exception:
                pass

        logger.info(
            f"[ModelAnalyzer] Scene analyzed: {file_path} | "
            f"meshes={mesh_count}, vertices={total_vertices}, faces={total_faces}, textures={texture_count}"
        )

        return ModelAnalysisResult(
            file_path=file_path,
            file_size=file_size,
            format=ext.lstrip("."),
            loadable=True,
            vertex_count=total_vertices,
            face_count=total_faces,
            texture_count=texture_count,
            bounding_box=bounding_box,
            mesh_count=mesh_count,
            has_vertex_colors=has_vertex_colors,
        )

    def _analyze_mesh(self, file_path: str, file_size: int, ext: str, mesh) -> ModelAnalysisResult:
        """分析trimesh.Trimesh对象（单网格）"""
        import trimesh
        import numpy as np

        vertex_count = len(mesh.vertices)
        face_count = len(mesh.faces) if hasattr(mesh, 'faces') else 0

        texture_count = 0
        has_vertex_colors = False

        if mesh.visual and hasattr(mesh.visual, 'material'):
            material = mesh.visual.material
            if hasattr(material, 'image') and material.image is not None:
                texture_count += 1
            if hasattr(material, 'baseColorTexture') and material.baseColorTexture is not None:
                texture_count += 1

        bounding_box = {
            "min": mesh.vertices.min(axis=0).tolist(),
            "max": mesh.vertices.max(axis=0).tolist(),
        }

        logger.info(
            f"[ModelAnalyzer] Mesh analyzed: {file_path} | "
            f"vertices={vertex_count}, faces={face_count}, textures={texture_count}"
        )

        return ModelAnalysisResult(
            file_path=file_path,
            file_size=file_size,
            format=ext.lstrip("."),
            loadable=True,
            vertex_count=vertex_count,
            face_count=face_count,
            texture_count=texture_count,
            bounding_box=bounding_box,
            mesh_count=1,
            has_vertex_colors=has_vertex_colors,
        )
