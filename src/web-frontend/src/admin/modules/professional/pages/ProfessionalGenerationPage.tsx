/**
 * 专业版3D大模型页面 - 腾讯官方混元3D云端API
 * 
 * 特点：
 * 1. 直接对接腾讯官方大模型（hy-3d-3.0、hy-3d-3.1、HY-3D-Express）
 * 2. 显示API额度管理（每次消耗的额度）
 * 3. 额度不足时自动锁定按钮
 * 4. 高质量真实3D生成效果
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Button, Alert, Spin, Drawer, Tag, Popover, message, Modal } from 'antd';
import {
  CloudUploadOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// 官方示例图片列表
const ALL_EXAMPLE_IMAGES = [
  '004.png', '052.png', '073.png', '075.png', '1008.png', '101.png', '1022.png', '1029.png', '1037.png', '1079.png',
  '1111.png', '1123.png', '1128.png', '1135.png', '1146.png', '1148.png', '1154.png', '1180.png', '1196.png', '1204.png',
  '1234.png', '1310.png', '1316.png', '1354.png', '1429.png', '1493.png', '1582.png', '1583.png', '1596.png', '1601.png',
  '1603.png', '1626.png', '1627.png', '1654.png', '167.png', '1670.png', '1679.png', '1687.png', '1698.png', '1715.png',
  '1735.png', '1738.png', '1744.png', '1758.png', '1772.png', '1773.png', '1778.png', '179.png', '1898.png', '191.png',
  '195.png', '197.png', '198.png', '202.png', '203.png', '218.png', '219.png', '379.png', '380.png', '419.png',
  '583.png', '888.png', '895.png', 'example_000.png', 'example_002.png'
];

// 腾讯混元3D官方模型配置
interface ProfessionalModel {
  id: string;
  icon: string;
  label: string;
  desc: string;
  version: string;
  badges: { text: string; color: string }[];
  endpoint: string;
  costPerUse: number; // 每次消耗的积分
  estimatedTime: string; // 预估生成时间
  tokenCost: string; // Token消耗估算
  disabled?: boolean; // 是否停用（SDK未支持）
  disableReason?: string; // 停用原因说明
  details: {
    title: string;
    mainUse: string;
    scenarios: string[];
    features: string[];
    recommended: string;
  };
}

const PROFESSIONAL_MODELS: ProfessionalModel[] = [
  {
    id: 'hy-3d-3.0',
    icon: '🎯',
    label: 'hy-3d-3.0 标准版',
    desc: '平衡质量与速度，推荐日常使用',
    version: 'hy-3d-3.0',
    badges: [
      { text: '推荐', color: 'green' },
      { text: '云端', color: 'blue' },
    ],
    endpoint: '/api/v1/experimental/huggingface/upload',
    costPerUse: 10, // 每次消耗10积分
    estimatedTime: '30-60秒',
    tokenCost: '~50,000 Tokens/次',
    details: {
      title: '🎯 hy-3d-3.0 标准版',
      mainUse: '日常3D生成与快速迭代',
      scenarios: [
        '✅ 电商产品展示（鞋服、数码、家居）',
        '✅ 游戏道具与角色原型',
        '✅ 室内设计预览与布局',
        '✅ 教育培训3D素材制作',
      ],
      features: [
        '⚡ 生成速度：30-60秒',
        '🎨 模型质量：高（95分）',
        '📐 面数：5000-10000面',
        '💾 输出格式：GLB/OBJ',
        '💰 消耗：10积分/次（约50,000 Tokens）',
        '📊 预计可用：20次',
      ],
      recommended: '🌟 最适合日常使用，质量与速度完美平衡',
    },
  },
  {
    id: 'hy-3d-3.1',
    icon: '✨',
    label: 'hy-3d-3.1 专业版',
    desc: '最高质量，适合精细模型',
    version: 'hy-3d-3.1',
    badges: [
      { text: '高质量', color: 'gold' },
      { text: '云端', color: 'blue' },
    ],
    endpoint: '/api/v1/experimental/huggingface/upload',
    costPerUse: 20, // 每次消耗20积分
    estimatedTime: '60-120秒',
    tokenCost: '~100,000 Tokens/次',
    details: {
      title: '✨ hy-3d-3.1 专业版',
      mainUse: '高质量精细化3D模型制作',
      scenarios: [
        '✅ 影视级3D角色与场景',
        '✅ 工业设计（汽车、机械零件）',
        '✅ 建筑可视化与景观模型',
        '✅ 高精度3D打印模型',
        '✅ 文化遗产数字化复原',
      ],
      features: [
        '⚡ 生成速度：60-120秒',
        '🎨 模型质量：极高（98分）',
        '📐 面数：10000-20000面',
        '💾 输出格式：GLB/OBJ/FBX',
        '🔍 细节保留：最佳',
        '✨ 纹理质量：4K高清',
        '💰 消耗：20积分/次（约100,000 Tokens）',
        '📊 预计可用：10次',
      ],
      recommended: '🏆 追求极致质量的首选，适合专业场景',
    },
  },
  {
    id: 'hy-3d-express',
    icon: '⚡',
    label: 'HY-3D-Express 极速版',
    desc: '🇺🇳 国际站 - 消耗免费资源包200积分',
    version: 'HY-3D-Express',
    badges: [
      { text: '极速', color: 'cyan' },
      { text: '国际站', color: 'purple' },
    ],
    endpoint: '/api/v1/experimental/huggingface/upload',
    costPerUse: 1, // 国际站免费资源包，计价方式不同
    estimatedTime: '10-20秒',
    tokenCost: '~25,000 Tokens/次',
    disabled: false, // 已启用，走国际站Endpoint
    disableReason: '',
    details: {
      title: '⚡ HY-3D-Express 极速版（国际站）',
      mainUse: '快速原型验证与批量生成',
      scenarios: [
        '✅ 产品概念快速验证',
        '✅ 批量生成3D素材库',
        '✅ 实时交互应用原型',
        '✅ AR/VR快速预览',
        '✅ 社交媒体3D内容创作',
      ],
      features: [
        '⚡ 生成速度：10-20秒（官方标准）',
        '🎨 模型质量：中（85分）',
        '📐 面数：3000-5000面',
        '💾 输出格式：GLB',
        '💰 消耗：1次（国际站免费资源包）',
        '🚀 吞吐量：最高',
        '📊 预计可用：200次（剩余免费资源）',
        '🌐 接入站点：国际站 ai3d.intl.tencentcloudapi.com',
      ],
      recommended: '🇺🇳 国际站免费资源包入口，与国内站标准版/专业版资源独立，互不干扰',
    },
  },
];

// 3D模型预览组件
const ModelPreview: React.FC<{ url: string }> = ({ url }) => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const GLBModel: React.FC<{ url: string }> = ({ url }) => {
    try {
      const gltf = useGLTF(url);
      
      useEffect(() => {
        if (gltf && gltf.scene) {
          setIsModelLoaded(true);
          setLoadError(null);
          console.log('[ModelPreview] Model loaded successfully:', url);
        }
      }, [gltf]);

      if (!gltf || !gltf.scene) {
        return null;
      }

      // 计算模型的包围盒和中心点
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 2 / maxDim : 1;

      // 克隆场景并调整位置和缩放
      const clonedScene = gltf.scene.clone();
      clonedScene.position.sub(center);
      clonedScene.scale.setScalar(scale);

      return <primitive object={clonedScene} />;
    } catch (error) {
      console.error('[ModelPreview] Failed to load model:', error);
      setLoadError('模型加载失败');
      return null;
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 加载中提示 */}
      {!isModelLoaded && !loadError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          zIndex: 10,
          borderRadius: 8
        }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#666', fontSize: 14 }}>
            正在加载3D模型...
          </div>
        </div>
      )}
      
      {/* 加载错误提示 */}
      {loadError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          zIndex: 10,
          borderRadius: 8
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            {loadError}
          </div>
          <div style={{ color: '#999', fontSize: 13 }}>
            请检查网络连接或稍后重试
          </div>
        </div>
      )}
      
      {/* 3D画布 */}
      <Canvas 
        camera={{ position: [0, 0, 3], fov: 50 }} 
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        onError={(error) => {
          console.error('[Canvas] WebGL error:', error);
          setLoadError('WebGL渲染失败');
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />
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

export const ProfessionalGenerationPage: React.FC = () => {
  const [currentModel, setCurrentModel] = useState<string>('hy-3d-3.0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showUploadArea, setShowUploadArea] = useState(true); // 控制上传区域显示
  
  // ---- 多视角图片状态 ----
  const [imageMode, setImageMode] = useState<'single' | 'multi'>('single');
  const MAIN_VIEWS = [
    { key: 'front', label: '正面视图', required: true, desc: '主图（正面）' },
    { key: 'back', label: '背面视图', required: false, desc: '背面' },
    { key: 'left', label: '左侧视图', required: false, desc: '左侧' },
    { key: 'right', label: '右侧视图', required: false, desc: '右侧' },
  ] as const;
  const EXTRA_VIEWS = [
    { key: 'top', label: '顶视图', required: false, desc: '顶视图（仅3.1版支持）' },
    { key: 'bottom', label: '底视图', required: false, desc: '底视图（仅3.1版支持）' },
    { key: 'left_front', label: '左前45°', required: false, desc: '左前45°视图（仅3.1版支持）' },
    { key: 'right_front', label: '右前45°', required: false, desc: '右前45°视图（仅3.1版支持）' },
  ] as const;
  const [multiViewFiles, setMultiViewFiles] = useState<Record<string, File | null>>({
    front: null, back: null, left: null, right: null,
    top: null, bottom: null, left_front: null, right_front: null
  });
  const [multiViewPreviews, setMultiViewPreviews] = useState<Record<string, string>>({
    front: '', back: '', left: '', right: '',
    top: '', bottom: '', left_front: '', right_front: ''
  });
  const [extraViewsModalVisible, setExtraViewsModalVisible] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const uploadRef = useRef<any>(null);
  const pollTimerRef = useRef<any>(null);
  
  // 使用统计 - 从后端API获取（额度由腾讯云API直接管理）
  const [usedQuota, setUsedQuota] = useState<number>(0);
  // quotaLoading 状态暂未在UI中使用，保留setQuotaLoading调用以便将来扩展
  
  // 示例图片抽屉
  const [examplesDrawerVisible, setExamplesDrawerVisible] = useState(false);

  useEffect(() => {
    // 页面加载时获取真实使用统计
    fetchUsageStats();
    
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // 从后端获取使用统计
  const fetchUsageStats = async () => {
    // setQuotaLoading(true);  // 暂未在UI中使用加载状态
    try {
      const token = localStorage.getItem('access_token');
      
      // 检查是否已登录
      if (!token) {
        console.warn('User not logged in, skipping stats fetch');
        setUsedQuota(0);
        return;
      }
      
      const response = await fetch('http://localhost:8000/api/v1/quota/balance', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // 处理401未授权错误
      if (response.status === 401) {
        console.warn('Token expired or invalid, user needs to login');
        message.warning('登录已过期，请重新登录');
        // 清除无效token
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // 延迟跳转到登录页
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 2000);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setUsedQuota(result.data.used_quota || 0);
        console.log(`[Quota] 从后端加载: 已使用=${result.data.used_quota || 0} 次`);
      }
    } catch (err: any) {
      console.error('Failed to fetch usage stats:', err);
      // 不显示错误提示，使用默认值
      setUsedQuota(0);
    } finally {
      // setQuotaLoading(false);  // 暂未在UI中使用加载状态
    }
  };

  const selectModel = (modelId: string) => {
    // 检查是否停用的模型
    const selectedModel = PROFESSIONAL_MODELS.find(m => m.id === modelId);
    if (selectedModel?.disabled) {
      message.warning('该模型版本即将开放，敬请期待！');
      return;
    }
    setCurrentModel(modelId);
  };

  const handleUploadChange = (info: any) => {
    const { fileList: newFileList } = info;
    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const file = newFileList[0].originFileObj as File;
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // 选择图片后隐藏上传区域
      setShowUploadArea(false);
    } else {
      setSelectedFile(null);
      setPreviewImage('');
      // 清除图片后显示上传区域
      setShowUploadArea(true);
    }
    setGeneratedUrl('');
    setError('');
    setSuccess('');
  };

  // ---- 多视角图片上传处理 ----
  const handleMultiViewUpload = (viewKey: string) => {
    // 创建一个隐藏的file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setMultiViewFiles(prev => ({ ...prev, [viewKey]: file }));
          setMultiViewPreviews(prev => ({ ...prev, [viewKey]: event.target?.result as string }));
          
          // 如果是front视图，同步到selectedFile（兼容生成逻辑）
          if (viewKey === 'front') {
            setSelectedFile(file);
            setPreviewImage(event.target?.result as string);
            setShowUploadArea(false);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  // 移除多视角图片
  const handleRemoveMultiView = (viewKey: string) => {
    setMultiViewFiles(prev => ({ ...prev, [viewKey]: null }));
    setMultiViewPreviews(prev => ({ ...prev, [viewKey]: '' }));
    if (viewKey === 'front') {
      setSelectedFile(null);
      setPreviewImage('');
      // 检查是否还有其他视图保留
      const hasOther = Object.entries(multiViewFiles).some(([k, v]) => k !== 'front' && v);
      if (!hasOther) {
        setShowUploadArea(true);
      }
    }
  };

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
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // 选择示例图片后隐藏上传区域
      setShowUploadArea(false);
      
      setGeneratedUrl('');
      setError('');
      setSuccess('');
    } catch (err: any) {
      setError('加载示例图片失败：' + (err.message || '未知错误'));
    }
  };

  const startGeneration = async () => {
    if (imageMode === 'single') {
      if (!selectedFile) {
        setError('请先选择图片');
        return;
      }
    } else {
      // 多图模式：front必须上传
      if (!multiViewFiles.front) {
        setError('请至少上传正面视图图片');
        return;
      }
    }

    const model = PROFESSIONAL_MODELS.find(m => m.id === currentModel);
    if (!model) {
      setError('无效的模型选择');
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
      
      // 单图模式：发送主图
      if (imageMode === 'single') {
        formData.append('file', selectedFile!);
      } else {
        // 多图模式：发送所有图片
        formData.append('file', multiViewFiles.front!);
        
        // 附加多视角图片（全部8视角）
        const extraViewKeys = ['left', 'right', 'back', 'top', 'bottom', 'left_front', 'right_front'] as const;
        for (const viewKey of extraViewKeys) {
          if (multiViewFiles[viewKey]) {
            formData.append(`multi_view_images[${viewKey}]`, multiViewFiles[viewKey]!);
          }
        }
        
        // 开启PBR材质
        formData.append('enable_pbr', 'true');
      }
      
      formData.append('model_version', model.version);

      const response = await fetch('http://localhost:8000/api/v1/experimental/huggingface/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      // 处理401未授权错误
      if (response.status === 401) {
        message.warning('登录已过期，请重新登录');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setTimeout(() => {
          window.location.href = '/admin/login';
        }, 2000);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      const taskId = result.task_id;
      setSuccess('任务已提交，正在生成3D模型...');
      
      // 不再前端扣费，额度由腾讯云API直接管理
      // 刷新使用统计显示
      fetchUsageStats();
      
      pollTaskStatus(taskId);

    } catch (err: any) {
      setError('生成失败：' + (err.message || '未知错误'));
      setLoading(false);
    }
  };

  const pollTaskStatus = (taskId: string) => {
    setStatusText('正在生成3D模型...');
    
    let retryCount = 0;
    const maxRetries = 180; // 最多重试180次（3分钟）
    
    pollTimerRef.current = setInterval(async () => {
      try {
        retryCount++;
        
        if (retryCount > maxRetries) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setError('生成超时，请稍后重试');
          setLoading(false);
          return;
        }
        
        const response = await fetch(`http://localhost:8000/api/v1/experimental/task/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        
        // 处理401未授权错误
        if (response.status === 401) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          message.warning('登录已过期，请重新登录');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 2000);
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const taskStatus = await response.json();
        
        // 更新进度
        if (taskStatus.progress !== undefined) {
          setProgress(taskStatus.progress);
        }
        
        // 更新状态消息
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
          
          // 构建下载URL
          const modelUrl = `http://localhost:8000/api/v1/experimental/download/${taskId}`;
          setGeneratedUrl(modelUrl);
          setSuccess('🎉 3D模型生成成功！');
          setLoading(false);
          
          console.log('[ProfessionalGeneration] Model generated successfully:', modelUrl);
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
        console.error('[ProfessionalGeneration] Poll error:', err);
        
        // 如果是网络错误，继续重试
        if (retryCount < maxRetries) {
          console.log(`[ProfessionalGeneration] Retry ${retryCount}/${maxRetries}`);
        } else {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setError('获取状态失败：' + (err.message || '未知错误'));
          setLoading(false);
        }
      }
    }, 2000); // 每2秒轮询一次，减少服务器压力
  };

  const handleDownload = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank');
    }
  };

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

  const currentModelConfig = PROFESSIONAL_MODELS.find(m => m.id === currentModel);

  return (
    <div style={styles.mainLayout}>
      {/* 顶部额度信息栏 */}
      <div style={styles.quotaBar}>
        <div style={styles.quotaInfo}>
          <SafetyCertificateOutlined style={{ fontSize: 18, color: '#1890ff', marginRight: 8 }} />
          <span style={{ fontWeight: 600, marginRight: 16 }}>腾讯混元3D官方API</span>
          
          <Tag color="blue" icon={<ThunderboltOutlined />}>专业版</Tag>
          <Tag color="green" icon={<SafetyCertificateOutlined />}>真实效果</Tag>
        </div>
        
        <div style={styles.quotaStats}>
          <div style={styles.quotaItem}>
            <span style={styles.quotaLabel}>已使用：</span>
            <span style={{ ...styles.quotaValue, color: '#1890ff', fontWeight: 700 }}>{usedQuota} 次</span>
          </div>
          <div style={styles.quotaItem}>
            <Tag color="blue" icon={<SafetyCertificateOutlined />}>由腾讯云API直接计费</Tag>
          </div>
        </div>
      </div>

      {/* 顶部模型选择栏 */}
      <div style={styles.topModesBar}>
        <div style={styles.modesRow}>
          {PROFESSIONAL_MODELS.map(model => {
            const isDisabled = model.disabled === true; // 检查是否停用
            
            return (
              <div
                key={model.id}
                style={{
                  ...styles.modeChip,
                  ...(currentModel === model.id ? styles.modeChipActive : {}),
                  ...(isDisabled ? styles.modeChipDisabled : {}), // 停用样式
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.6 : 1, // 降低透明度表示停用
                }}
                onClick={() => !isDisabled && selectModel(model.id)}
              >
                {/* 停用标识 */}
                {isDisabled && (
                  <div style={styles.disabledBadge}>
                    即将开放
                  </div>
                )}
                
                <div style={styles.modeChipInfo}>
                  <div style={styles.modeChipHeader}>
                    <div style={styles.modeChipLabel}>
                      {model.icon} {model.label}
                      <Popover
                        content={
                          <div style={{ maxWidth: 320 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#333' }}>
                              {model.details.title}
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>📌 主要用途：</div>
                              <div style={{ fontSize: 13, color: '#1890ff', fontWeight: 600 }}>{model.details.mainUse}</div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>🎯 适用场景：</div>
                              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                                {model.details.scenarios.map((s, i) => (
                                  <div key={i}>{s}</div>
                                ))}
                              </div>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>⚙️ 技术特性：</div>
                              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                                {model.details.features.map((f, i) => (
                                  <div key={i}>{f}</div>
                                ))}
                              </div>
                            </div>
                            <div style={{ 
                              padding: '8px 12px', 
                              background: '#e6f7ff', 
                              borderRadius: 6,
                              borderLeft: '3px solid #1890ff'
                            }}>
                              <span style={{ fontSize: 12, color: '#1890ff', fontWeight: 600 }}>
                                {model.details.recommended}
                              </span>
                            </div>
                          </div>
                        }
                        title={null}
                        trigger="click"
                        placement="bottom"
                      >
                        <InfoCircleOutlined 
                          style={{ 
                            fontSize: 14, 
                            color: '#1890ff', 
                            cursor: 'pointer',
                            marginLeft: 4
                          }} 
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popover>
                    </div>
                  </div>
                  <div style={styles.modeChipDesc}>{model.desc}</div>
                  
                  <div style={styles.modeChipFooter}>
                    <div style={styles.modeChipBadges}>
                      {model.badges.map((badge, idx) => (
                        <Tag key={idx} color={badge.color} style={{ fontSize: 10, margin: 0 }}>
                          {badge.text}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>
                    ⏱️ {model.estimatedTime}
                  </div>
                </div>
                
                {currentModel === model.id && <div style={styles.activeCheck}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={styles.contentArea}>
        {/* 左侧面板 */}
        <div style={styles.leftPanel}>

          {error && (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 8 }} />
          )}
          {success && (
            <Alert message={success} type="success" showIcon style={{ marginBottom: 8 }} />
          )}

          {/* ---- 图片上传区域 ---- */}
          {showUploadArea ? (
            <div style={styles.uploadSection}>
              {/* 单图/多图切换按钮（仅专业版3.1显示） */}
              {currentModel === 'hy-3d-3.1' && (
                <div style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 10,
                  background: '#f5f5f5',
                  borderRadius: 6,
                  padding: 3,
                }}>
                  <div
                    onClick={() => {
                      setImageMode('single');
                      // 清除多视图状态
                      setMultiViewFiles({ front: null, back: null, left: null, right: null, top: null, bottom: null, left_front: null, right_front: null });
                      setMultiViewPreviews({ front: '', back: '', left: '', right: '', top: '', bottom: '', left_front: '', right_front: '' });
                    }}
                    style={{
                      flex: 1,
                      padding: '5px 10px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      background: imageMode === 'single' ? '#667eea' : 'transparent',
                      color: imageMode === 'single' ? '#fff' : '#666',
                    }}
                  >
                    📷 单张图片
                  </div>
                  <div
                    onClick={() => setImageMode('multi')}
                    style={{
                      flex: 1,
                      padding: '5px 10px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      background: imageMode === 'multi' ? '#667eea' : 'transparent',
                      color: imageMode === 'multi' ? '#fff' : '#666',
                    }}
                  >
                    🖼️ 多张图片
                  </div>
                </div>
              )}

              {imageMode === 'single' ? (
                <>
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
                </>
              ) : (
                <>
                  {/* 多视角上传网格 */}
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                    多视角上传 <span style={{ color: '#999', fontWeight: 400, fontSize: 11 }}>（多图生成更高品质，仅专业版3.1支持）</span>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}>
                    {MAIN_VIEWS.map(v => {
                      const hasFile = !!multiViewFiles[v.key];
                      const preview = multiViewPreviews[v.key];
                      return (
                        <div
                          key={v.key}
                          onClick={() => !hasFile && handleMultiViewUpload(v.key)}
                          style={{
                            aspectRatio: '1',
                            borderRadius: 8,
                            border: hasFile
                              ? '2px solid #667eea'
                              : '1.5px dashed #d9d9d9',
                            background: hasFile ? 'transparent' : '#fafafa',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: hasFile ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            overflow: 'hidden',
                            minHeight: 100,
                          }}
                          onMouseEnter={(e) => {
                            if (!hasFile) {
                              (e.currentTarget as HTMLElement).style.borderColor = '#667eea';
                              (e.currentTarget as HTMLElement).style.background = '#f0f0ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!hasFile) {
                              (e.currentTarget as HTMLElement).style.borderColor = '#d9d9d9';
                              (e.currentTarget as HTMLElement).style.background = '#fafafa';
                            }
                          }}
                        >
                          {hasFile && preview ? (
                            <>
                              <img
                                src={preview}
                                alt={v.label}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                              {/* 移除按钮 */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMultiView(v.key);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 3,
                                  right: 3,
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.5)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </div>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: 4 }}>
                              <PictureOutlined style={{ fontSize: 22, color: '#bbb' }} />
                              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{v.label}</div>
                              {v.required && <span style={{ color: '#ff4d4f', fontSize: 11 }}>（必填）</span>}
                            </div>
                          )}
                          {/* 视图标签 */}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '2px 4px',
                            background: 'rgba(0,0,0,0.45)',
                            color: '#fff',
                            fontSize: 10,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {hasFile ? v.label : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* 更多视角按钮 */}
                  <div style={{
                    marginTop: 8,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <Button
                      size="small"
                      icon={<PictureOutlined />}
                      onClick={() => setExtraViewsModalVisible(true)}
                      style={{
                        fontSize: 12,
                      }}
                    >
                      更多视角（{['top', 'bottom', 'left_front', 'right_front'].filter(k => multiViewFiles[k]).length}/4）
                    </Button>
                    <span style={{ fontSize: 11, color: '#52c41a' }}>
                      已上传 {Object.values(multiViewFiles).filter(Boolean).length}/8 张
                    </span>
                  </div>
                  {/* 提示信息 */}
                  <div style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    background: '#fff7e6',
                    borderRadius: 4,
                    borderLeft: '3px solid #faad14',
                    fontSize: 11,
                    color: '#666',
                    lineHeight: 1.5,
                  }}>
                    上传多个视角图片可获得更好的3D重建效果。
                    <span style={{ color: '#ff4d4f' }}>正面视图是必需的</span>。
                    建议同时上传左/右/背面视图以获得最佳效果。
                  </div>
                </>
              )}
            </div>
          ) : (
            // 已选择图片后显示预览和重新选择按钮
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: '#666' }}>
                  {imageMode === 'multi' ? '已选择图片（多视角）：' : '已选择图片：'}
                </div>
                <Button 
                  size="small" 
                  type="link"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewImage('');
                    // 清除多视图状态
                    setMultiViewFiles({ front: null, back: null, left: null, right: null });
                    setMultiViewPreviews({ front: '', back: '', left: '', right: '' });
                    setShowUploadArea(true);
                    setGeneratedUrl('');
                    setError('');
                    setSuccess('');
                  }}
                  style={{ padding: 0, fontSize: 12 }}
                >
                  🔄 重新选择
                </Button>
              </div>
              
              {imageMode === 'single' ? (
                <div style={{
                  width: '100%',
                  height: 120,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '2px solid #667eea',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f5f5f5'
                }}>
                  <img 
                    src={previewImage} 
                    alt="preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain' 
                    }} 
                  />
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                  }}>
                    {MAIN_VIEWS.map(v => {
                      const preview = multiViewPreviews[v.key];
                      const hasFile = !!multiViewFiles[v.key];
                      return (
                        <div
                          key={v.key}
                          onClick={() => !hasFile && handleMultiViewUpload(v.key)}
                          style={{
                            aspectRatio: '1',
                            borderRadius: 8,
                            border: hasFile
                              ? '2px solid #667eea'
                              : '1.5px dashed #d9d9d9',
                            background: hasFile ? 'transparent' : '#fafafa',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: hasFile ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          onMouseEnter={(e) => {
                            if (!hasFile) {
                              (e.currentTarget as HTMLElement).style.borderColor = '#667eea';
                              (e.currentTarget as HTMLElement).style.background = '#f0f0ff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!hasFile) {
                              (e.currentTarget as HTMLElement).style.borderColor = '#d9d9d9';
                              (e.currentTarget as HTMLElement).style.background = '#fafafa';
                            }
                          }}
                        >
                          {hasFile && preview ? (
                            <>
                              <img
                                src={preview}
                                alt={v.label}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                }}
                              />
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveMultiView(v.key);
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 3,
                                  right: 3,
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: 'rgba(0,0,0,0.5)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </div>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: 4 }}>
                              <PictureOutlined style={{ fontSize: 22, color: '#bbb' }} />
                              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{v.label}</div>
                              {v.required && <span style={{ color: '#ff4d4f', fontSize: 11 }}>（必填）</span>}
                              <div style={{ fontSize: 10, color: '#667eea', marginTop: 2 }}>点击上传</div>
                            </div>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: '2px 4px',
                            background: 'rgba(0,0,0,0.45)',
                            color: '#fff',
                            fontSize: 10,
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {v.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* 更多视角按钮 */}
                  <div style={{
                    marginTop: 6,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    alignItems: 'center',
                  }}>
                    <Button
                      size="small"
                      icon={<PictureOutlined />}
                      onClick={() => setExtraViewsModalVisible(true)}
                      style={{ fontSize: 12 }}
                    >
                      更多视角（{['top', 'bottom', 'left_front', 'right_front'].filter(k => multiViewFiles[k]).length}/4）
                    </Button>
                  </div>
                </>
              )}
              
              <div style={{ 
                marginTop: 6, 
                fontSize: 12, 
                color: '#52c41a',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span>✓</span>
                <span>{imageMode === 'multi' ? `${Object.values(multiViewFiles).filter(Boolean).length} 张图片已就绪，可以开始生成` : '图片已就绪，可以开始生成'}</span>
              </div>
            </div>
          )}

          {/* 开始按钮 */}
          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            disabled={imageMode === 'single' ? (!selectedFile || currentModelConfig?.disabled === true) : (!multiViewFiles.front || currentModelConfig?.disabled === true)}
            onClick={startGeneration}
            icon={
              currentModelConfig?.disabled === true
                ? <InfoCircleOutlined />
                : <PlayCircleOutlined />
            }
            style={{
              background: currentModelConfig?.disabled === true
                ? '#f0f0f0'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              height: 44,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {loading ? '🔄 生成中...' : 
             currentModelConfig?.disabled === true ? '🔜 即将开放' :
             '🚀 开始生成'}
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
        title="🖼️ 示例图片库"
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

      {/* 更多视角弹框 */}
      <Modal
        title="📐 更多视角图片上传"
        open={extraViewsModalVisible}
        onCancel={() => setExtraViewsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setExtraViewsModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={500}
        destroyOnClose
      >
        <div style={{
          fontSize: 13,
          color: '#666',
          marginBottom: 14,
          padding: '10px 12px',
          background: '#fff7e6',
          borderRadius: 6,
          borderLeft: '3px solid #faad14',
          lineHeight: 1.6,
        }}>
          上传更多视角图片可获得更精准的3D重建效果。
          <span style={{ color: '#ff4d4f' }}>以下视角仅专业版3.1支持</span>。
          选填，上传越多视图，模型细节越精确。
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}>
          {EXTRA_VIEWS.map(v => {
            const hasFile = !!multiViewFiles[v.key];
            const preview = multiViewPreviews[v.key];
            return (
              <div
                key={v.key}
                onClick={() => !hasFile && handleMultiViewUpload(v.key)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 8,
                  border: hasFile
                    ? '2px solid #667eea'
                    : '1.5px dashed #d9d9d9',
                  background: hasFile ? 'transparent' : '#fafafa',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: hasFile ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 100,
                }}
                onMouseEnter={(e) => {
                  if (!hasFile) {
                    (e.currentTarget as HTMLElement).style.borderColor = '#667eea';
                    (e.currentTarget as HTMLElement).style.background = '#f0f0ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!hasFile) {
                    (e.currentTarget as HTMLElement).style.borderColor = '#d9d9d9';
                    (e.currentTarget as HTMLElement).style.background = '#fafafa';
                  }
                }}
              >
                {hasFile && preview ? (
                  <>
                    <img
                      src={preview}
                      alt={v.label}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMultiView(v.key);
                      }}
                      style={{
                        position: 'absolute',
                        top: 3,
                        right: 3,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 4 }}>
                    <PictureOutlined style={{ fontSize: 22, color: '#bbb' }} />
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{v.label}</div>
                    <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>选填</div>
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '2px 4px',
                  background: 'rgba(0,0,0,0.45)',
                  color: '#fff',
                  fontSize: 10,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {v.label}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

// 样式定义
const styles: Record<string, React.CSSProperties> & Record<string, any> = {
  mainLayout: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 120px)',
    gap: 8,
  },
  
  // 额度信息栏
  quotaBar: {
    background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    borderRadius: 8,
    padding: '12px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quotaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  quotaStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  quotaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  quotaLabel: {
    fontSize: 13,
    color: '#666',
  },
  quotaValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#333',
  },
  
  topModesBar: {
    background: 'white',
    borderRadius: 8,
    padding: '6px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    flexShrink: 0,
  },
  modesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
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
    minHeight: 80,
  },
  modeChipLocked: {
    opacity: 0.6,
    cursor: 'not-allowed',
    background: '#f5f5f5',
  },
  modeChipDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#fafafa',
    border: '1px dashed #d9d9d9',
  },
  disabledBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: '2px 8px',
    background: '#f0f0f0',
    color: '#999',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  lockIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 16,
    color: '#ff4d4f',
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
    gap: 6,
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
    fontSize: 13,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  modeChipDesc: {
    fontSize: 11,
    color: '#666',
    lineHeight: 1.4,
  },
  modeChipFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    paddingTop: 4,
  },
  modeChipBadges: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  contentArea: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '400px 1fr',
    gap: 8,
    overflow: 'hidden',
  },
  leftPanel: {
    background: 'white',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
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

export default ProfessionalGenerationPage;
