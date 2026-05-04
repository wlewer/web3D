# 修复相机配置第一次加载动画问题
$file = "D:\HBuilderProjects\web3D\src\web-frontend\src\components\3d\UniversalGaussianCardV2.tsx"

# 读取文件内容
$content = Get-Content $file -Raw -Encoding UTF8

# 定义要替换的旧代码
$oldCode = @"
  // ★ 新增：监听自定义相机配置变化，自动应用（带平滑过渡动画）
  const prevConfigRef = useRef<CameraConfig | null>(null);
  
  useEffect(() => {
    console.log(' [相机配置] customCameraConfig:', customCameraConfig, 'modelLoaded:', modelLoaded);
    
    if (!customCameraConfig || !modelLoaded) {
      console.log(' [相机配置] 跳过：配置或模型未就绪');
      return;
    }
    
    // 检查配置是否真的变化了（避免重复应用）
    const configStr = JSON.stringify(customCameraConfig);
    const prevStr = prevConfigRef.current ? JSON.stringify(prevConfigRef.current) : null;
    const isConfigChanged = !prevConfigRef.current || prevStr !== configStr;
    
    console.log(' [相机配置] 配置变化检测:', {
      isConfigChanged,
      当前配置: configStr.substring(0, 80),
      之前配置: prevStr ? prevStr.substring(0, 80) : 'null'
    });
    
    if (!isConfigChanged) {
      console.log(' [相机配置] 配置未变化，跳过应用');
      return;
    }
    
    console.log(' [相机配置] 检测到自定义相机配置，开始平滑过渡...');
    
    // 使用ref中的方法加载配置
    if (cameraRef.current && controlsRef.current) {
      const config = customCameraConfig;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      
      // ★ 关键修复：直接从当前位置过渡到目标位置（不保存起始位置）
      // 这样即使智能居中已经执行了，也能正确过渡到保存的镜头
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
      
      // ★ 获取当前位置作为起始点（可能是智能居中后的位置）
      const startPosition = camera.position.clone();
      const startTarget = controls.target.clone();
      const startZoom = camera.zoom;
      
      // 计算相机移动距离，根据距离动态调整动画时长
      const distance = startPosition.distanceTo(targetPosition);
      const duration = Math.min(Math.max(distance * 500, 800), 1500); // 800ms-1500ms（增加时长让动画更明显）
      
      console.log(` [相机配置] 开始相机过渡动画：`, {
        起点: `[`$`{startPosition.x.toFixed(2)}, `$`{startPosition.y.toFixed(2)}, `$`{startPosition.z.toFixed(2)}]`,
        终点: `[`$`{targetPosition.x.toFixed(2)}, `$`{targetPosition.y.toFixed(2)}, `$`{targetPosition.z.toFixed(2)}]`,
        距离: distance.toFixed(2),
        时长: `$`{duration}ms`
      });
      
      // 使用Tween.js实现平滑过渡
      const tweenData = { t: 0 };
      let currentTween: any = null;
      let animationId: number | null = null;
      
      currentTween = new Tween(tweenData)
        .to({ t: 1 }, duration)
        .easing(Easing.Quadratic.InOut) // 缓入缓出
        .onUpdate(() => {
          // 插值计算相机位置
          camera.position.lerpVectors(startPosition, targetPosition, tweenData.t);
          
          // 插值计算控制器target
          controls.target.lerpVectors(startTarget, targetTarget, tweenData.t);
          controls.update();
          
          // 插值计算缩放
          camera.zoom = startZoom + (targetZoom - startZoom) * tweenData.t;
          camera.updateProjectionMatrix();
          
          // ★ 关键修复：渲染画面
          if (rendererRef.current && sceneRef.current) {
            rendererRef.current.render(sceneRef.current, camera);
          }
        })
        .onComplete(() => {
          console.log(' [相机配置] 自定义相机配置平滑过渡完成:', config);
          // 更新引用
          prevConfigRef.current = config;
        })
        .start();
      
      // 在动画循环中更新Tween
      const animate = () => {
        if (tweenData.t < 1) {
          animationId = requestAnimationFrame(animate);
        }
      };
      animate();
      
      // 清理函数
      return () => {
        if (currentTween) {
          currentTween.stop();
        }
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, [customCameraConfig, modelLoaded]);
"@

# 定义新的代码
$newCode = @"
  // ★ 新增：监听自定义相机配置变化，自动应用（带平滑过渡动画）
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
      起点: `[`$`{startPosition.x.toFixed(2)}, `$`{startPosition.y.toFixed(2)}, `$`{startPosition.z.toFixed(2)}]`,
      终点: `[`$`{targetPosition.x.toFixed(2)}, `$`{targetPosition.y.toFixed(2)}, `$`{targetPosition.z.toFixed(2)}]`,
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
        console.log(' [相机配置] 自定义相机配置平滑过渡完成:', config);
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
      console.log(' [相机配置] 配置未变化，跳过应用');
      return;
    }
    
    console.log(' [相机配置] 检测到自定义相机配置，准备平滑过渡...');
    
    // ★ 关键修复：延迟100ms执行，确保customCameraConfig已经完全传递到组件
    // 这样可以解决第一次加载时时序问题
    setTimeout(() => {
      applyCameraConfig(customCameraConfig);
    }, 100);
  }, [modelLoaded, customCameraConfig, applyCameraConfig]);
"@

# 执行替换
if ($content -match [regex]::Escape($oldCode)) {
    $content = $content -replace [regex]::Escape($oldCode), $newCode
    Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✅ 修复成功！相机配置第一次加载动画问题已解决。"
} else {
    Write-Host "❌ 未找到要替换的代码段。请检查文件内容。"
}
