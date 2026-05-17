"""
Web3D Backend - 纹理压缩服务
Texture Compressor: extract textures from GLB, compress resolution, convert to WebP, repack
"""
import os
import io
import uuid
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Tuple
from loguru import logger


@dataclass
class CompressionResult:
    """纹理压缩结果"""
    input_path: str
    output_path: str
    original_size: int                     # 原始文件大小（字节）
    compressed_size: int                   # 压缩后文件大小（字节）
    compression_ratio: float               # 压缩比（0.0-1.0）
    textures_processed: int = 0            # 处理的纹理数量
    texture_details: List[Dict[str, Any]] = field(default_factory=list)  # 每张纹理的压缩详情
    success: bool = True
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "input_path": self.input_path,
            "output_path": self.output_path,
            "original_size": self.original_size,
            "compressed_size": self.compressed_size,
            "compression_ratio": round(self.compression_ratio, 4),
            "textures_processed": self.textures_processed,
            "texture_details": self.texture_details,
            "success": self.success,
            "error": self.error,
        }


class TextureCompressor:
    """压缩模型中的纹理贴图"""

    def compress(
        self,
        input_path: str,
        output_path: str,
        max_resolution: int = 1024,
        quality: int = 80,
    ) -> CompressionResult:
        """
        压缩GLB模型中的纹理贴图

        Args:
            input_path: 输入GLB文件路径
            output_path: 输出GLB文件路径
            max_resolution: 最大纹理分辨率（宽或高），默认1024
            quality: WebP压缩质量（1-100），默认80

        Returns:
            CompressionResult 包含压缩前后大小对比
        """
        if not os.path.isfile(input_path):
            return CompressionResult(
                input_path=input_path,
                output_path=output_path,
                original_size=0,
                compressed_size=0,
                compression_ratio=0.0,
                success=False,
                error=f"Input file not found: {input_path}",
            )

        original_size = os.path.getsize(input_path)

        ext = os.path.splitext(input_path)[1].lower()
        if ext not in {".glb", ".gltf"}:
            logger.warning(f"[TextureCompressor] Format {ext} not supported for texture compression, copying as-is")
            import shutil
            try:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                shutil.copy2(input_path, output_path)
                return CompressionResult(
                    input_path=input_path,
                    output_path=output_path,
                    original_size=original_size,
                    compressed_size=original_size,
                    compression_ratio=1.0,
                    success=True,
                    error=f"Format {ext} not supported, file copied as-is",
                )
            except Exception as e:
                return CompressionResult(
                    input_path=input_path,
                    output_path=output_path,
                    original_size=original_size,
                    compressed_size=0,
                    compression_ratio=0.0,
                    success=False,
                    error=f"Failed to copy file: {e}",
                )

        try:
            return self._compress_glb(input_path, output_path, max_resolution, quality, original_size)
        except Exception as e:
            logger.error(f"[TextureCompressor] Failed to compress textures: {e}")
            return CompressionResult(
                input_path=input_path,
                output_path=output_path,
                original_size=original_size,
                compressed_size=0,
                compression_ratio=0.0,
                success=False,
                error=str(e),
            )

    def _compress_glb(
        self,
        input_path: str,
        output_path: str,
        max_resolution: int,
        quality: int,
        original_size: int,
    ) -> CompressionResult:
        """压缩GLB文件中的纹理"""
        from PIL import Image
        import trimesh

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

        # 加载GLB场景
        scene = trimesh.load(input_path, force="scene")
        texture_details: List[Dict[str, Any]] = []
        textures_processed = 0

        for name, geometry in scene.geometry.items():
            if not hasattr(geometry, 'visual') or geometry.visual is None:
                continue

            visual = geometry.visual
            if not hasattr(visual, 'material') or visual.material is None:
                continue

            material = visual.material

            # 处理material中的各种纹理贴图
            texture_attrs = [
                ('baseColorTexture', 'baseColor'),
                ('emissiveTexture', 'emissive'),
                ('normalTexture', 'normal'),
                ('metallicRoughnessTexture', 'metallicRoughness'),
                ('occlusionTexture', 'occlusion'),
            ]

            for attr_name, label in texture_attrs:
                texture_image = getattr(material, attr_name, None)
                if texture_image is None:
                    continue

                try:
                    # 获取PIL Image
                    if isinstance(texture_image, Image.Image):
                        img = texture_image
                    elif hasattr(texture_image, 'image') and isinstance(texture_image.image, Image.Image):
                        img = texture_image.image
                    else:
                        continue

                    original_w, original_h = img.size
                    detail = {
                        "mesh": name,
                        "texture_type": label,
                        "original_resolution": f"{original_w}x{original_h}",
                    }

                    # 计算缩放比例
                    max_dim = max(original_w, original_h)
                    if max_dim > max_resolution:
                        scale = max_resolution / max_dim
                        new_w = int(original_w * scale)
                        new_h = int(original_h * scale)
                        img = img.resize((new_w, new_h), Image.LANCZOS)
                        detail["new_resolution"] = f"{new_w}x{new_h}"
                    else:
                        detail["new_resolution"] = f"{original_w}x{original_h}"
                        detail["skipped"] = True

                    # 转换为WebP格式（在内存中）
                    buffer = io.BytesIO()
                    # 对于法线贴图等特殊纹理，保留PNG格式以避免精度损失
                    if label in ("normal", "metallicRoughness", "occlusion"):
                        img.save(buffer, format="PNG", optimize=True)
                        detail["format"] = "PNG"
                    else:
                        if img.mode == "RGBA":
                            img.save(buffer, format="WEBP", quality=quality, lossless=False)
                        else:
                            img = img.convert("RGB")
                            img.save(buffer, format="WEBP", quality=quality, lossless=False)
                        detail["format"] = "WebP"

                    buffer.seek(0)
                    compressed_img = Image.open(buffer)

                    # 更新material中的纹理
                    try:
                        setattr(material, attr_name, compressed_img)
                    except Exception:
                        # 如果直接设置失败，尝试通过其他方式更新
                        if attr_name == 'baseColorTexture' and hasattr(material, 'baseColorTexture'):
                            material.baseColorTexture = compressed_img

                    detail["compressed"] = True
                    textures_processed += 1
                    texture_details.append(detail)

                except Exception as e:
                    logger.warning(f"[TextureCompressor] Failed to compress texture {label} for mesh {name}: {e}")
                    texture_details.append({
                        "mesh": name,
                        "texture_type": label,
                        "error": str(e),
                    })

            # 处理material.image（旧格式兼容）
            if hasattr(material, 'image') and material.image is not None:
                try:
                    img = material.image
                    if isinstance(img, Image.Image):
                        original_w, original_h = img.size
                        max_dim = max(original_w, original_h)
                        detail = {
                            "mesh": name,
                            "texture_type": "diffuse",
                            "original_resolution": f"{original_w}x{original_h}",
                        }

                        if max_dim > max_resolution:
                            scale = max_resolution / max_dim
                            new_w = int(original_w * scale)
                            new_h = int(original_h * scale)
                            img = img.resize((new_w, new_h), Image.LANCZOS)
                            detail["new_resolution"] = f"{new_w}x{new_h}"
                        else:
                            detail["new_resolution"] = f"{original_w}x{original_h}"

                        buffer = io.BytesIO()
                        if img.mode == "RGBA":
                            img.save(buffer, format="WEBP", quality=quality, lossless=False)
                        else:
                            img = img.convert("RGB")
                            img.save(buffer, format="WEBP", quality=quality, lossless=False)
                        buffer.seek(0)
                        material.image = Image.open(buffer)

                        detail["format"] = "WebP"
                        detail["compressed"] = True
                        textures_processed += 1
                        texture_details.append(detail)
                except Exception as e:
                    logger.warning(f"[TextureCompressor] Failed to compress diffuse texture for mesh {name}: {e}")

        # 导出压缩后的GLB
        scene.export(output_path, file_type="glb")
        compressed_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

        compression_ratio = compressed_size / original_size if original_size > 0 else 0.0

        logger.info(
            f"[TextureCompressor] Compressed: {input_path} -> {output_path} | "
            f"{original_size} -> {compressed_size} bytes ({compression_ratio:.1%}) | "
            f"textures={textures_processed}"
        )

        return CompressionResult(
            input_path=input_path,
            output_path=output_path,
            original_size=original_size,
            compressed_size=compressed_size,
            compression_ratio=compression_ratio,
            textures_processed=textures_processed,
            texture_details=texture_details,
            success=True,
        )
