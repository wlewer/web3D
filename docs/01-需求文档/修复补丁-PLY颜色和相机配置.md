// ==========================================
// 修复补丁 - 应用到 UniversalGaussianCardV2.tsx
// ==========================================

// ========== 修复1：PLY颜色调试（第1155行后添加） ==========

// 在 console.log('📊 PLY几何体信息:', {...}); 这一行后面添加：

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
      }

// ========== 修复2：相机配置调试（第1550行替换） ==========

// 将第1550-1563行的useEffect替换为：

  useEffect(() => {
    console.log(' [相机配置] customCameraConfig:', customCameraConfig, 'modelLoaded:', modelLoaded);
    
    if (!customCameraConfig || !modelLoaded) {
      console.log('⚠️ [相机配置] 跳过：配置或模型未就绪');
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

// ========== 修复3：检查HomePage传递配置 ==========

// 在 HomePage.tsx 第410行和第430行（GLB和SPZ的customCameraConfig传递处）添加：

customCameraConfig={(() => {
  const config = cameraConfigs[currentModel.id] || null;
  console.log('📤 [传递相机配置] modelId:', currentModel.id, 'config:', config);
  return config;
})()}

// 这样可以确认配置是否正确传递到子组件
