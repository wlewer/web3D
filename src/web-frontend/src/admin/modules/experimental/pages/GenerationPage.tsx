/**
 * AI 3D生成实验页面 - 完全复刻 experimental-3d.html 布局
 * 6种生成模式（1x6顶部网格）+ 左侧配置 + 右侧预览
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Alert, Spin, Drawer, Select } from 'antd';
const { Option } = Select;
import {
  CloudUploadOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// 官方示例图片列表 - 65张图片
const ALL_EXAMPLE_IMAGES = [
  '004.png', '052.png', '073.png', '075.png', '1008.png', '101.png', '1022.png', '1029.png', '1037.png', '1079.png',
  '1111.png', '1123.png', '1128.png', '1135.png', '1146.png', '1148.png', '1154.png', '1180.png', '1196.png', '1204.png',
  '1234.png', '1310.png', '1316.png', '1354.png', '1429.png', '1493.png', '1582.png', '1583.png', '1596.png', '1601.png',
  '1603.png', '1626.png', '1627.png', '1654.png', '167.png', '1670.png', '1679.png', '1687.png', '1698.png', '1715.png',
  '1735.png', '1738.png', '1744.png', '1758.png', '1772.png', '1773.png', '1778.png', '179.png', '1898.png', '191.png',
  '195.png', '197.png', '198.png', '202.png', '203.png', '218.png', '219.png', '379.png', '380.png', '419.png',
  '583.png', '888.png', '895.png', 'example_000.png', 'example_002.png'
];

// 6种生成模式配置（完全复刻HTML版本）
interface GenerationMode {
  id: string;
  icon: string;
  label: string;
  desc: string;
  github: string;
  badges: { text: string; class: string }[];
  verified?: boolean; // 是否已通过官方开源技术验证
  endpoint: string;
  mockTime: number;
}

const MODES: GenerationMode[] = [
  {
    id: 'image_to_stl',
    icon: '🎨',
    label: 'ImageToSTL',
    desc: '图片转3D浮雕，真实可用',
    github: 'https://gitcode.com/gh_mirrors/im/ImageToSTL',
    badges: [
      { text: '真实可用', class: 'badge-free' },
      { text: 'CPU', class: 'badge-free' },
    ],
    verified: true, // ✅ 已按官方开源实现：图片亮度→高度图→3D浮雕网格
    endpoint: '/api/v1/experimental/image-to-stl/upload',
    mockTime: 1000,
  },
  {
    id: 'hunyuan3d',
    icon: '🌟',
    label: 'Hunyuan3D',
    desc: '腾讯高质量3D生成，支持纹理',
    github: 'https://github.com/Tencent-Hunyuan/Hunyuan3D-2',
    badges: [
      { text: '高质量', class: 'badge-gpu' },
      { text: 'GPU', class: 'badge-gpu' },
    ],
    endpoint: '/api/v1/generation/hunyuan3d',
    mockTime: 5000,
  },
  {
    id: 'sf3d',
    icon: '🚀',
    label: 'SF3D',
    desc: 'Stability AI极速生成(~0.5秒)',
    github: 'https://github.com/Stability-AI/generative-models',
    badges: [
      { text: '极速', class: 'badge-fast' },
      { text: '9GB', class: 'badge-gpu' },
    ],
    endpoint: '/api/v1/generation/sf3d',
    mockTime: 500,
  },
  {
    id: 'triposr',
    icon: '⚡',
    label: 'TripoSR',
    desc: 'VAST-AI超快概念验证(<1秒)',
    github: 'https://github.com/VAST-AI-Research/TripoSR',
    badges: [
      { text: '<1秒', class: 'badge-fast' },
      { text: '4-6GB', class: 'badge-gpu' },
    ],
    endpoint: '/api/v1/generation/triposr',
    mockTime: 800,
  },
  {
    id: 'instantmesh',
    icon: '🔷',
    label: 'InstantMesh',
    desc: '腾讯ARC精细网格生成',
    github: 'https://github.com/TencentARC/InstantMesh',
    badges: [
      { text: '高质量', class: 'badge-gpu' },
      { text: '8-12GB', class: 'badge-gpu' },
    ],
    endpoint: '/api/v1/generation/instantmesh',
    mockTime: 15000,
  },
  {
    id: 'triposr_cpu',
    icon: '💻',
    label: 'TripoSR CPU',
    desc: '本地CPU版本，无需GPU',
    github: 'https://github.com/VAST-AI-Research/TripoSR',
    badges: [
      { text: '免费', class: 'badge-free' },
      { text: 'CPU', class: 'badge-free' },
    ],
    verified: true, // ✅ 已按官方开源实现：图像编码器→三平面NeRF→Marching Cubes→网格
    endpoint: '/api/v1/experimental/triposr/cpu/upload',
    mockTime: 5000,
  },
  {
    id: 'huggingface',
    icon: '☁️',
    label: 'HuggingFace',
    desc: '云端API，免费额度',
    github: 'https://huggingface.co/spaces',
    badges: [
      { text: '快速', class: 'badge-cloud' },
      { text: '云端', class: 'badge-cloud' },
    ],
    endpoint: '/api/v1/experimental/huggingface/upload',
    mockTime: 10000,
  },
];

// GitHub图标SVG
const GithubSVG = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline' }}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

// 3D模型预览组件
const ModelPreview: React.FC<{ url: string }> = ({ url }) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // GLB模型加载组件
  const GLBModel: React.FC<{ url: string }> = ({ url }) => {
    const gltf = useGLTF(url);
    
    useEffect(() => {
      if (gltf && gltf.scene) {
        setIsModelLoaded(true);
      }
    }, [gltf]);

    if (!gltf || !gltf.scene) {
      return null;
    }

    // 计算模型的包围盒和中心
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1; // 缩放到2个单位大小

    // 使用clone并居中
    const clonedScene = gltf.scene.clone();
    clonedScene.position.sub(center); // 居中
    clonedScene.scale.setScalar(scale); // 统一缩放

    return <primitive object={clonedScene} />;
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 加载提示 - 在Canvas外部 */}
      {!isModelLoaded && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          zIndex: 10,
          borderRadius: 8
        }}>
          <Spin size="large" spinning={true}>
            <div style={{ width: 0, height: 0 }} />
          </Spin>
        </div>
      )}
      
      {/* Canvas只渲染3D内容 */}
      <Canvas 
        camera={{ position: [0, 0, 3], fov: 50 }} 
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
        {/* Environment组件可能导致HDR加载失败，暂时禁用 */}
        {/* <Environment preset="studio" /> */}
        <OrbitControls 
          autoRotate 
          enableDamping 
          dampingFactor={0.05}
          minDistance={0.5}
          maxDistance={10}
        />
        <GLBModel url={url} />
      </Canvas>
    </div>
  );
};

