"""
测试混元3D完整调用链路
Test complete Hunyuan3D API integration flow
"""
import asyncio
import base64
from pathlib import Path
import logging

# 加载环境变量
from dotenv import load_dotenv
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✓ 已加载环境变量: {env_path}")

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

async def test_hunyuan3d_cloud_service():
    """测试混元3D云服务完整流程"""
    
    logger.info("=" * 80)
    logger.info("开始测试混元3D云服务")
    logger.info("=" * 80)
    
    try:
        # 1. 导入服务
        from app.services.generation.hunyuan3d_cloud_service import get_hunyuan3d_cloud
        
        # 2. 初始化服务（标准版）
        logger.info("\n步骤1: 初始化混元3D服务（标准版）")
        engine = get_hunyuan3d_cloud(version="rapid")
        logger.info(f"✓ 服务初始化成功: version={engine.version}")
        
        # 3. 准备测试图片
        logger.info("\n步骤2: 准备测试图片")
        test_image_path = Path(__file__).parent / "test_image.png"
        
        if not test_image_path.exists():
            logger.warning(f"⚠ 测试图片不存在: {test_image_path}")
            logger.info("创建一个简单的测试图片...")
            
            # 创建一个简单的PNG图片（1x1像素的白色图片）
            import struct
            import zlib
            
            def create_minimal_png():
                """创建最小的PNG图片"""
                # PNG signature
                signature = b'\x89PNG\r\n\x1a\n'
                
                # IHDR chunk (1x1 pixel, 8-bit RGB)
                width = 1
                height = 1
                bit_depth = 8
                color_type = 2  # RGB
                ihdr_data = struct.pack('>IIBBBBB', width, height, bit_depth, color_type, 0, 0, 0)
                ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
                ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
                
                # IDAT chunk (compressed image data)
                # Filter byte (0) + RGB pixel data (white: 255,255,255)
                raw_data = b'\x00\xff\xff\xff'
                compressed_data = zlib.compress(raw_data)
                idat_crc = zlib.crc32(b'IDAT' + compressed_data) & 0xffffffff
                idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)
                
                # IEND chunk
                iend_crc = zlib.crc32(b'IEND') & 0xffffffff
                iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
                
                return signature + ihdr_chunk + idat_chunk + iend_chunk
            
            test_image_path.write_bytes(create_minimal_png())
            logger.info(f"✓ 已创建测试图片: {test_image_path}")
        
        logger.info(f"✓ 测试图片路径: {test_image_path}")
        logger.info(f"✓ 图片大小: {test_image_path.stat().st_size} bytes")
        
        # 4. 生成3D模型
        logger.info("\n步骤3: 调用混元3D API生成模型")
        output_path = Path(__file__).parent / "test_output.glb"
        
        logger.info(f"输入图片: {test_image_path}")
        logger.info(f"输出文件: {output_path}")
        
        result = await engine.generate(
            image_path=str(test_image_path),
            output_path=str(output_path)
        )
        
        # 5. 检查结果
        logger.info("\n步骤4: 检查结果")
        if result['success']:
            logger.info("✅ 生成成功!")
            logger.info(f"  - 输出文件: {result['output_path']}")
            logger.info(f"  - 生成耗时: {result['generation_time']:.2f}秒")
            logger.info(f"  - 文件大小: {result.get('file_size', 0)/1024:.1f} KB")
            logger.info(f"  - 任务ID: {result.get('task_id', 'N/A')}")
        else:
            logger.error("❌ 生成失败!")
            logger.error(f"  - 错误信息: {result.get('error', '未知错误')}")
            logger.error(f"  - 生成耗时: {result.get('generation_time', 0):.2f}秒")
        
        logger.info("\n" + "=" * 80)
        logger.info("测试完成")
        logger.info("=" * 80)
        
        return result
        
    except Exception as e:
        logger.error(f"\n❌ 测试异常: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


if __name__ == "__main__":
    asyncio.run(test_hunyuan3d_cloud_service())
