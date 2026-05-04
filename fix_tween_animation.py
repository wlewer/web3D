#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

file_path = r'D:\HBuilderProjects\web3D\src\web-frontend\src\components\3d\UniversalGaussianCardV2.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """    // 使用Tween.js实现平滑过渡
    const tweenData = { t: 0 };
    
    console.log('🎬 [相机配置] 创建Tween动画对象...');
    
    currentTweenRef.current = new Tween(tweenData)
      .to({ t: 1 }, duration)
      .easing(Easing.Quadratic.InOut)
      .onUpdate(() => {
        console.log('🔄 [相机配置] onUpdate触发, t =', tweenData.t.toFixed(3));
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
        currentTweenRef.current = null;  // ★ 清空引用
      })
      .start();
    
    // ★ 关键修复：手动执行动画循环
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      
      // 更新Tween - 传入累计时间（毫秒），不是增量时间！
      const tween = currentTweenRef.current;
      if (tween) {
        tween.update(elapsed);
      }
      
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      }
    };
    
    // 启动动画循环
    requestAnimationFrame(animate);
    
    console.log('✅ [相机配置] Tween动画已启动, duration =', duration, 'ms');"""

new_block = """    // ★ 关键修复：不使用Tween.js，直接用requestAnimationFrame实现平滑过渡
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数（二次缓入缓出）
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // 更新相机位置
      camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
      controls.target.lerpVectors(startTarget, targetTarget, easeProgress);
      controls.update();
      camera.zoom = startZoom + (targetZoom - startZoom) * easeProgress;
      camera.updateProjectionMatrix();
      
      if (rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
      
      // 继续动画或完成
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        console.log('✅ [相机配置] 自定义相机配置平滑过渡完成:', config);
        prevConfigRef.current = config;
      }
    };
    
    // 启动动画循环
    requestAnimationFrame(animate);
    
    console.log('✅ [相机配置] 动画已启动, duration =', duration, 'ms');"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ 修改成功")
else:
    print(" 未找到匹配的文本块")
    print("请检查文件内容")
