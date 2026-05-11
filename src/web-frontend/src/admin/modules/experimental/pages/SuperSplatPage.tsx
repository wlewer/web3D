/**
 * SuperSplat 编辑器
 * 内嵌 backend/static/supersplat/index.html
 */

import React, { useEffect, useRef, useState } from 'react';
import { Spin, Alert } from 'antd';

// 语言文字
function getLocaleText() {
  const locale = localStorage.getItem('editor_locale') || 'zh-CN';
  const isZH = locale !== 'en-US';
  return {
    loading: isZH ? '正在加载 SuperSplat 编辑器...' : 'Loading SuperSplat Editor...',
    loadErrorTitle: isZH ? '加载错误' : 'Load Error',
    loadError: isZH
      ? '编辑器加载失败，请确保后端服务运行在 http://localhost:8000'
      : 'Editor failed to load, please ensure backend is running at http://localhost:8000',
  };
}

export const SuperSplatPage: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const T = getLocaleText();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    
    // 构建带token的URL（如果需要认证）
    const editorUrl = `/app/supersplat/index.html${token ? `?token=${token}` : ''}`;
    
    if (iframeRef.current) {
      iframeRef.current.src = editorUrl;
    }
  }, []);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(T.loadError);
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
          <Spin size="large" tip={T.loading} />
        </div>
      )}
      
      {error && (
        <Alert
          message={T.loadErrorTitle}
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
        title="SuperSplat Editor"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
};

export default SuperSplatPage;
