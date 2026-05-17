/**
 * 模型卡片网格插件 - ModelCardGridPlugin
 * CSS Grid layout for displaying multiple model thumbnail cards
 */
import React from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Types =====

interface ModelCard {
  id: string;
  title: string;
  category?: string;
  thumbnailUrl?: string;
  modelUrl?: string;
}

// ===== Sub-components =====

const ModelCardItem: React.FC<{
  card: ModelCard;
  showTitle: boolean;
  showCategory: boolean;
}> = ({ card, showTitle, showCategory }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    {/* Thumbnail area */}
    <div
      style={{
        width: '100%',
        aspectRatio: '1',
        background: card.thumbnailUrl
          ? `url(${card.thumbnailUrl}) center/cover`
          : 'rgba(255,255,255,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 32,
      }}
    >
      {!card.thumbnailUrl && '🎯'}
    </div>

    {/* Info area */}
    {(showTitle || showCategory) && (
      <div style={{ padding: '8px 12px' }}>
        {showTitle && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.85)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {card.title || '未命名模型'}
          </div>
        )}
        {showCategory && card.category && (
          <div
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              marginTop: 2,
            }}
          >
            {card.category}
          </div>
        )}
      </div>
    )}
  </div>
);

// ===== Renderer =====

interface ModelCardGridRendererProps {
  columns?: number;
  gap?: string;
  modelIds?: string[];
  showTitle?: boolean;
  showCategory?: boolean;
  [key: string]: unknown;
}

const ModelCardGridRenderer: React.FC<ModelCardGridRendererProps> = ({
  columns = 3,
  gap = '16px',
  modelIds = [],
  showTitle = true,
  showCategory = true,
  ...rest
}) => {
  const styleFromProps: Record<string, unknown> = {};
  const passThrough: Record<string, unknown> = {};
  const styleKeys = new Set(['maxWidth', 'padding']);

  for (const [key, value] of Object.entries(rest)) {
    if (styleKeys.has(key)) {
      styleFromProps[key] = value;
    } else {
      passThrough[key] = value;
    }
  }

  // Convert modelIds to placeholder cards for rendering
  const cards: ModelCard[] = modelIds.length > 0
    ? modelIds.map((id, index) => ({
        id: String(id),
        title: `模型 ${index + 1}`,
        category: '未分类',
      }))
    : [];

  // Empty state
  if (cards.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          padding: '48px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: 8,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 14,
          ...styleFromProps,
        }}
      >
        [模型卡片网格 - 请添加模型]
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        width: '100%',
        ...styleFromProps,
      }}
      {...passThrough}
    >
      {cards.map((card) => (
        <ModelCardItem
          key={card.id}
          card={card}
          showTitle={showTitle}
          showCategory={showCategory}
        />
      ))}
    </div>
  );
};

// ===== Plugin Definition =====

export const ModelCardGridPlugin: IComponentPlugin = {
  id: 'builtin.model-card-grid',
  name: '模型卡片网格',
  category: ComponentCategory.THREE_D_BUSINESS,
  version: '1.0.0',
  icon: '🗂️',
  description: 'CSS Grid展示多个3D模型缩略图卡片',

  renderer: ModelCardGridRenderer as React.FC<Record<string, unknown>>,

  allowChildren: false,

  defaultConfig: {
    columns: 3,
    gap: '16px',
    modelIds: [],
    showTitle: true,
    showCategory: true,
  },

  defaultStyles: {
    width: '100%',
  },
};

export default ModelCardGridPlugin;
