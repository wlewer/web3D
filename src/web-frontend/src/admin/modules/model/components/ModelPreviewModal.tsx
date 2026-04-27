/**
 * 3D模型预览弹窗组件
 * 支持GLB/GLTF格式的3D模型预览
 */

import React from 'react';
import { Modal, Tag } from 'antd';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface GLBModelProps {
  modelUrl: string;
}

// GLB模型加载组件
function GLBModel({ modelUrl }: GLBModelProps) {
  try {
    const { scene } = useGLTF(modelUrl);
    
    return (
      <primitive 
        object={scene} 
        scale={1}
        position={[0, 0, 0]}
      />
    );
  } catch (error) {
    console.error('加载GLB模型失败:', error);
    return null;
  }
}

interface ModelPreviewModalProps {
  visible: boolean;
  model: any;
  onClose: () => void;
}

export const ModelPreviewModal: React.FC<ModelPreviewModalProps> = ({
  visible,
  model,
  onClose,
}) => {
  if (!model) return null;

  // 判断是否是GLB/GLTF格式
  const is3DModel = ['glb', 'gltf'].includes(model.format?.toLowerCase());
  
  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>🎨 3D模型预览</span>
          <Tag color="blue">{model.format?.toUpperCase()}</Tag>
          {model.status === 'approved' && <Tag color="green">已审核</Tag>}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <strong>模型名称：</strong>{model.name}
          </div>
          <div>
            <strong>文件大小：</strong>{formatFileSize(model.fileSize)}
          </div>
          <div>
            <strong>分类：</strong>{model.category === 'other' ? '其他' : model.category}
          </div>
          <div>
            <strong>创建时间：</strong>{new Date(model.createdAt).toLocaleString('zh-CN')}
          </div>
        </div>
        
        {model.description && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <strong>描述：</strong>{model.description}
          </div>
        )}
      </div>

      {/* 3D预览区域 */}
      {is3DModel ? (
        <div style={{ 
          width: '100%', 
          height: 500, 
          background: '#1a1a2e',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} />
            
            <GLBModel modelUrl={model.modelUrl} />
            
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              minDistance={1}
              maxDistance={100}
              enableZoom
              enablePan
              autoRotate
              autoRotateSpeed={1}
            />
            
            <Environment preset="city" />
          </Canvas>
          
          <div style={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 10,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 4,
            fontSize: 12
          }}>
            🖱️ 拖拽旋转 · 滚轮缩放 · 右键平移
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          height: 500,
          background: '#f5f5f5',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ fontSize: 64 }}>📦</div>
          <div style={{ fontSize: 16, color: '#666' }}>
            {model.format?.toUpperCase()} 格式暂不支持在线预览
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            支持预览的格式：GLB, GLTF
          </div>
        </div>
      )}
    </Modal>
  );
};
