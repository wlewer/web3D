/**
 * Spark 2.0 3D编辑器 - 内嵌式编辑器
 * 基于 @sparkjsdev/spark 引擎实现真正的3D编辑功能
 */

import { useEffect, useRef, useState } from 'react';
import { Button, message, Space, Slider, Switch } from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  RotateRightOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import './SparkEditor.css';

interface SparkEditorProps {
  initialModelUrl?: string;
  onSave?: (data: any) => void;
}

export function SparkEditor({ initialModelUrl, onSave }: SparkEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sparkInstanceRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [pointSize, setPointSize] = useState(2);
  const [showGrid, setShowGrid] = useState(true);

  // 初始化Spark编辑器
  useEffect(() => {
    if (!containerRef.current) return;

    let spark: any = null;

    const initSpark = async () => {
      try {
        setIsLoading(true);
        
        // 动态导入Spark（@sparkjsdev/spark 当前 API 为 SparkRenderer，无 Spark 类）
        // 此处保留为兼容旧版 API 引用
        const Spark = (await import('@sparkjsdev/spark') as any).Spark;

        // 创建Spark实例
        spark = new Spark({
          container: containerRef.current,
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a2e',
          showStats: true,
        });

        sparkInstanceRef.current = spark;

        // 加载初始模型
        if (initialModelUrl) {
          await loadModel(initialModelUrl);
        } else {
          // 加载示例场景
          await loadDemoScene();
        }

        // 设置事件监听
        setupEventListeners(spark);

        setIsLoading(false);
        message.success('3D编辑器初始化成功');
      } catch (error) {
        console.error('Spark初始化失败:', error);
        message.error('3D编辑器初始化失败');
        setIsLoading(false);
      }
    };

    initSpark();

    // 清理函数
    return () => {
      if (spark) {
        spark.destroy();
      }
    };
  }, []);

  // 加载模型
  const loadModel = async (url: string) => {
    try {
      const spark = sparkInstanceRef.current;
      if (!spark) return;

      setIsLoading(true);
      await spark.loadModel(url);
      
      const stats = spark.getSceneStats();
      setTotalPoints(stats.pointCount || 0);
      setIsLoading(false);
      
      message.success(`模型加载成功: ${stats.pointCount || 0} 个点`);
    } catch (error) {
      console.error('模型加载失败:', error);
      message.error('模型加载失败');
      setIsLoading(false);
    }
  };

  // 加载演示场景
  const loadDemoScene = async () => {
    try {
      const spark = sparkInstanceRef.current;
      if (!spark) return;

      // 创建示例点云
      const pointCloud = generateDemoPointCloud();
      await spark.loadPointCloud(pointCloud);
      
      setTotalPoints(pointCloud.length);
      message.success('演示场景加载成功');
    } catch (error) {
      console.error('演示场景加载失败:', error);
    }
  };

  // 生成演示点云数据
  const generateDemoPointCloud = () => {
    const points = [];
    const count = 5000;
    
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 2 + Math.random() * 0.5;
      
      points.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        r: Math.random(),
        g: Math.random(),
        b: Math.random(),
        a: 1,
      });
    }
    
    return points;
  };

  // 设置事件监听
  const setupEventListeners = (spark: any) => {
    // 选择事件
    spark.on('selectionChanged', (count: number) => {
      setSelectedPoints(count);
    });

    // 场景变化事件
    spark.on('sceneChanged', () => {
      const stats = spark.getSceneStats();
      setTotalPoints(stats.pointCount || 0);
    });
  };

  // 撤销操作
  const handleUndo = () => {
    const spark = sparkInstanceRef.current;
    if (spark) {
      spark.undo();
      message.success('已撤销');
    }
  };

  // 重做操作
  const handleRedo = () => {
    const spark = sparkInstanceRef.current;
    if (spark) {
      spark.redo();
      message.success('已重做');
    }
  };

  // 删除选中点
  const handleDelete = () => {
    const spark = sparkInstanceRef.current;
    if (spark && selectedPoints > 0) {
      spark.deleteSelected();
      message.success(`已删除 ${selectedPoints} 个点`);
      setSelectedPoints(0);
    } else {
      message.warning('请先选择要删除的点');
    }
  };

  // 重置视角
  const handleResetView = () => {
    const spark = sparkInstanceRef.current;
    if (spark) {
      spark.resetCamera();
      message.success('视角已重置');
    }
  };

  // 保存场景
  const handleSave = async () => {
    const spark = sparkInstanceRef.current;
    if (!spark) return;

    try {
      setIsLoading(true);
      const sceneData = await spark.exportScene();
      
      if (onSave) {
        onSave(sceneData);
      } else {
        // 默认下载为JSON
        const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scene_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      message.success('场景保存成功');
      setIsLoading(false);
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
      setIsLoading(false);
    }
  };

  // 导出GLB
  const handleExportGLB = async () => {
    const spark = sparkInstanceRef.current;
    if (!spark) return;

    try {
      setIsLoading(true);
      const glbBlob = await spark.exportGLB();
      
      const url = URL.createObjectURL(glbBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model_${Date.now()}.glb`;
      a.click();
      URL.revokeObjectURL(url);
      
      message.success('GLB导出成功');
      setIsLoading(false);
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
      setIsLoading(false);
    }
  };

  // 更新旋转速度
  const handleRotationSpeedChange = (value: number) => {
    setRotationSpeed(value);
    const spark = sparkInstanceRef.current;
    if (spark) {
      spark.setRotationSpeed(value);
    }
  };

  // 切换自动旋转
  const handleAutoRotateChange = (checked: boolean) => {
    setAutoRotate(checked);
    const spark = sparkInstanceRef.current;
    if (spark) {
      spark.setAutoRotate(checked);
    }
  };

  // 更新点大小
  const handlePointSizeChange = (value: number) => {
    setPointSize(value);
    const spark = sparkInstanceRef.current;
    if (spark) {
      spark.setPointSize(value);
    }
  };

  // 切换网格显示
  const handleGridChange = (checked: boolean) => {
    setShowGrid(checked);
    const spark = sparkInstanceRef.current;
    if (spark) {
      spark.showGrid(checked);
    }
  };

  return (
    <div className="spark-editor-container">
      {/* 工具栏 */}
      <div className="editor-toolbar">
        <Space size="small" wrap>
          <Button 
            icon={<UndoOutlined />} 
            onClick={handleUndo}
            title="撤销 (Ctrl+Z)"
          >
            撤销
          </Button>
          <Button 
            icon={<RedoOutlined />} 
            onClick={handleRedo}
            title="重做 (Ctrl+Y)"
          >
            重做
          </Button>
          <Button 
            danger
            icon={<DeleteOutlined />} 
            onClick={handleDelete}
            disabled={selectedPoints === 0}
            title="删除选中 (Delete)"
          >
            删除 ({selectedPoints})
          </Button>
          
          <div className="toolbar-divider" />
          
          <Button 
            icon={<RotateRightOutlined />} 
            onClick={handleResetView}
            title="重置视角 (R)"
          >
            重置视角
          </Button>
          
          <div className="toolbar-divider" />
          
          <Button 
            type="primary"
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={isLoading}
          >
            保存场景
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExportGLB}
            loading={isLoading}
          >
            导出GLB
          </Button>
        </Space>
      </div>

      {/* 3D视图区域 */}
      <div className="editor-viewport" ref={containerRef}>
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        )}
      </div>

      {/* 右侧属性面板 */}
      <div className="editor-properties">
        <div className="property-section">
          <h4>场景信息</h4>
          <div className="property-item">
            <span>总点数:</span>
            <strong>{totalPoints.toLocaleString()}</strong>
          </div>
          <div className="property-item">
            <span>选中点数:</span>
            <strong>{selectedPoints}</strong>
          </div>
        </div>

        <div className="property-section">
          <h4>显示设置</h4>
          <div className="property-item">
            <span>点大小:</span>
            <Slider 
              min={0.5} 
              max={5} 
              step={0.1}
              value={pointSize}
              onChange={handlePointSizeChange}
              style={{ width: 120 }}
            />
          </div>
          <div className="property-item">
            <span>显示网格:</span>
            <Switch checked={showGrid} onChange={handleGridChange} />
          </div>
        </div>

        <div className="property-section">
          <h4>动画控制</h4>
          <div className="property-item">
            <span>自动旋转:</span>
            <Switch checked={autoRotate} onChange={handleAutoRotateChange} />
          </div>
          <div className="property-item">
            <span>旋转速度:</span>
            <Slider 
              min={0} 
              max={5} 
              step={0.1}
              value={rotationSpeed}
              onChange={handleRotationSpeedChange}
              disabled={!autoRotate}
              style={{ width: 120 }}
            />
          </div>
        </div>

        <div className="property-section">
          <h4>快捷键</h4>
          <div className="shortcut-list">
            <div><kbd>Ctrl+Z</kbd> 撤销</div>
            <div><kbd>Ctrl+Y</kbd> 重做</div>
            <div><kbd>Delete</kbd> 删除</div>
            <div><kbd>R</kbd> 重置视角</div>
            <div><kbd>F</kbd> 聚焦选中</div>
            <div><kbd>Space</kbd> 暂停旋转</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SparkEditor;
