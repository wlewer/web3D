#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复相机配置第一次加载动画问题
将相机配置应用逻辑提取为独立函数，并添加延迟执行机制
"""

import re
from pathlib import Path

file_path = Path(r'D:\HBuilderProjects\web3D\src\web-frontend\src\components\3d\UniversalGaussianCardV2.tsx')

# 读取文件
content = file_path.read_text(encoding='utf-8')

# 找到useEffect开始的位置
useeffect_pattern = r'(  // ★ 新增：监听自定义相机配置变化，自动应用\(带平滑过渡动画\)\n  const prevConfigRef = useRef<CameraConfig \| null>\(null\);\n  \n  useEffect\(\(\) => \{)'

# 检查是否找到匹配
match = re.search(useeffect_pattern, content)
if not match:
    print("❌ 未找到useEffect代码段")
    exit(1)

print("✅ 找到useEffect代码段")

# 找到useEffect结束的位置 - 匹配到依赖数组
useeffect_end_pattern = r'(  \}, \[customCameraConfig, modelLoaded\]\);)'
end_match = re.search(useeffect_end_pattern, content)
if not end_match:
    print("❌ 未找到useEffect结束位置")
    exit(1)

print("✅ 找到useEffect结束位置")

# 新的代码
new_code = '''  // ★ 新增：监听自定义相机配置变化，自动应用（带平滑过渡动画）
  const prevConfigRef = useRef<CameraConfig | null>(null);
  
  // ★ 提取相机配置应用逻辑为独立函数，避免时序问题
  const applyCameraConfig = useCallback((config: CameraConfig) => {
    console.log('📥 [相机配置] 开始执行平滑过渡动画');
    
    if (!cameraRef.current || !controlsRef.current) {
      console.log('⚠️ [相机配置] 跳过：相机或控制器未初始化');
      return;
    }
    
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    // 目标位置
    const targetPosition = new THREE.Vector3(
      config.position[0],
      config.position[1],
      config.position[2]
    );
    const targetTarget = new THREE.Vector3(
      config.target[0],
      config.target[1],
      config.target[2]
    );
    const targetZoom = config.zoom;
    
    // 起始位置
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startZoom = camera.zoom;
    
    // 计算动画参数
    const distance = startPosition.distanceTo(targetPosition);
    const duration = Math.min(Math.max(distance * 500, 800), 1500);
    
    console.log(`🎬 [相机配置] 开始相机过渡动画：`, {
      起点: `[${startPosition.x.toFixed(2)}, ${startPosition.y.toFixed(2)}, ${startPosition.z.toFixed(2)}]`,
      终点: `[${targetPosition.x.toFixed(2)}, ${targetPosition.y.toFixed(2)}, ${targetPosition.z.toFixed(2)}]`,
      距离: distance.toFixed(2),
      时长: `${duration}ms`
    });
    
    // 使用Tween.js实现平滑过渡
    const tweenData = { t: 0 };
    let currentTween: any = null;
    let animationId: number | null = null;
    
    currentTween = new Tween(tweenData)
      .to({ t: 1 }, duration)
      .easing(Easing.Quadratic.InOut)
      .onUpdate(() => {
        camera.position.lerpVectors(startPosition, targetPosition, tweenData.t);
        controls.target.lerpVectors(startTarget, targetTarget, tweenData.t);
        controls.update();
        camera.zoom = startZoom + (targetZoom - startZoom) * tweenData.t;
        camera.updateProjectionMatrix();
        
        if (rendererRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, camera);
        }
      })
      .onComplete(() => {
        console.log('✅ [相机配置] 自定义相机配置平滑过渡完成:', config);
        prevConfigRef.current = config;
      })
      .start();
    
    const animate = () => {
      if (tweenData.t < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };
    animate();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (currentTween) currentTween.stop();
    };
  }, []);
  
  useEffect(() => {
    console.log(' [相机配置] customCameraConfig:', customCameraConfig, 'modelLoaded:', modelLoaded);
    
    if (!customCameraConfig || !modelLoaded) {
      console.log('⏸️ [相机配置] 跳过：配置或模型未就绪');
      return;
    }
    
    const configStr = JSON.stringify(customCameraConfig);
    const prevStr = prevConfigRef.current ? JSON.stringify(prevConfigRef.current) : null;
    const isConfigChanged = !prevConfigRef.current || prevStr !== configStr;
    
    console.log('🔍 [相机配置] 配置变化检测:', {
      isConfigChanged,
      当前配置: configStr.substring(0, 80),
      之前配置: prevStr ? prevStr.substring(0, 80) : 'null'
    });
    
    if (!isConfigChanged) {
      console.log('️ [相机配置] 配置未变化，跳过应用');
      return;
    }
    
    console.log('📥 [相机配置] 检测到自定义相机配置，准备平滑过渡...');
    
    // ★ 关键修复：延迟100ms执行，确保customCameraConfig已经完全传递到组件
    // 这样可以解决第一次加载时时序问题
    setTimeout(() => {
      applyCameraConfig(customCameraConfig);
    }, 100);
  }, [modelLoaded, customCameraConfig, applyCameraConfig]);'''

# 执行替换
# 找到useEffect开始和结束的位置
start_pos = match.start()
end_pos = end_match.end()

# 替换内容
new_content = content[:start_pos] + new_code + content[end_pos:]

# 写入文件
file_path.write_text(new_content, encoding='utf-8')

print("✅ 修复成功！")
print("📝 已将相机配置应用逻辑提取为独立函数")
print(" 已添加100ms延迟执行机制")
print("📝 已更新依赖数组")
print("\n请刷新浏览器测试相机配置第一次加载动画效果！")
