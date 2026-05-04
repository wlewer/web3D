#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复相机配置第一次加载动画问题
"""

from pathlib import Path

file_path = Path(r'D:\HBuilderProjects\web3D\src\web-frontend\src\components\3d\UniversalGaussianCardV2.tsx')
lines = file_path.read_text(encoding='utf-8').split('\n')

print(f"总行数: {len(lines)}")

# 找到useEffect开始的行
start_line = None
for i, line in enumerate(lines):
    if '// ★ 新增：监听自定义相机配置变化' in line:
        start_line = i
        print(f"找到开始行: {i+1}")
        break

if start_line is None:
    print("❌ 未找到useEffect开始行")
    exit(1)

# 找到useEffect结束的行（依赖数组）
end_line = None
for i in range(start_line, len(lines)):
    if '}, [customCameraConfig, modelLoaded]);' in lines[i]:
        end_line = i
        print(f"找到结束行: {i+1}")
        break

if end_line is None:
    print("❌ 未找到useEffect结束行")
    exit(1)

print(f"\n将替换第 {start_line+1} 到 {end_line+1} 行")

# 新的代码
new_code_lines = """  // ★ 新增：监听自定义相机配置变化，自动应用（带平滑过渡动画）
  const prevConfigRef = useRef<CameraConfig | null>(null);
  
  // ★ 提取相机配置应用逻辑为独立函数，避免时序问题
  const applyCameraConfig = useCallback((config: CameraConfig) => {
    console.log(' [相机配置] 开始执行平滑过渡动画');
    
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
    
    console.log(` [相机配置] 开始相机过渡动画：`, {
      起点: `[$`{startPosition.x.toFixed(2)}, $`{startPosition.y.toFixed(2)}, $`{startPosition.z.toFixed(2)}]`,
      终点: `[$`{targetPosition.x.toFixed(2)}, $`{targetPosition.y.toFixed(2)}, $`{targetPosition.z.toFixed(2)}]`,
      距离: distance.toFixed(2),
      时长: `$`{duration}ms`
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
    
    console.log(' [相机配置] 配置变化检测:', {
      isConfigChanged,
      当前配置: configStr.substring(0, 80),
      之前配置: prevStr ? prevStr.substring(0, 80) : 'null'
    });
    
    if (!isConfigChanged) {
      console.log('️ [相机配置] 配置未变化，跳过应用');
      return;
    }
    
    console.log(' [相机配置] 检测到自定义相机配置，准备平滑过渡...');
    
    // ★ 关键修复：延迟100ms执行，确保customCameraConfig已经完全传递到组件
    // 这样可以解决第一次加载时时序问题
    setTimeout(() => {
      applyCameraConfig(customCameraConfig);
    }, 100);
  }, [modelLoaded, customCameraConfig, applyCameraConfig]);""".split('\n')

# 执行替换
new_lines = lines[:start_line] + new_code_lines + lines[end_line+1:]

# 写回文件
file_path.write_text('\n'.join(new_lines), encoding='utf-8')

print("\n✅ 修复成功！")
print("📝 已将相机配置应用逻辑提取为独立函数")
print(" 已添加100ms延迟执行机制")
print(" 已更新依赖数组")
print("\n请刷新浏览器测试相机配置第一次加载动画效果！")
