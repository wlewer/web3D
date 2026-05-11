/**
 * GalleryCard - 画廊卡片组件
 * 
 * 专为画廊设计的3D卡片组件
 * 
 * 特点：
 * - 基于Simple3DViewer
 * - 包含标题、描述等元信息
 * - 悬停效果
 * - 响应式布局
 * - 适合网格展示
 * 
 * @version 1.0.0
 * @author Lingma AI Assistant
 * @date 2026-04-18
 */

import { Simple3DViewer } from './Simple3DViewer';
import './GalleryCard.css';

// ==================== 类型定义 ====================

export interface GalleryCardProps {
  id: string;
  title: string;
  description?: string;
  modelUrl: string;
  thumbnail?: string;  // 预留字段，未来可能用于静态缩略图
  tags?: string[];
  onClick?: (id: string) => void;
  className?: string;
}

// ==================== 主组件 ====================

/**
 * 画廊卡片组件
 * 
 * 适用场景：
 * - 画廊页面
 * - 模型展示列表
 * - 作品集合
 */
export function GalleryCard({
  id,
  title,
  description,
  modelUrl,
  tags = [],
  onClick,
  className = ''
}: GalleryCardProps) {
  const handleClick = () => {
    onClick?.(id);
  };

  return (
    <div className={`gallery-card ${className}`}>
      {/* 3D预览区域 */}
      <div className="gallery-card-preview">
        <Simple3DViewer
          modelUrl={modelUrl}
          enableControls={false}
          autoRotate={true}
          onClick={handleClick}
        />
        
        {/* 悬停遮罩 */}
        <div className="gallery-card-overlay">
          <div className="gallery-card-overlay-text">
            点击查看详情
          </div>
        </div>
      </div>
      
      {/* 卡片信息 */}
      <div className="gallery-card-info">
        <h3 className="gallery-card-title">{title}</h3>
        
        {description && (
          <p className="gallery-card-description">{description}</p>
        )}
        
        {/* 标签 */}
        {tags.length > 0 && (
          <div className="gallery-card-tags">
            {tags.map((tag, index) => (
              <span key={index} className="gallery-card-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 导出 ====================

export default GalleryCard;