export const ExperimentalGeneration: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<string>('image_to_stl');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const uploadRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);
  
  // HuggingFace模型版本选择
  const [hunyuanModel, setHunyuanModel] = useState<string>('hy-3d-3.0');
  
  // 示例图片抽屉
  const [examplesDrawerVisible, setExamplesDrawerVisible] = useState(false);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // 选择模式
  const selectMode = (modeId: string) => {
    setCurrentMode(modeId);
  };

  // 上传图片
  const handleUploadChange = (info: any) => {
    const { fileList: newFileList } = info;
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const file = newFileList[0].originFileObj as File;
      setSelectedFile(file);
      
      // 生成预览图
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewImage('');
    }
    setGeneratedUrl('');
    setError('');
    setSuccess('');
  };

  // 选择示例图片
  const handleExampleClick = async (imageName: string) => {
    try {
      const imagePath = `/app/example_images/${imageName}`;
      const response = await fetch(imagePath);
      if (!response.ok) {
        throw new Error('图片加载失败');
      }
      const blob = await response.blob();
      const file = new File([blob], imageName, { type: 'image/png' });
      setSelectedFile(file);
      
      // 生成预览图
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setGeneratedUrl('');
      setError('');
      setSuccess('');
    } catch (err: any) {
      setError('加载示例图片失败：' + (err.message || '未知错误'));
    }
  };

  // 开始生成
  const startGeneration = async () => {
    if (!selectedFile) {
      setError('请先选择图片');
      return;
    }

    const mode = MODES.find(m => m.id === currentMode);
    if (!mode) {
      setError('无效的生成模式');
      return;
    }

    setLoading(true);
    setProgress(0);
    setStatusText('正在上传图片...');
    setGeneratedUrl('');
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // HuggingFace模式：添加模型版本参数
      if (currentMode === 'huggingface') {
        formData.append('model_version', hunyuanModel);
      }

      const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}${mode.endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      const taskId = result.task_id;
      setSuccess('任务已提交，正在生成3D模型...');
      
      // 真实轮询后端API获取生成进度
      pollTaskStatus(taskId);

    } catch (err: any) {
      setError('生成失败：' + (err.message || '未知错误'));
      setLoading(false);
    }
  };

  // 真实轮询任务状态
  const pollTaskStatus = (taskId: string) => {
    setStatusText('正在生成3D模型...');
    
    pollTimerRef.current = setInterval(async () => {
      try {
        const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/v1/experimental/task/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const taskStatus = await response.json();
        
        // 更新进度
        if (taskStatus.progress !== undefined) {
          setProgress(taskStatus.progress);
        }
        
        // 更新状态文本
        if (taskStatus.message) {
          setStatusText(taskStatus.message);
        }
        
        // 检查是否完成
        if (taskStatus.status === 'completed') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setProgress(100);
          setStatusText('生成完成！');
          
          // 设置真实模型URL
          const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';
          const modelUrl = `${API_BASE_URL}/api/v1/experimental/download/${taskId}`;
          setGeneratedUrl(modelUrl);
          setSuccess('🎉 3D模型生成成功！');
          setLoading(false);
        }
        
        // 检查是否失败
        if (taskStatus.status === 'failed') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setError(`生成失败：${taskStatus.message || '未知错误'}`);
          setLoading(false);
        }
      } catch (err: any) {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setError('获取状态失败：' + (err.message || '未知错误'));
        setLoading(false);
      }
    }, 1000); // 每1秒轮询一次
  };

  // 下载模型
  const handleDownload = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank');
    }
  };

  // 清除消息
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div style={styles.mainLayout}>
      {/* 顶部模型选择栏 */}
      <div style={styles.topModesBar}>
        <div style={styles.modesRow}>
          {MODES.map(mode => (
            <div
              key={mode.id}
              style={{
                ...styles.modeChip,
                ...(currentMode === mode.id ? styles.modeChipActive : {}),
              }}
              onClick={() => selectMode(mode.id)}
            >
              <div style={styles.modeChipInfo}>
                <div style={styles.modeChipHeader}>
                  <div style={styles.modeChipLabel}>{mode.icon} {mode.label}</div>
                  {/* 已验证标记 */}
                  {mode.verified && (
                    <span style={styles.verifiedBadge} title="已按官方开源技术实现">✅</span>
                  )}
                </div>
                <div style={styles.modeChipDesc}>{mode.desc}</div>
                {/* 底部信息行：badge + GitHub */}
                <div style={styles.modeChipFooter}>
                  <div style={styles.modeChipBadges}>
                    {mode.badges.map((badge, idx) => (
                      <span key={idx} style={{ ...styles.modeChipBadge, ...styles[badge.class as keyof typeof styles] }}>
                        {badge.text}
                      </span>
                    ))}
                  </div>
                  <a
                    href={mode.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.modeChipGithub}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GithubSVG /> GitHub
                  </a>
                </div>
              </div>
              {currentMode === mode.id && <div style={styles.activeCheck}>✓</div>}
            </div>
          ))}
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={styles.contentArea}>
        {/* 左侧面板 */}
        <div style={styles.leftPanel}>
          <div style={styles.panelTitle}>⚙️ 生成配置</div>

          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 8 }} />
          )}
          {success && (
            <Alert message={success} type="success" showIcon style={{ marginBottom: 8 }} />
          )}

          {/* 上传区域 */}
          <div style={styles.uploadSection}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>上传图片：</div>
            <Upload
              ref={uploadRef}
              listType="picture-card"
              fileList={previewImage ? [{ uid: '1', name: 'image', status: 'done', url: previewImage }] : []}
              onChange={handleUploadChange}
              beforeUpload={() => false}
              accept="image/*"
              maxCount={1}
              style={{ width: '100%' }}
            >
              <div>
                <CloudUploadOutlined />
                <div style={{ marginTop: 8 }}>拖拽图片到此处，或点击上传</div>
              </div>
            </Upload>
          </div>

          {/* HuggingFace模式：模型版本选择 */}
          {currentMode === 'huggingface' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>选择模型版本：</div>
              <Select
                value={hunyuanModel}
                onChange={setHunyuanModel}
                style={{ width: '100%' }}
                size="large"
              >
                <Option value="hy-3d-3.0">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🎯 hy-3d-3.0 标准版（推荐）</span>
                    <span style={{ fontSize: 12, color: '#999' }}>平衡质量与速度</span>
                  </div>
                </Option>
                <Option value="hy-3d-3.1">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✨ hy-3d-3.1 专业版</span>
                    <span style={{ fontSize: 12, color: '#999' }}>最高质量</span>
                  </div>
                </Option>
                <Option value="HY-3D-Express">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚡ HY-3D-Express 极速版</span>
                    <span style={{ fontSize: 12, color: '#999' }}>最快生成</span>
                  </div>
                </Option>
              </Select>
              <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                💡 提示：需要配置腾讯云API Key才能使用，详见文档
              </div>
            </div>
          )}

          {/* 开始按钮 */}
          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            disabled={!selectedFile}
            onClick={startGeneration}
            icon={<PlayCircleOutlined />}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              height: 44,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {loading ? '🔄 生成中...' : '🚀 开始生成'}
          </Button>

          {/* 进度显示 */}
          {loading && (
            <div style={styles.progressArea}>
              <div style={styles.progressBarContainer}>
                <div style={{ ...styles.progressBar, width: `${progress}%` }}>
                  {progress}%
                </div>
              </div>
              <div style={styles.statusText}>{statusText}</div>
            </div>
          )}
        </div>

        {/* 右侧预览区 */}
        <div style={styles.rightPanel}>
          <div style={styles.previewHeader}>
            <div style={styles.previewTitle}>📦 3D模型预览</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                icon={<PictureOutlined />}
                onClick={() => setExamplesDrawerVisible(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  color: 'white',
                }}
              >
                示例图片库
              </Button>
              {generatedUrl && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleDownload}
                  style={{
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                    border: 'none',
                  }}
                >
                  ⬇️ 下载GLB
                </Button>
              )}
            </div>
          </div>

          <div style={styles.modelViewerContainer}>
            {generatedUrl ? (
              <ModelPreview url={generatedUrl} />
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🎨</div>
                <div style={styles.emptyText}>上传图片并点击"开始生成"</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 示例图片抽屉 */}
      <Drawer
        title="🖼️ 示例图片库 (65 images)"
        placement="right"
        width={800}
        onClose={() => setExamplesDrawerVisible(false)}
        open={examplesDrawerVisible}
        styles={{
          body: { padding: 0 }
        }}
      >
        <div style={{ padding: '16px' }}>
          <div style={styles.examplesGrid}>
            {ALL_EXAMPLE_IMAGES.map((imgName) => (
              <div
                key={imgName}
                style={{
                  ...styles.exampleItem,
                  borderColor: selectedFile?.name === imgName ? '#667eea' : '#e0e0e0',
                  boxShadow: selectedFile?.name === imgName ? '0 2px 8px rgba(102, 126, 234, 0.3)' : 'none',
                }}
                onClick={() => {
                  handleExampleClick(imgName);
                  setExamplesDrawerVisible(false);
                }}
              >
                <img
                  src={`/app/example_images/${imgName}`}
                  alt={imgName}
                  style={styles.exampleImage}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </Drawer>
    </div>
  );
};

// 样式定义（完全复刻HTML）
const styles: Record<string, React.CSSProperties> & Record<string, any> = {
  mainLayout: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 120px)',
    gap: 8,
  },
  topModesBar: {
    background: 'white',
    borderRadius: 8,
    padding: '10px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  topModesTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
  },
  modesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 6,
  },
  modeChip: {
    padding: '8px 10px',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: '#e0e0e0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    position: 'relative',
    minHeight: 70,
  },
  modeChipActive: {
    borderColor: '#667eea',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  activeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    background: '#667eea',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modeChipInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  modeChipHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  modeChipLabel: {
    fontWeight: 600,
    color: '#333',
    fontSize: 12,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  verifiedBadge: {
    fontSize: 10,
    cursor: 'help',
    lineHeight: 1,
  },
  githubBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #eee',
  },
  githubLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 4,
    background: '#fafafa',
  },
  githubLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: 500,
  },
  githubAnchor: {
    color: '#666',
    textDecoration: 'none',
    fontSize: 9,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    transition: 'color 0.2s',
  },
  modeChipGithub: {
    color: '#999',
    textDecoration: 'none',
    fontSize: 9,
    padding: '2px 4px',
    borderRadius: 3,
    background: '#f5f5f5',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  modeChipDesc: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  modeChipFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingTop: 4,
    marginTop: 'auto',
  },
  modeChipBadges: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  modeChipBadge: {
    display: 'inline-block',
    padding: '2px 5px',
    borderRadius: 6,
    fontSize: 8,
    fontWeight: 600,
  },
  'badge-free': {
    background: '#d4edda',
    color: '#155724',
  },
  'badge-fast': {
    background: '#fff3cd',
    color: '#856404',
  },
  'badge-gpu': {
    background: '#d1ecf1',
    color: '#0c5460',
  },
  'badge-cloud': {
    background: '#f8d7da',
    color: '#721c24',
  },
  contentArea: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: 12,
    overflow: 'hidden',
  },
  leftPanel: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'auto',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
    paddingBottom: 10,
    borderBottom: '2px solid #667eea',
    flexShrink: 0,
  },
  uploadSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  progressArea: {
    flexShrink: 0,
  },
  progressBarContainer: {
    background: '#e0e0e0',
    borderRadius: 6,
    height: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: 12,
    fontWeight: 600,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  rightPanel: {
    background: 'white',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  previewHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#333',
  },
  modelViewerContainer: {
    flex: 1,
    position: 'relative',
    background: '#fafafa',
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#999',
    pointerEvents: 'none',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  examplesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 12,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    padding: '8px',
  },
  exampleItem: {
    aspectRatio: '1',
    border: '2px solid #e0e0e0',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
    overflow: 'hidden',
    background: '#fafafa',
  },
  exampleImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
};

export default ExperimentalGeneration;
