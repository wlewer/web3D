/**
 * 首页底部入口按钮组 - 内置模板组件
 * HomeButtons - Built-in template component for homepage entry buttons
 */
import React from 'react';
import type { TemplateComponentProps } from '../../../types/template';

export const HomeButtons: React.FC<TemplateComponentProps> = ({ config, context }) => {
  const props = (config.props || {}) as Record<string, unknown>;
  const buttons = (props.buttons as Array<{ label: string; route: string; icon?: string }>) || [];

  // 从 context 获取导航函数（由 templateScope 提供）
  const navigate = (route: string) => {
    // 尝试通过 window.location 或自定义事件导航
    window.history.pushState({}, '', route);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        padding: '1rem 2rem',
        flexWrap: 'wrap',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {buttons.length === 0 ? (
        <>
          <HomeButton icon="🏭" label="3D 车间" onClick={() => navigate('/workshop')} />
          <HomeButton icon="🖼️" label="模型画廊" onClick={() => navigate('/gallery')} />
          <HomeButton icon="📤" label="上传模型" onClick={() => navigate('/upload')} />
        </>
      ) : (
        buttons.map((btn, i) => (
          <HomeButton
            key={i}
            icon={btn.icon || '🔗'}
            label={btn.label}
            onClick={() => navigate(btn.route)}
          />
        ))
      )}
    </div>
  );
};

function HomeButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 8,
        color: 'white',
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default HomeButtons;
