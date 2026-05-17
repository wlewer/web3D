/**
 * 视频区块插件 - VideoBlockPlugin
 * Video block supporting local, YouTube, and Bilibili embeds
 */
import React from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Helpers =====

type VideoType = 'local' | 'youtube' | 'bilibili';

/** Extract YouTube video ID from various URL formats */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Extract Bilibili video ID (bvid) from URL */
function getBilibiliId(url: string): string | null {
  const match = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// ===== Renderer =====

interface VideoBlockRendererProps {
  src?: string;
  type?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  [key: string]: unknown;
}

const VideoBlockRenderer: React.FC<VideoBlockRendererProps> = ({
  src = '',
  type = 'local',
  autoplay = false,
  controls = true,
  loop = false,
  ...rest
}) => {
  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set(['width', 'height', 'maxWidth', 'borderRadius']);

  for (const [key, value] of Object.entries(rest)) {
    if (styleKeys.has(key)) {
      styleFromProps[key] = value;
    } else {
      passThrough[key] = value;
    }
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    position: 'relative',
    paddingBottom: '56.25%', // 16:9
    backgroundColor: '#000',
    borderRadius: '0',
    overflow: 'hidden',
    ...styleFromProps,
  };

  const iframeStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  };

  if (!src) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.04)',
          border: '1px dashed rgba(0,0,0,0.15)',
          borderRadius: 4,
          color: 'rgba(0,0,0,0.25)',
          fontSize: 14,
          ...styleFromProps,
        }}
      >
        [视频区块 - 请设置视频地址]
      </div>
    );
  }

  const videoType = type as VideoType;

  // YouTube embed
  if (videoType === 'youtube') {
    const videoId = getYouTubeId(src);
    if (!videoId) {
      return (
        <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', paddingBottom: 0, minHeight: 100 }}>
          无效的YouTube链接
        </div>
      );
    }
    return (
      <div style={containerStyle}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&loop=${loop ? 1 : 0}`}
          style={iframeStyle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          {...passThrough}
        />
      </div>
    );
  }

  // Bilibili embed
  if (videoType === 'bilibili') {
    const bvid = getBilibiliId(src);
    if (!bvid) {
      return (
        <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d4f', paddingBottom: 0, minHeight: 100 }}>
          无效的Bilibili链接
        </div>
      );
    }
    return (
      <div style={containerStyle}>
        <iframe
          src={`https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=${autoplay ? 1 : 0}`}
          style={iframeStyle}
          allowFullScreen
          {...passThrough}
        />
      </div>
    );
  }

  // Local video
  return (
    <div style={containerStyle}>
      <video
        src={src}
        autoPlay={autoplay}
        controls={controls}
        loop={loop}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        {...passThrough}
      />
    </div>
  );
};

// ===== Plugin Definition =====

export const VideoBlockPlugin: IComponentPlugin = {
  id: 'builtin.video-block',
  name: '视频',
  category: ComponentCategory.BASIC_UI,
  version: '1.0.0',
  icon: '🎬',
  description: '视频区块，支持本地视频/YouTube/Bilibili嵌入',

  renderer: VideoBlockRenderer as React.FC<Record<string, unknown>>,

  defaultConfig: {
    src: '',
    type: 'local',
    autoplay: false,
    controls: true,
    loop: false,
  },

  defaultStyles: {
    width: '100%',
  },
};

export default VideoBlockPlugin;
