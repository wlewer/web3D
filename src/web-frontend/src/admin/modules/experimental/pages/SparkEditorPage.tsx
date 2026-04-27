/**
 * Spark 3D编辑器
 * 内嵌 backend/static/spark-editor/index.html
 */

import React, { useEffect, useRef, useState } from 'react';
import { Spin, Alert } from 'antd';

export const SparkEditorPage: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    // 构建带token的URL（如果需要认证）
    const editorUrl = `/app/spark-editor/index.html${token ? `?token=${token}` : ''}`;
    
    if (iframeRef.current) {
      iframeRef.current.src = editorUrl;
    }
  }, []);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('编辑器加载失败，请确保后端服务运行在 http://localhost:8000');
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', position: 'relative' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.9)',
            zIndex: 10,
          }}
        >
          <Spin size="large" tip="正在加载 Spark 编辑器..." />
        </div>
      )}
      
      {error && (
        <Alert
          message="加载错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <iframe
        ref={iframeRef}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: error ? 'none' : 'block',
        }}
        title="Spark 3D Editor"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
};

export default SparkEditorPage;
