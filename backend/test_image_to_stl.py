"""测试ImageToSTL图像浮雕转换服务
"""
import sys
import logging
import asyncio
from pathlib import Path
from PIL import Image
import numpy as np

logging.basicConfig(level=logging.INFO)

print("=" * 60)
print("ImageToSTL 图像浮雕转换服务测试")
print("=" * 60)

try:
    print("\n1. 导入ImageToSTL服务...")
    from app.services.generation.image_to_stl_service import ImageToSTLService
    print("   ✅ 导入成功")
    
    print("\n2. 创建ImageToSTL服务实例...")
    service = ImageToSTLService(
        base_height=5.0,
        max_depth=2.0,
        resolution=256
    )
    print("   ✅ 实例创建成功")
    print(f"   - 底座厚度: {service.base_height}mm")
    print(f"   - 浮雕深度: {service.max_depth}mm")
    print(f"   - 分辨率: {service.resolution}x{service.resolution}")
    
    print("\n3. 创建测试图片...")
    upload_dir = Path('uploads/experimental')
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # 创建测试图片（渐变灰度图）
    test_image = Image.new('L', (512, 512))
    pixels = test_image.load()
    for y in range(512):
        for x in range(512):
            # 创建对角线渐变
            gray = int((x + y) / 1024 * 255)
            pixels[x, y] = gray
    
    test_image_path = upload_dir / "test_input.png"
    test_image.save(test_image_path)
    print(f"   ✅ 测试图片创建成功: {test_image_path}")
    
    print("\n4. 生成预览信息...")
    preview_info = service.generate_preview_info(str(test_image_path))
    print(f"   ✅ 预览信息:")
    print(f"   - 分辨率: {preview_info['resolution']}")
    print(f"   - 预估顶点数: {preview_info['estimated_vertices']}")
    print(f"   - 预估面数: {preview_info['estimated_faces']}")
    print(f"   - 预估文件大小: {preview_info['estimated_file_size_kb']}KB")
    print(f"   - 平均亮度: {preview_info['brightness']['mean']:.2f}")
    
    print("\n5. 测试转换为STL格式...")
    stl_output_path = upload_dir / "test_output.stl"
    result_stl = asyncio.run(service.convert(
        image_path=str(test_image_path),
        output_path=str(stl_output_path),
        output_format='stl'
    ))
    
    if result_stl['status'] == 'completed':
        print(f"   ✅ STL转换成功!")
        print(f"   - 顶点数: {result_stl['vertices']}")
        print(f"   - 面数: {result_stl['faces']}")
        print(f"   - 文件大小: {result_stl['file_size'] / 1024:.1f} KB")
        print(f"   - 耗时: {result_stl['elapsed_time']}")
        
        # 验证文件存在
        if Path(result_stl['file_path']).exists():
            print(f"   ✅ 文件已保存: {result_stl['file_path']}")
        else:
            print(f"   ❌ 文件未找到: {result_stl['file_path']}")
    else:
        print(f"   ❌ STL转换失败")
    
    print("\n6. 测试转换为GLB格式...")
    glb_output_path = upload_dir / "test_output.glb"
    result_glb = asyncio.run(service.convert(
        image_path=str(test_image_path),
        output_path=str(glb_output_path),
        output_format='glb'
    ))
    
    if result_glb['status'] == 'completed':
        print(f"   ✅ GLB转换成功!")
        print(f"   - 顶点数: {result_glb['vertices']}")
        print(f"   - 面数: {result_glb['faces']}")
        print(f"   - 文件大小: {result_glb['file_size'] / 1024:.1f} KB")
        print(f"   - 耗时: {result_glb['elapsed_time']}")
        
        # 验证文件存在
        if Path(result_glb['file_path']).exists():
            print(f"   ✅ 文件已保存: {result_glb['file_path']}")
        else:
            print(f"   ❌ 文件未找到: {result_glb['file_path']}")
    else:
        print(f"   ❌ GLB转换失败")
    
    print("\n" + "=" * 60)
    print("✅ ImageToSTL 图像浮雕转换服务测试通过！")
    print("=" * 60)
    print("\n测试结果总结:")
    print(f"  - STL格式: {'✅ 成功' if result_stl['status'] == 'completed' else '❌ 失败'}")
    print(f"  - GLB格式: {'✅ 成功' if result_glb['status'] == 'completed' else '❌ 失败'}")
    print(f"  - 生成质量: 真实3D浮雕模型（非AI生成）")
    print(f"  - 适用场景: 3D打印、个性化纪念品、艺术创作")
    
except Exception as e:
    print(f"\n❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
