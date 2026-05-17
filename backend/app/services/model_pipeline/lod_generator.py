"""
Web3D Backend - LOD减面服务
LOD Generator: generate multi-level LOD models via quadric decimation
"""
import os
import uuid
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from loguru import logger


@dataclass
class LODResult:
    """单级LOD生成结果"""
    level: float                           # 保留面数比例（1.0/0.5/0.2）
    output_path: str                       # 输出文件路径
    original_face_count: Optional[int] = None   # 原始面数
    decimated_face_count: Optional[int] = None  # 简化后面数
    file_size: Optional[int] = None        # 文件大小（字节）
    success: bool = True
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level,
            "output_path": self.output_path,
            "original_face_count": self.original_face_count,
            "decimated_face_count": self.decimated_face_count,
            "file_size": self.file_size,
            "success": self.success,
            "error": self.error,
        }


class LODGenerator:
    """生成多级LOD模型"""

    def generate_lod(
        self,
        input_path: str,
        output_dir: str,
        levels: List[float] = None,
    ) -> List[LODResult]:
        """
        生成多级LOD模型

        Args:
            input_path: 输入模型文件路径
            output_dir: 输出目录
            levels: 保留面数比例列表，默认 [1.0, 0.5, 0.2]
                    1.0 = 原始质量, 0.5 = 50%面数, 0.2 = 20%面数

        Returns:
            每级LOD的LODResult列表
        """
        if levels is None:
            levels = [1.0, 0.5, 0.2]

        os.makedirs(output_dir, exist_ok=True)
        results: List[LODResult] = []

        # 检查输入文件
        if not os.path.isfile(input_path):
            logger.error(f"[LODGenerator] Input file not found: {input_path}")
            for level in levels:
                results.append(LODResult(
                    level=level,
                    output_path="",
                    success=False,
                    error=f"Input file not found: {input_path}",
                ))
            return results

        # 检查格式是否支持
        ext = os.path.splitext(input_path)[1].lower()
        loadable_formats = {".glb", ".gltf", ".obj", ".stl", ".ply", ".off"}
        if ext not in loadable_formats:
            logger.warning(f"[LODGenerator] Format {ext} not supported for LOD generation: {input_path}")
            for level in levels:
                results.append(LODResult(
                    level=level,
                    output_path="",
                    success=False,
                    error=f"Format {ext} not supported for LOD generation",
                ))
            return results

        # 加载模型
        try:
            import trimesh
            scene = trimesh.load(input_path, force="scene")
        except Exception as e:
            logger.error(f"[LODGenerator] Failed to load model: {input_path} - {e}")
            for level in levels:
                results.append(LODResult(
                    level=level,
                    output_path="",
                    success=False,
                    error=f"Failed to load model: {e}",
                ))
            return results

        # 获取原始总面数
        original_face_count = self._count_faces(scene)
        base_name = os.path.splitext(os.path.basename(input_path))[0]

        for level in levels:
            try:
                result = self._generate_single_lod(
                    scene=scene,
                    output_dir=output_dir,
                    base_name=base_name,
                    level=level,
                    original_face_count=original_face_count,
                )
                results.append(result)
            except Exception as e:
                logger.error(f"[LODGenerator] LOD level {level} failed: {e}")
                results.append(LODResult(
                    level=level,
                    output_path="",
                    original_face_count=original_face_count,
                    success=False,
                    error=str(e),
                ))

        return results

    def _generate_single_lod(
        self,
        scene,
        output_dir: str,
        base_name: str,
        level: float,
        original_face_count: int,
    ) -> LODResult:
        """生成单级LOD"""
        import trimesh

        # level=1.0 直接导出原始模型
        if level >= 1.0:
            output_path = os.path.join(output_dir, f"{base_name}_lod_high.glb")
            scene.export(output_path, file_type="glb")
            file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
            logger.info(f"[LODGenerator] LOD 1.0 (original): {output_path} ({file_size} bytes)")
            return LODResult(
                level=level,
                output_path=output_path,
                original_face_count=original_face_count,
                decimated_face_count=original_face_count,
                file_size=file_size,
                success=True,
            )

        # 计算目标面数
        target_face_count = max(int(original_face_count * level), 4)  # 至少4个面

        # 对场景中的每个网格进行减面
        decimated_scene = trimesh.Scene()
        total_decimated_faces = 0

        for name, geometry in scene.geometry.items():
            if isinstance(geometry, trimesh.Trimesh):
                current_faces = len(geometry.faces)
                mesh_target = max(int(current_faces * level), 4)

                if mesh_target < current_faces:
                    try:
                        decimated = geometry.simplify_quadric_decimation(face_count=mesh_target)
                        # 验证简化后模型完整性
                        decimated = self._validate_mesh(decimated, geometry)
                        total_decimated_faces += len(decimated.faces)
                        decimated_scene.add_geometry(decimated, node_name=name)
                    except Exception as e:
                        logger.warning(f"[LODGenerator] Decimation failed for mesh '{name}', using original: {e}")
                        decimated_scene.add_geometry(geometry, node_name=name)
                        total_decimated_faces += current_faces
                else:
                    decimated_scene.add_geometry(geometry, node_name=name)
                    total_decimated_faces += current_faces
            else:
                # 非Trimesh对象（如PointCloud等），直接添加
                decimated_scene.add_geometry(geometry, node_name=name)

        # 确定LOD级别标签
        if level > 0.5:
            lod_tag = "medium"
        else:
            lod_tag = "low"

        output_path = os.path.join(output_dir, f"{base_name}_lod_{lod_tag}.glb")
        decimated_scene.export(output_path, file_type="glb")
        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

        logger.info(
            f"[LODGenerator] LOD {level}: {output_path} | "
            f"faces {original_face_count} -> {total_decimated_faces} | {file_size} bytes"
        )

        return LODResult(
            level=level,
            output_path=output_path,
            original_face_count=original_face_count,
            decimated_face_count=total_decimated_faces,
            file_size=file_size,
            success=True,
        )

    def _count_faces(self, scene) -> int:
        """统计场景中所有网格的总面数"""
        import trimesh
        total = 0
        for geometry in scene.geometry.values():
            if isinstance(geometry, trimesh.Trimesh):
                total += len(geometry.faces)
        return total

    def _validate_mesh(self, decimated_mesh, original_mesh) -> "trimesh.Trimesh":
        """
        验证简化后模型的完整性
        如果简化后模型损坏，回退到原始模型
        """
        try:
            import trimesh
            # 检查面数是否合理
            if len(decimated_mesh.faces) == 0:
                logger.warning("[LODGenerator] Decimated mesh has 0 faces, falling back to original")
                return original_mesh

            # 检查顶点数是否合理
            if len(decimated_mesh.vertices) == 0:
                logger.warning("[LODGenerator] Decimated mesh has 0 vertices, falling back to original")
                return original_mesh

            # 检查是否为水密（可选，不强制要求）
            # 某些减面操作可能破坏水密性，这是正常的
            return decimated_mesh
        except Exception as e:
            logger.warning(f"[LODGenerator] Mesh validation failed, falling back to original: {e}")
            return original_mesh
