/**
 * 3D轮播Hero插件 - Hero3DCarouselPlugin
 * Full-width hero section with background gradient and model carousel
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { IComponentPlugin } from '../../types/plugin';
import { ComponentCategory } from '../../types/plugin';

// ===== Renderer =====

interface Hero3DCarouselRendererProps {
  title?: string;
  subtitle?: string;
  modelIds?: string[];
  autoPlay?: boolean;
  interval?: number;
  [key: string]: unknown;
}

const Hero3DCarouselRenderer: React.FC<Hero3DCarouselRendererProps> = ({
  title = '3D展示',
  subtitle = '描述文字',
  modelIds = [],
  autoPlay = true,
  interval = 5000,
  ...rest
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const totalSlides = Math.max(modelIds.length, 1);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto play
  useEffect(() => {
    if (!autoPlay || modelIds.length <= 1) return;
    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, modelIds.length, goToNext]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: 400,
        position: 'relative',
        background: 'linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #0d0d3d 100%)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...rest}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% 50%, rgba(22,119,255,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Content area */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          padding: '48px 24px',
          maxWidth: 800,
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#fff',
            margin: 0,
            lineHeight: 1.2,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.7)',
            margin: '16px 0 32px',
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>

        {/* Carousel area - model placeholder */}
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            height: 250,
            margin: '0 auto',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {modelIds.length > 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              模型 {activeIndex + 1} / {modelIds.length}
              <br />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                ID: {modelIds[activeIndex]}
              </span>
            </div>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
              [请添加3D模型]
            </span>
          )}

          {/* Navigation arrows */}
          {modelIds.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.4)',
                  border: 'none',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ‹
              </button>
              <button
                onClick={goToNext}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.4)',
                  border: 'none',
                  color: '#fff',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Dots indicator */}
        {modelIds.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            {modelIds.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                style={{
                  width: idx === activeIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: idx === activeIndex ? '#1677ff' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Plugin Definition =====

export const Hero3DCarouselPlugin: IComponentPlugin = {
  id: 'builtin.hero-3d-carousel',
  name: '3D轮播Hero',
  category: ComponentCategory.MARKETING,
  version: '1.0.0',
  icon: '🎠',
  description: '全宽Hero区域，背景渐变 + 3D模型轮播展示',

  renderer: Hero3DCarouselRenderer as React.FC<Record<string, unknown>>,

  defaultConfig: {
    title: '3D展示',
    subtitle: '描述文字',
    modelIds: [],
    autoPlay: true,
    interval: 5000,
  },

  defaultStyles: {
    width: '100%',
    minHeight: '400px',
  },
};

export default Hero3DCarouselPlugin;
