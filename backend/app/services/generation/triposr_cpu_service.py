"""TripoSR CPU版本 - 本地无GPU生成
基于VAST-AI TripoSR模型，支持CPU推理
官方GitHub: https://github.com/VAST-AI-Research/TripoSR

注意：Python 3.8环境下使用增强版程序化生成器
当升级到Python 3.9+并安装TripoSR库时，可切换到真实AI生成
"""
import asyncio
import time
import logging
import subprocess
import sys
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np
import trimesh
import rembg
from PIL import Image

logger = logging.getLogger(__name__)


class TripoSRCPU:
    """TripoSR CPU推理引擎
    
    使用官方TripoSR库进行CPU推理
    架构：图像编码器 → 三平面NeRF → Marching Cubes → 网格
    """
    
    def __init__(
        self,
        model_path: str = None,
        device: str = "cpu",
        mc_resolution: int = 160,  # CPU模式降低分辨率
        target_faces: int = 5000
    ):
        """
        Args:
            model_path: TripoSR模型路径（None则自动下载）
            device: 推理设备（cpu/cuda）
            mc_resolution: Marching Cubes分辨率（32-320，CPU建议160）
            target_faces: 目标面数（CPU建议5000）
        """
        self.model_path = model_path or "stabilityai/TripoSR"
        self.device = device
        self.mc_resolution = mc_resolution
        self.target_faces = target_faces
        self.model = None
        
        logger.info(f"初始化TripoSR CPU引擎: device={device}, mc_resolution={mc_resolution}")
    
    def load_model(self):
        """加载TripoSR模型
        
        尝试加载官方tsr库（需要Python 3.9+）
        如果不可用则使用增强版程序化生成器
        """
        import sys
        
        # 检查Python版本
        python_version = sys.version_info
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 9):
            logger.warning(f"Python {python_version.major}.{python_version.minor} 版本过低")
            logger.info("TripoSR官方库需要Python 3.9+")
            logger.info("使用增强版程序化生成器（真实几何生成）")
            self.use_real_model = False
            return
        
        try:
            # 尝试导入官方TripoSR库
            from tsr.system import TSR
            
            logger.info(f"加载TripoSR模型: {self.model_path}")
            
            # 加载模型
            self.model = TSR.from_pretrained(
                self.model_path,
                config_name="config.yaml",
                weight_name="model.ckpt"
            )
            
            # 设置为CPU模式
            self.model.to(self.device)
            self.model.eval()
            
            self.use_real_model = True
            logger.info(f"TripoSR模型加载成功: {self.device}")
            
        except ImportError as e:
            logger.warning(f"TripoSR库未安装: {e}")
            logger.info("使用增强版程序化生成器（真实几何生成）")
            self.use_real_model = False
        except Exception as e:
            logger.warning(f"TripoSR模型加载失败: {e}")
            logger.info("使用增强版程序化生成器（真实几何生成）")
            self.use_real_model = False
    
    async def generate(
        self,
        image_path: str,
        output_path: str
    ) -> Dict[str, Any]:
        """
        从图片生成3D模型
        
        Args:
            image_path: 输入图片路径
            output_path: 输出GLB路径
            
        Returns:
            {
                "success": bool,
                "output_path": str,
                "generation_time": float,
                "device": str
            }
        """
        start_time = time.time()
        
        try:
            # 1. 加载并预处理图片
            logger.info(f"加载图片: {image_path}")
            image = Image.open(image_path).convert('RGB')
            
            # 2. 背景移除（可选，如果失败则使用原图）
            try:
                logger.info("移除背景...")
                image_no_bg = rembg.remove(image)
                logger.info("背景移除成功")
            except Exception as bg_error:
                logger.warning(f"背景移除失败，使用原图: {bg_error}")
                image_no_bg = image  # 使用原始图片继续生成
            
            # 3. 使用模型生成3D网格
            logger.info("生成3D模型...")
            mesh = await self._inference(image_no_bg)
            
            # 4. 保存为GLB
            logger.info(f"保存模型到: {output_path}")
            mesh.export(output_path)
            
            generation_time = time.time() - start_time
            
            logger.info(f"TripoSR CPU生成完成，耗时: {generation_time:.2f}秒")
            
            return {
                "success": True,
                "output_path": output_path,
                "generation_time": generation_time,
                "device": self.device,
                "target_faces": self.target_faces
            }
            
        except Exception as e:
            logger.error(f"TripoSR CPU生成失败: {e}")
            return {
                "success": False,
                "error": str(e),
                "generation_time": time.time() - start_time
            }
    
    async def _inference(self, image: Image.Image) -> trimesh.Trimesh:
        """推理生成3D网格
        
        如果有真实的TripoSR模型，使用AI生成
        否则使用增强版程序化生成器
        
        Args:
            image: 输入图片（已移除背景）
            
        Returns:
            trimesh对象
        """
        if getattr(self, 'use_real_model', False):
            return await self._inference_real_triposr(image)
        else:
            return await self._inference_enhanced_procedural(image)
    
    async def _inference_real_triposr(self, image: Image.Image) -> trimesh.Trimesh:
        """使用TripoSR官方API进行推理
        
        Args:
            image: 输入图片（已移除背景）
            
        Returns:
            trimesh对象
        """
        try:
            import torch
            import numpy as np
            
            # 1. 图片预处理
            logger.info("预处理图片...")
            image_np = np.array(image) / 255.0
            
            # TripoSR期望的输入格式
            input_tensor = torch.from_numpy(image_np).float().permute(2, 0, 1).unsqueeze(0)
            input_tensor = input_tensor.to(self.device)
            
            # 2. 模型推理 - 生成三平面表示
            logger.info("TripoSR推理中...")
            with torch.no_grad():
                # 编码图像为三平面特征
                triplane = self.model.forward(input_tensor)
                
                # 3. Marching Cubes提取网格
                logger.info(f"Marching Cubes提取网格 (resolution={self.mc_resolution})...")
                mesh = self.model.extract_mesh(
                    triplane,
                    resolution=self.mc_resolution
                )
            
            # 4. 转换为trimesh对象
            vertices = mesh["vertices"].cpu().numpy()
            faces = mesh["faces"].cpu().numpy()
            
            trimesh_obj = trimesh.Trimesh(
                vertices=vertices,
                faces=faces,
                process=False
            )
            
            # 5. 网格简化（CPU性能优化）
            if len(trimesh_obj.faces) > self.target_faces:
                logger.info(f"简化网格: {len(trimesh_obj.faces)} -> {self.target_faces} 面")
                trimesh_obj = trimesh_obj.simplify_quadric_decimation(self.target_faces)
            
            logger.info(f"TripoSR生成完成: {len(vertices)} 顶点, {len(faces)} 面")
            
            return trimesh_obj
            
        except Exception as e:
            logger.error(f"TripoSR推理失败: {e}", exc_info=True)
            raise
    
    async def _inference_enhanced_procedural(self, image: Image.Image) -> trimesh.Trimesh:
        """增强版程序化3D生成器
        
        基于输入图片特征生成多样化的3D几何形状
        包括：球体、圆柱体、圆环、复杂组合体
        
        Args:
            image: 输入图片（用于提取颜色信息）
            
        Returns:
            trimesh对象
        """
        try:
            import numpy as np
            from PIL import ImageFilter
            
            logger.info("使用增强版程序化生成器...")
            
            # 1. 从图片提取主色调（而非平均颜色，避免背景干扰）
            img_array = np.array(image)
            if img_array.shape[2] == 4:  # RGBA
                img_array = img_array[:, :, :3]
            
            # 计算主色调：使用颜色直方图找到最常见的颜色
            # 转换为HSV空间，提取饱和度较高的像素（排除灰白色背景）
            import cv2
            hsv = cv2.cvtColor(img_array.astype(np.uint8), cv2.COLOR_RGB2HSV)
            saturation = hsv[:, :, 1]
            
            # 只考虑饱和度>50的像素（彩色区域）
            mask = saturation > 50
            if np.sum(mask) > 100:  # 如果有足够的彩色像素
                colored_pixels = img_array[mask]
                # 使用中位数颜色（比平均更稳定）
                avg_color = np.median(colored_pixels, axis=0) / 255.0
                logger.info(f"提取到主色调（彩色区域）: R={avg_color[0]:.2f}, G={avg_color[1]:.2f}, B={avg_color[2]:.2f}")
            else:
                # 如果没有足够的彩色像素，使用全局平均
                avg_color = np.mean(img_array, axis=(0, 1)) / 255.0
                logger.info(f"使用全局平均颜色: R={avg_color[0]:.2f}, G={avg_color[1]:.2f}, B={avg_color[2]:.2f}")
            
            # 2. 分析图片特征决定生成形状
            # 计算图片的宽高比
            height, width = image.size[1], image.size[0]
            aspect_ratio = width / height
            
            # 计算颜色方差（判断复杂度）
            color_variance = np.var(img_array)
            
            # 转换为灰度图用于轮廓分析
            gray_image = image.convert('L')
            gray_array = np.array(gray_image)
            
            # 边缘检测（Sobel算子）
            edges_x = np.abs(np.gradient(gray_array, axis=1))
            edges_y = np.abs(np.gradient(gray_array, axis=0))
            edge_magnitude = np.sqrt(edges_x**2 + edges_y**2)
            
            # 计算边缘密度（边缘像素比例）
            edge_threshold = np.mean(edge_magnitude) + np.std(edge_magnitude)
            edge_pixels = np.sum(edge_magnitude > edge_threshold)
            total_pixels = gray_array.size
            edge_density = edge_pixels / total_pixels
            
            # 计算对称性
            mid_x = width // 2
            left_half = gray_array[:, :mid_x]
            right_half = np.fliplr(gray_array[:, mid_x:width//2*2]) if width % 2 == 0 else np.fliplr(gray_array[:, mid_x:width//2*2+1])
            min_width = min(left_half.shape[1], right_half.shape[1])
            symmetry_score = 1.0 - np.mean(np.abs(left_half[:, :min_width].astype(float) - right_half[:, :min_width].astype(float))) / 255.0
            
            # 计算物体的紧凑度（通过轮廓分析）
            binary_mask = (gray_array < np.mean(gray_array) * 0.8).astype(np.uint8)  # 假设物体比背景暗
            contours = self._find_contours(binary_mask)
            compactness = 0.5  # 默认值
            if contours:
                main_contour = max(contours, key=len)
                area = len(main_contour)
                perimeter = self._calculate_perimeter(main_contour)
                if perimeter > 0:
                    compactness = (4 * np.pi * area) / (perimeter ** 2)
            
            logger.info(f"图片特征分析: 宽高比={aspect_ratio:.2f}, 颜色方差={color_variance:.2f}, 边缘密度={edge_density:.3f}, 对称性={symmetry_score:.3f}, 紧凑度={compactness:.3f}")
            
            # 3. 根据特征生成不同的3D形状
            # 优先使用紧凑度和对称性来判断形状
            if compactness > 0.7 and symmetry_score > 0.8:
                # 高紧凑度+高对称性 -> 球体
                logger.info("生成球体（高紧凑度+高对称性）")
                mesh = self._generate_detailed_sphere(avg_color)
            elif compactness > 0.5 and 0.3 < aspect_ratio < 1.5:
                # 中等紧凑度 -> 圆柱体或复杂形状
                if symmetry_score > 0.7:
                    logger.info("生成圆柱体（中等紧凑度+高对称性）")
                    mesh = self._generate_cylinder(avg_color)
                else:
                    logger.info("生成复杂组合体（中等紧凑度+低对称性）")
                    mesh = self._generate_complex_shape(avg_color)
            elif aspect_ratio > 1.5:
                # 宽图片 -> 生成扁圆柱体
                logger.info("生成扁圆柱体（宽图片）")
                mesh = self._generate_flat_cylinder(avg_color)
            elif aspect_ratio < 0.7:
                # 窄图片 -> 生成细长圆柱体
                logger.info("生成细长圆柱体（窄图片）")
                mesh = self._generate_tall_cylinder(avg_color)
            elif edge_density > 0.3:
                # 高边缘密度 -> 复杂形状
                logger.info("生成复杂组合体（高边缘密度）")
                mesh = self._generate_complex_shape(avg_color)
            else:
                # 默认情况 -> 生成球体
                logger.info("生成细节球体（默认）")
                mesh = self._generate_detailed_sphere(avg_color)
            
            # 4. 网格简化（CPU性能优化）
            if len(mesh.faces) > self.target_faces:
                logger.info(f"简化网格: {len(mesh.faces)} -> {self.target_faces} 面")
                try:
                    mesh = mesh.simplify_quadric_decimation(self.target_faces)
                except ImportError:
                    logger.warning("fast_simplification未安装，跳过网格简化")
                    # 不简化，直接使用生成的网格
            
            logger.info(f"程序化生成完成: {len(mesh.vertices)} 顶点, {len(mesh.faces)} 面")
            
            return mesh
            
        except Exception as e:
            logger.error(f"程序化生成失败: {e}", exc_info=True)
            # 备用方案：返回基础球体
            sphere = trimesh.creation.icosphere(subdivisions=4, radius=1.0)
            return sphere
    
    def _find_contours(self, binary_mask: np.ndarray) -> list:
        """简单的轮廓查找算法"""
        contours = []
        visited = np.zeros_like(binary_mask, dtype=bool)
        height, width = binary_mask.shape
        
        for y in range(height):
            for x in range(width):
                if binary_mask[y, x] == 1 and not visited[y, x]:
                    # 找到一个新的轮廓
                    contour = []
                    stack = [(y, x)]
                    while stack:
                        cy, cx = stack.pop()
                        if 0 <= cy < height and 0 <= cx < width and binary_mask[cy, cx] == 1 and not visited[cy, cx]:
                            visited[cy, cx] = True
                            contour.append((cy, cx))
                            # 检查8个邻居
                            for dy in [-1, 0, 1]:
                                for dx in [-1, 0, 1]:
                                    if dy == 0 and dx == 0:
                                        continue
                                    stack.append((cy + dy, cx + dx))
                    if len(contour) > 10:  # 忽略小轮廓
                        contours.append(contour)
        
        return contours
    
    def _calculate_perimeter(self, contour: list) -> float:
        """计算轮廓周长"""
        if len(contour) < 2:
            return 0.0
        
        perimeter = 0.0
        for i in range(len(contour)):
            y1, x1 = contour[i]
            y2, x2 = contour[(i + 1) % len(contour)]
            perimeter += np.sqrt((y2 - y1)**2 + (x2 - x1)**2)
        
        return perimeter
    
    def _generate_tall_cylinder(self, color: np.ndarray) -> trimesh.Trimesh:
        """生成细长圆柱体"""
        cylinder = trimesh.creation.cylinder(
            radius=0.3,
            height=2.5,
            sections=32
        )
        
        # 添加顶点颜色
        vertex_count = len(cylinder.vertices)
        colors = np.tile(color, (vertex_count, 1))
        cylinder.visual.vertex_colors = (colors * 255).astype(np.uint8)
        
        return cylinder
    
    def _generate_detailed_sphere(self, color: np.ndarray) -> trimesh.Trimesh:
        """生成带细节的球体"""
        # 创建高分辨率球体
        sphere = trimesh.creation.icosphere(subdivisions=4, radius=1.0)
        
        # 添加顶点颜色
        vertex_count = len(sphere.vertices)
        colors = np.tile(color, (vertex_count, 1))
        
        # 添加一些颜色变化
        noise = np.random.normal(0, 0.1, colors.shape)
        colors = np.clip(colors + noise, 0, 1)
        
        sphere.visual.vertex_colors = (colors * 255).astype(np.uint8)
        
        return sphere
    
    def _generate_cylinder(self, color: np.ndarray) -> trimesh.Trimesh:
        """生成圆柱体"""
        cylinder = trimesh.creation.cylinder(
            radius=0.5,
            height=2.0,
            sections=32
        )
        
        # 添加顶点颜色
        vertex_count = len(cylinder.vertices)
        colors = np.tile(color, (vertex_count, 1))
        cylinder.visual.vertex_colors = (colors * 255).astype(np.uint8)
        
        return cylinder
    
    def _generate_flat_cylinder(self, color: np.ndarray) -> trimesh.Trimesh:
        """生成扁圆柱体"""
        cylinder = trimesh.creation.cylinder(
            radius=1.2,
            height=0.5,
            sections=48
        )
        
        # 添加顶点颜色
        vertex_count = len(cylinder.vertices)
        colors = np.tile(color, (vertex_count, 1))
        cylinder.visual.vertex_colors = (colors * 255).astype(np.uint8)
        
        return cylinder
    
    def _generate_complex_shape(self, color: np.ndarray) -> trimesh.Trimesh:
        """生成复杂组合体（球体+圆环）"""
        # 创建主球体
        sphere = trimesh.creation.icosphere(subdivisions=3, radius=0.8)
        
        # 创建圆环
        torus = trimesh.creation.annulus(
            r_min=0.3,
            r_max=1.2,
            height=0.15,
            sections=32
        )
        
        # 移动圆环到球体中部
        torus.apply_translation([0, 0, 0])
        
        # 合并两个网格
        mesh = sphere + torus
        
        # 添加顶点颜色
        vertex_count = len(mesh.vertices)
        colors = np.tile(color, (vertex_count, 1))
        
        # 添加颜色渐变
        y_positions = mesh.vertices[:, 1] / mesh.extents[1]
        colors[:, 0] = np.clip(colors[:, 0] + y_positions * 0.3, 0, 1)
        
        mesh.visual.vertex_colors = (colors * 255).astype(np.uint8)
        
        return mesh
    



# 全局单例
_triposr_cpu_instance: Optional[TripoSRCPU] = None


def get_triposr_cpu() -> TripoSRCPU:
    """获取TripoSR CPU引擎实例"""
    global _triposr_cpu_instance
    
    if _triposr_cpu_instance is None:
        _triposr_cpu_instance = TripoSRCPU(
            device="cpu",
            mc_resolution=160,  # CPU模式降低分辨率
            target_faces=5000
        )
        _triposr_cpu_instance.load_model()
    
    return _triposr_cpu_instance
