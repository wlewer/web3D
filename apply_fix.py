#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动修复脚本 - 应用PLY颜色和相机配置修复
"""

import re
import os

def fix_ply_color_debug(file_path):
    """修复1：添加PLY颜色调试"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找到"📊 PLY几何体信息"日志后面的位置
    pattern = r"(console\.log\('📊 PLY几何体信息:', \{[^}]+\}\);)"
    
    replacement = r"""\1
      
      // ★ 新增：调试颜色属性详情
      if (hasColors) {
        const colorAttr = geometry.attributes.color;
        console.log('🎨 PLY颜色属性详情:', {
          颜色类型: colorAttr.constructor.name,
          颜色数量: colorAttr.count,
          颜色维度: colorAttr.itemSize,
          第一个颜色: [
            colorAttr.getX(0).toFixed(3),
            colorAttr.getY(0).toFixed(3),
            colorAttr.getZ(0).toFixed(3)
          ]
        });
      }"""
    
    content = re.sub(pattern, replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ 修复1：PLY颜色调试已添加")

def fix_camera_config_debug(file_path):
    """修复2：添加相机配置调试"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # 找到useEffect的开始行（第1550行左右）
    useEffect_start = None
    for i, line in enumerate(lines):
        if 'useEffect(() =>' in line and i > 1540:
            useEffect_start = i
            break
    
    if useEffect_start is None:
        print("❌ 未找到useEffect")
        return
    
    # 替换整个useEffect块
    new_useEffect = """  useEffect(() => {
    console.log('📷 [相机配置] customCameraConfig:', customCameraConfig, 'modelLoaded:', modelLoaded);
    
    if (!customCameraConfig || !modelLoaded) {
      console.log('️ [相机配置] 跳过：配置或模型未就绪');
      return;
    }
    
    // 检查配置是否真的变化了（避免重复应用）
    const configStr = JSON.stringify(customCameraConfig);
    const prevStr = prevConfigRef.current ? JSON.stringify(prevConfigRef.current) : null;
    const isConfigChanged = !prevConfigRef.current || prevStr !== configStr;
    
    console.log('🔍 [相机配置] 配置变化检测:', {
      isConfigChanged,
      当前配置: configStr.substring(0, 80),
      之前配置: prevStr ? prevStr.substring(0, 80) : 'null'
    });
    
    if (!isConfigChanged) {
      console.log('⚠️ [相机配置] 配置未变化，跳过应用');
      return;
    }
    
    console.log('📥 [相机配置] 检测到自定义相机配置，开始平滑过渡...');
"""
    
    # 找到useEffect的结束位置（下一个useEffect或return语句）
    useEffect_end = useEffect_start + 1
    brace_count = 0
    found_open = False
    
    for i in range(useEffect_start, min(useEffect_start + 30, len(lines))):
        if '{' in lines[i]:
            brace_count += lines[i].count('{')
            found_open = True
        if '}' in lines[i]:
            brace_count -= lines[i].count('}')
        
        if found_open and brace_count == 0:
            useEffect_end = i + 1
            break
    
    # 替换
    lines[useEffect_start:useEffect_end] = [new_useEffect]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✅ 修复2：相机配置调试已添加")

def fix_homepage_config_pass(file_path):
    """修复3：HomePage传递配置时添加调试"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 替换GLB的customCameraConfig传递
    pattern1 = r"customCameraConfig=\{cameraConfigs\[currentModel\.id\] \|\| null\}  // ★ 应用保存的相机配置"
    replacement1 = """customCameraConfig={(() => {
                const config = cameraConfigs[currentModel.id] || null;
                console.log('📤 [传递相机配置-GLB] modelId:', currentModel.id, 'config:', config);
                return config;
              })()}  // ★ 应用保存的相机配置"""
    
    content = re.sub(pattern1, replacement1, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ 修复3：HomePage配置传递调试已添加")

if __name__ == '__main__':
    base_path = r'D:\HBuilderProjects\web3D\src\web-frontend'
    
    # 修复UniversalGaussianCardV2.tsx
    card_file = os.path.join(base_path, 'src', 'components', '3d', 'UniversalGaussianCardV2.tsx')
    if os.path.exists(card_file):
        fix_ply_color_debug(card_file)
        fix_camera_config_debug(card_file)
    else:
        print(f"❌ 文件不存在: {card_file}")
    
    # 修复HomePage.tsx
    home_file = os.path.join(base_path, 'src', 'pages', 'Home', 'HomePage.tsx')
    if os.path.exists(home_file):
        fix_homepage_config_pass(home_file)
    else:
        print(f"❌ 文件不存在: {home_file}")
    
    print("\n✅ 所有修复已完成！请刷新浏览器测试。")
