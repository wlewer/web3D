/**
 * 3D模型预览弹窗组件（多格式支持）
 * 支持 GLB/GLTF/PLY/SPZ/Splat 等多格式3D模型预览
 * 参考首页模型作品预览弹框效果
 */
import React from 'react';
import { Modal, Tag, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { UniversalGaussianCardV2 } from '@/components/3d/UniversalGaussianCardV2';

// 将后端文件路径转换为浏览器可访问的URL
// 后端model_url存储的是本地路径如 "uploads/generation/xxx/model.glb"
// 需要转换为 "/generation-models/xxx/model.glb"（后端在该路径挂载了静态文件）
const resolveModelUrl = (url?: string): string => {
  if (!url) return '';
  // 本地路径转换：uploads/generation/xxx -> /generation-models/xxx
  if (url.startsWith('uploads/generation/')) {
    return '/generation-models/' + url.slice('uploads/generation/'.length);
  }
  // 本地路径转换：uploads/xxx -> /api/uploads/xxx
  if (url.startsWith('uploads/')) {
    return '/' + url;
  }
  // 已经是完整URL或绝对路径
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return '/' + url;
};

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

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const modelUrl = resolveModelUrl(model.modelUrl);
  const format = (model.format || '').toLowerCase();
  // 支持的格式列表
  const supportedFormats = ['glb', 'gltf', 'ply', 'splat', 'spz', 'stl', 'obj'];
  const isSupported = supportedFormats.includes(format);

  // 下载模型
  const handleDownload = () => {
    if (modelUrl) {
      const a = document.createElement('a');
      a.href = modelUrl;
      a.download = model.name || 'model';
      a.click();
      message.success('开始下载');
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>🎨 3D模型预览</span>
          <Tag color="blue">{model.format?.toUpperCase() || '未知'}</Tag>
          {model.status === 'approved' && <Tag color="green">已审核</Tag>}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={960}
      footer={
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload} disabled={!modelUrl}>
          下载模型
        </Button>
      }
      destroyOnClose
    >
      {/* 模型信息 */}
      <div
        style={{
          marginBottom: 16,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px 16px',
          fontSize: 13,
        }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <div
          style={{
            marginBottom: 16,
            padding: '8px 12px',
            background: '#f5f5f5',
            borderRadius: 4,
            fontSize: 13,
          }}
        >
          <strong>描述：</strong>{model.description}
        </div>
      )}

      {/* 3D预览区域 - 使用 UniversalGaussianCardV2 实现多格式渲染 */}
      {modelUrl && isSupported ? (
        <div
          style={{
            width: '100%',
            height: 480,
            background: '#1a1a2e',
            borderRadius: 8,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <UniversalGaussianCardV2
            modelUrl={modelUrl}
            layout="grid"
            autoRotate={true}
            autoCenter={true}
          />
          {/* 操作提示 */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 4,
              fontSize: 12,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            🖱️ 拖拽旋转 · 滚轮缩放 · 右键平移
          </div>
        </div>
      ) : modelUrl ? (
        // 暂不支持的格式
        <div
          style={{
            width: '100%',
            height: 480,
            background: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 64 }}>📦</div>
          <div style={{ fontSize: 16, color: '#666' }}>
            {model.format?.toUpperCase()} 格式暂不支持在线预览
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            支持预览的格式：GLB, GLTF, PLY, SPZ
          </div>
        </div>
      ) : (
        // 无有效URL
        <div
          style={{
            width: '100%',
            height: 480,
            background: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 64 }}>❌</div>
          <div style={{ fontSize: 16, color: '#666' }}>模型文件地址无效</div>
        </div>
      )}
    </Modal>
  );
};

export default ModelPreviewModal;
