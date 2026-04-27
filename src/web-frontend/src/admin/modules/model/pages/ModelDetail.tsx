/**
 * 模型管理 - 模型详情页（集成 Spark Viewer 3D 预览）
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  message,
  Statistic,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  BoxPlotOutlined,
  FileImageOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { SparkViewer } from '@/components/3d/Spark/SparkViewer';
import type { IModel, ModelStatus, ModelCategory } from '../types';
import { modelApi } from '../api';

// 状态映射
const statusMap: Record<ModelStatus, { color: string; text: string }> = {
  pending: { color: 'gold', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已驳回' },
  archived: { color: 'default', text: '已归档' },
};

// 分类映射
const categoryMap: Record<ModelCategory, string> = {
  character: '角色',
  scene: '场景',
  prop: '道具',
  vehicle: '载具',
  other: '其他',
};

// 格式映射
const formatMap: Record<string, string> = {
  glb: 'GLB',
  gltf: 'GLTF',
  fbx: 'FBX',
  obj: 'OBJ',
  ply: 'PLY',
  splat: 'Splat (3DGS)',
};

export const ModelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<IModel | null>(null);

  useEffect(() => {
    if (!id) {
      message.error('模型 ID 不能为空');
      navigate('/admin/models');
      return;
    }

    // 获取模型详情
    modelApi.getById(id)
      .then((response) => {
        setModel(response.data);
      })
      .catch(() => {
        message.error('获取模型信息失败');
        navigate('/admin/models');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, navigate]);

  // 删除模型
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await modelApi.delete(id);
      message.success('删除成功');
      navigate('/admin/models');
    } catch {
      message.error('删除失败');
    }
  };

  // 下载模型
  const handleDownload = () => {
    if (!model) return;
    
    const link = document.createElement('a');
    link.href = model.modelUrl;
    link.download = `${model.name}.${model.format}`;
    link.click();
    message.success('开始下载');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!model) {
    return (
      <Card>
        <p>模型不存在</p>
        <Button onClick={() => navigate('/admin/models')}>返回列表</Button>
      </Card>
    );
  }

  const statusInfo = statusMap[model.status];
  const fileSizeMB = (model.fileSize / (1024 * 1024)).toFixed(2);

  return (
    <div>
      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/models')}>
            返回
          </Button>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/admin/models/edit/${id}`)}>
            编辑
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            下载
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
            删除
          </Button>
        </Space>
      </Card>

      <Row gutter={16}>
        {/* 左侧：3D 预览 */}
        <Col span={16}>
          <Card title="3D 预览" bordered={false}>
            <div style={{ height: 600, background: '#000', borderRadius: 8, overflow: 'hidden' }}>
              {model.format === 'splat' || model.format === 'ply' ? (
                <SparkViewer
                  splatUrl={model.modelUrl}
                  autoRotate={false}
                  enableControls={true}
                  showStats={true}
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 16,
                  }}
                >
                  <p>该格式暂不支持 3D 预览（仅支持 Splat/PLY 格式）</p>
                </div>
              )}
            </div>
          </Card>
        </Col>

        {/* 右侧：详细信息 */}
        <Col span={8}>
          <Card title="模型信息" bordered={false} style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="名称">{model.name}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag>{categoryMap[model.category]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="格式">
                <Tag>{formatMap[model.format] || model.format}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="文件大小">
                <Space>
                  <DatabaseOutlined />
                  {fileSizeMB} MB
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="面数">
                <Space>
                  <BoxPlotOutlined />
                  {model.polygonCount?.toLocaleString() || '-'}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="贴图数量">
                <Space>
                  <FileImageOutlined />
                  {model.textureCount || '-'}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="描述" bordered={false} style={{ marginBottom: 16 }}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {model.description || '暂无描述'}
            </p>
          </Card>

          <Card title="标签" bordered={false} style={{ marginBottom: 16 }}>
            <Space wrap>
              {model.tags && model.tags.length > 0 ? (
                model.tags.map((tag, index) => (
                  <Tag key={index}>{tag}</Tag>
                ))
              ) : (
                <span style={{ color: '#999' }}>暂无标签</span>
              )}
            </Space>
          </Card>

          <Card title="元数据" bordered={false}>
            <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
              {JSON.stringify(model.metadata || {}, null, 2)}
            </pre>
          </Card>
        </Col>
      </Row>

      {/* 底部：审核信息 */}
      {(model.reviewedBy || model.rejectionReason) && (
        <Card title="审核信息" style={{ marginTop: 16 }}>
          <Descriptions column={2}>
            <Descriptions.Item label="审核者">
              {model.reviewedBy || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="审核时间">
              {model.reviewedAt || '-'}
            </Descriptions.Item>
            {model.rejectionReason && (
              <Descriptions.Item label="驳回原因" span={2}>
                <span style={{ color: '#ff4d4f' }}>{model.rejectionReason}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* 时间信息 */}
      <Card style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic title="创建者" value={model.createdBy} />
          </Col>
          <Col span={8}>
            <Statistic
              title="创建时间"
              value={new Date(model.createdAt).toLocaleString('zh-CN')}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="更新时间"
              value={new Date(model.updatedAt).toLocaleString('zh-CN')}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ModelDetail;
