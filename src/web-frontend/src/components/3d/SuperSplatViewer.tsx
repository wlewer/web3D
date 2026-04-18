// SuperSplat Viewer 组件 - 基于 PlayCanvas
import { useEffect, useRef } from 'react';
import './SuperSplatViewer.css';

interface SuperSplatViewerProps {
  /** 场景文件URL (.ply, .splat, .sog格式) */
  sceneUrl?: string;
  /** 设置文件URL */
  settingsUrl?: string;
  /** 天空盒图片URL */
  skyboxUrl?: string;
  /** 加载时显示的海报图片 */
  posterUrl?: string;
  /** 隐藏UI界面 */
  hideUI?: boolean;
  /** 启动时暂停动画 */
  pauseAnim?: boolean;
  /** 显示性能统计 */
  showStats?: boolean;
  /** 类名 */
  className?: string;
}

// SuperSplat Viewer CDN资源
const SUPERSPLAT_CDN = {
  css: 'https://cdn.jsdelivr.net/npm/@playcanvas/supersplat-viewer@1.19.1/dist/style.css',
  js: 'https://cdn.jsdelivr.net/npm/@playcanvas/supersplat-viewer@1.19.1/dist/index.js',
};

export function SuperSplatViewer({
  sceneUrl,
  settingsUrl,
  skyboxUrl,
  posterUrl,
  hideUI = false,
  pauseAnim = false,
  showStats = false,
  className = '',
}: SuperSplatViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // 动态加载SuperSplat Viewer CSS
    const loadCSS = () => {
      if (!document.querySelector(`link[href="${SUPERSPLAT_CDN.css}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = SUPERSPLAT_CDN.css;
        document.head.appendChild(link);
      }
    };

    // 动态加载SuperSplat Viewer脚本
    const loadScript = () => {
      return new Promise<void>((resolve) => {
        if ((window as any).SuperSplatViewer) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = SUPERSPLAT_CDN.js;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    // 构建查询参数
    const buildParams = () => {
      const params = new URLSearchParams();
      if (sceneUrl) params.set('content', sceneUrl);
      if (settingsUrl) params.set('settings', settingsUrl);
      if (skyboxUrl) params.set('skybox', skyboxUrl);
      if (posterUrl) params.set('poster', posterUrl);
      if (hideUI) params.set('noui', 'true');
      if (pauseAnim) params.set('noanim', 'true');
      if (showStats) params.set('ministats', 'true');
      return params.toString();
    };

    const initViewer = async () => {
      loadCSS();
      await loadScript();
      
      if (!containerRef.current) return;

      // 清理之前的iframe
      containerRef.current.innerHTML = '';

      // 创建iframe
      const iframe = document.createElement('iframe');
      iframe.src = `https://superspl.at/embed?${buildParams()}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allow = 'xr-spatial-tracking';
      
      containerRef.current.appendChild(iframe);
      iframeRef.current = iframe;
    };

    initViewer();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [sceneUrl, settingsUrl, skyboxUrl, posterUrl, hideUI, pauseAnim, showStats]);

  return (
    <div className={`supersplat-viewer-container ${className}`}>
      <div ref={containerRef} className="supersplat-viewer-content" />
    </div>
  );
}

// 预设场景数据
export const SUPER_SPLAT_SCENES = [
  {
    id: 'butterfly',
    name: '🦋 Blue Morpho Butterfly',
    description: 'Natural specimen - 蝴蝶标本',
    sceneUrl: 'https://sparkjs.dev/assets/splats/butterfly.spz',
    color: '#667eea',
  },
  {
    id: 'cat',
    name: '🐱 Cute Cat',
    description: 'Real-world object - 可爱猫咪',
    sceneUrl: 'https://sparkjs.dev/assets/splats/cat.spz',
    color: '#f97316',
  },
  {
    id: 'robot',
    name: '🤖 Robot Head',
    description: 'Sci-fi object - 科技机器人',
    sceneUrl: 'https://sparkjs.dev/assets/splats/robot-head.spz',
    color: '#06b6d4',
  },
  {
    id: 'penguin',
    name: '🐧 Adélie Penguin',
    description: 'Wildlife specimen - 企鹅标本',
    sceneUrl: 'https://sparkjs.dev/assets/splats/penguin.spz',
    color: '#1e293b',
  },
];
