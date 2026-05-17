"""
Web3D Backend - 缩略图生成服务
Thumbnail Generator: generate multi-angle preview images from 3D models
"""
import os
import math
from typing import List, Tuple, Optional
from loguru import logger


class ThumbnailGenerator:
    """生成模型预览缩略图"""

    # 默认多角度配置
    DEFAULT_ANGLES: List[Tuple[float, float]] = [
        (0, 0),       # 正前方
        (45, 45),     # 右上45度
        (0, 90),      # 正侧面
    ]

    # 输出图片尺寸
    THUMBNAIL_SIZE = (512, 512)

    def generate(
        self,
        input_path: str,
        output_dir: str,
        angles: List[Tuple[float, float]] = None,
    ) -> List[str]:
        """
        生成多角度预览图

        Args:
            input_path: 输入模型文件路径
            output_dir: 输出目录
            angles: 角度列表 [(elevation, azimuth), ...]，
                    elevation: 仰角(度), azimuth: 方位角(度)

        Returns:
            生成的图片路径列表
        """
        if angles is None:
            angles = self.DEFAULT_ANGLES

        os.makedirs(output_dir, exist_ok=True)

        # 检查输入文件
        if not os.path.isfile(input_path):
            logger.error(f"[ThumbnailGenerator] Input file not found: {input_path}")
            return []

        # 检查格式
        ext = os.path.splitext(input_path)[1].lower()
        loadable_formats = {".glb", ".gltf", ".obj", ".stl", ".ply", ".off"}
        if ext not in loadable_formats:
            logger.warning(f"[ThumbnailGenerator] Format {ext} not supported for thumbnail generation, generating placeholders")
            return self._generate_placeholders(input_path, output_dir, angles)

        # 尝试trimesh渲染
        try:
            return self._render_thumbnails(input_path, output_dir, angles)
        except Exception as e:
            logger.warning(f"[ThumbnailGenerator] trimesh rendering failed: {e}, generating placeholders")
            return self._generate_placeholders(input_path, output_dir, angles)

    def _render_thumbnails(
        self,
        input_path: str,
        output_dir: str,
        angles: List[Tuple[float, float]],
    ) -> List[str]:
        """使用trimesh offscreen渲染缩略图"""
        import trimesh
        import numpy as np

        scene = trimesh.load(input_path, force="scene")
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_paths: List[str] = []

        # 计算场景包围球
        bounds = scene.bounds
        center = ((bounds[0] + bounds[1]) / 2).tolist()
        extent = (bounds[1] - bounds[0]).tolist()
        max_extent = max(extent)
        radius = max_extent * 0.7  # 相机距离

        for i, (elevation, azimuth) in enumerate(angles):
            try:
                # 创建场景副本并设置相机
                render_scene = scene.copy()

                # 计算相机位置（球坐标转笛卡尔）
                elev_rad = math.radians(elevation)
                azim_rad = math.radians(azimuth)

                camera_pos = [
                    center[0] + radius * math.cos(elev_rad) * math.cos(azim_rad),
                    center[1] + radius * math.cos(elev_rad) * math.sin(azim_rad),
                    center[2] + radius * math.sin(elev_rad),
                ]

                # 尝试使用pyglet渲染
                angle_label = f"e{elevation}_a{azimuth}".replace(".", "p").replace("-", "n")
                output_path = os.path.join(output_dir, f"{base_name}_thumb_{angle_label}.png")

                # 尝试offscreen渲染
                try:
                    # 设置相机
                    render_scene.camera.resolution = self.THUMBNAIL_SIZE
                    render_scene.camera_transform = trimesh.scene.camera.look_at(
                        points=[center],
                        fov=45,
                        distance=radius,
                        center=center,
                    )

                    # 尝试渲染
                    png = render_scene.save_image(resolution=self.THUMBNAIL_SIZE)
                    if png is not None:
                        with open(output_path, "wb") as f:
                            f.write(png)
                        output_paths.append(output_path)
                        logger.info(f"[ThumbnailGenerator] Rendered: {output_path}")
                        continue
                except Exception as render_err:
                    logger.debug(f"[ThumbnailGenerator] Image save failed, trying PIL fallback: {render_err}")

                # PIL渲染降级
                try:
                    import PIL.Image as PILImage
                    pixels = trimesh.render.rendering.render_scene(
                        render_scene,
                        resolution=self.THUMBNAIL_SIZE,
                    )
                    if pixels is not None:
                        img = PILImage.fromarray(pixels)
                        img.save(output_path)
                        output_paths.append(output_path)
                        logger.info(f"[ThumbnailGenerator] PIL rendered: {output_path}")
                        continue
                except Exception as pil_err:
                    logger.debug(f"[ThumbnailGenerator] PIL rendering also failed: {pil_err}")

                # 所有渲染方式都失败，生成占位图
                placeholder_path = self._generate_single_placeholder(
                    output_dir, base_name, i, elevation, azimuth
                )
                output_paths.append(placeholder_path)

            except Exception as e:
                logger.warning(f"[ThumbnailGenerator] Angle ({elevation}, {azimuth}) failed: {e}")
                placeholder_path = self._generate_single_placeholder(
                    output_dir, base_name, i, elevation, azimuth
                )
                output_paths.append(placeholder_path)

        return output_paths

    def _generate_placeholders(
        self,
        input_path: str,
        output_dir: str,
        angles: List[Tuple[float, float]],
    ) -> List[str]:
        """为所有角度生成占位图"""
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_paths: List[str] = []
        for i, (elevation, azimuth) in enumerate(angles):
            placeholder_path = self._generate_single_placeholder(
                output_dir, base_name, i, elevation, azimuth
            )
            output_paths.append(placeholder_path)
        return output_paths

    def _generate_single_placeholder(
        self,
        output_dir: str,
        base_name: str,
        angle_index: int,
        elevation: float,
        azimuth: float,
    ) -> str:
        """生成单张占位图"""
        try:
            from PIL import Image, ImageDraw, ImageFont

            img = Image.new("RGB", self.THUMBNAIL_SIZE, color=(45, 45, 55))
            draw = ImageDraw.Draw(img)

            # 绘制网格背景
            for x in range(0, self.THUMBNAIL_SIZE[0], 32):
                draw.line([(x, 0), (x, self.THUMBNAIL_SIZE[1])], fill=(55, 55, 65), width=1)
            for y in range(0, self.THUMBNAIL_SIZE[1], 32):
                draw.line([(0, y), (self.THUMBNAIL_SIZE[0], y)], fill=(55, 55, 65), width=1)

            # 绘制3D占位图标
            cx, cy = self.THUMBNAIL_SIZE[0] // 2, self.THUMBNAIL_SIZE[1] // 2
            # 立方体简化图示
            size = 60
            points = [
                (cx - size, cy - size // 2),
                (cx + size, cy - size // 2),
                (cx + size, cy + size // 2),
                (cx - size, cy + size // 2),
            ]
            draw.polygon(points, fill=(80, 80, 100), outline=(120, 120, 150))

            # 绘制角度文字
            angle_text = f"({elevation}°, {azimuth}°)"
            try:
                draw.text((cx - 30, cy + size + 20), angle_text, fill=(160, 160, 180))
                draw.text((cx - 40, cy - size - 30), "3D Preview", fill=(160, 160, 180))
            except Exception:
                pass

            angle_label = f"e{elevation}_a{azimuth}".replace(".", "p").replace("-", "n")
            output_path = os.path.join(output_dir, f"{base_name}_thumb_{angle_label}_placeholder.png")
            img.save(output_path)
            return output_path

        except ImportError:
            # Pillow也不可用，创建空文件作为标记
            angle_label = f"e{elevation}_a{azimuth}".replace(".", "p").replace("-", "n")
            output_path = os.path.join(output_dir, f"{base_name}_thumb_{angle_label}_placeholder.txt")
            with open(output_path, "w") as f:
                f.write(f"Placeholder for angle ({elevation}, {azimuth})")
            return output_path
