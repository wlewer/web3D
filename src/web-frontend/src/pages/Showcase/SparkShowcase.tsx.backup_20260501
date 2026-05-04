// Spark.js 官方示例展示页 - 画廊布局
import { useState, useRef } from 'react';
import { useTranslation } from '../../i18n';
import { SparkExampleCard3D } from '../../components/SparkExampleCard3D';
import { SAM3DCard } from '../../components/3d';
import { LeftOutlined, RightOutlined, AppstoreOutlined, StarOutlined, RocketOutlined, ToolOutlined } from '@ant-design/icons';
import './SparkShowcase.css';

// 示例数据
const EXAMPLES = [
  {
    id: 'sam-3d',
    title: 'SAM 3D Objects',
    titleZh: 'Meta图像转3D',
    description: 'Meta开源！单张图片生成3D Gaussian Splatting模型',
    descriptionZh: 'Meta open source! Single image to 3D Gaussian Splatting model',
    thumbnail: 'https://raw.githubusercontent.com/facebookresearch/sam-3d-objects/main/doc/kidsroom_transparent.gif',
    tags: ['Meta AI', '图像转3D'],
    difficulty: 'hard',
    link: 'https://github.com/facebookresearch/sam-3d-objects',
    isExternal: true
  },
  {
    id: 'hello-world',
    title: 'Hello World',
    titleZh: '入门示例',
    description: '最简单的 3DGS 加载示例，展示如何加载蝴蝶模型',
    descriptionZh: 'The simplest 3DGS loading example, showing how to load a butterfly model',
    thumbnail: '🦋',
    tags: ['Beginner', '基础'],
    difficulty: 'easy',
    link: 'https://sparkjs.dev/examples/#hello-world'
  },
  {
    id: 'interactivity',
    title: 'Interactivity',
    titleZh: '交互演示',
    description: '餐饮3D展示系统，点击菜单切换不同食物模型',
    descriptionZh: 'Interactive 3D food display system with menu navigation',
    thumbnail: '🍽️',
    tags: ['Interactive', '交互'],
    difficulty: 'medium',
    link: 'https://sparkjs.dev/examples/#interactivity'
  },
  {
    id: 'multiple-splats',
    title: 'Multiple Splats',
    titleZh: '多模型展示',
    description: '同时渲染多个3D模型，蝴蝶群与猫咪模型',
    descriptionZh: 'Render multiple 3D models simultaneously, butterflies and cat',
    thumbnail: '🐱',
    tags: ['Advanced', '高级'],
    difficulty: 'medium',
    link: 'https://sparkjs.dev/examples/#multiple-splats'
  },
  {
    id: 'procedural-splats',
    title: 'Procedural Splats',
    titleZh: '程序化生成',
    description: '程序生成3D内容，分形金字塔、星空、文字转3D',
    descriptionZh: 'Procedurally generate 3D content, fractal pyramids, stars, text to 3D',
    thumbnail: '✨',
    tags: ['Advanced', '高级'],
    difficulty: 'hard',
    link: 'https://sparkjs.dev/examples/#procedural-splats'
  },
  {
    id: 'raycasting',
    title: 'Raycasting',
    titleZh: '射线检测',
    description: '鼠标点击3D对象，实现交互式点击变色效果',
    descriptionZh: 'Click on 3D objects for interactive color change effects',
    thumbnail: '🤖',
    tags: ['Interactive', '交互'],
    difficulty: 'medium',
    link: 'https://sparkjs.dev/examples/#raycasting'
  },
  {
    id: 'particle-animation',
    title: 'Particle Animation',
    titleZh: '粒子动画',
    description: '动态云朵粒子系统，支持风速、密度等参数调节',
    descriptionZh: 'Dynamic cloud particle system with adjustable parameters',
    thumbnail: '☁️',
    tags: ['Animation', '动画'],
    difficulty: 'hard',
    link: 'https://sparkjs.dev/examples/#particle-animation'
  },
  {
    id: 'splat-reveal-effects',
    title: 'Splat Reveal Effects',
    titleZh: '揭示效果',
    description: '5种神奇的3D揭示动画：魔法、展开、旋涡、雨水',
    descriptionZh: '5 magical 3D reveal animations: Magic, Spread, Unroll, Twister, Rain',
    thumbnail: '🎩',
    tags: ['Effects', '特效'],
    difficulty: 'hard',
    link: 'https://sparkjs.dev/examples/#splat-reveal-effects'
  },
  {
    id: 'splat-shader-effects',
    title: 'Splat Shader Effects',
    titleZh: '着色器效果',
    description: 'GLSL着色器效果：电子、冥想、波浪、分解、耀斑',
    descriptionZh: 'GLSL shader effects: Electronic, Meditation, Waves, Disintegrate, Flare',
    thumbnail: '🎨',
    tags: ['Effects', '特效'],
    difficulty: 'hard',
    link: 'https://sparkjs.dev/examples/#splat-shader-effects'
  },
  {
    id: 'splat-transitions',
    title: 'Splat Transitions',
    titleZh: '模型过渡',
    description: '4种平滑的3D模型过渡动画效果',
    descriptionZh: '4 smooth 3D model transition animation effects',
    thumbnail: '🔄',
    tags: ['Animation', '动画'],
    difficulty: 'hard',
    link: 'https://sparkjs.dev/examples/#splat-transitions'
  },
  {
    id: 'sogs',
    title: 'SOGS Compression',
    titleZh: 'SOGS压缩',
    description: 'SOGS压缩格式演示，高精度3D场景渲染',
    descriptionZh: 'SOGS compression format demo, high-precision 3D scene rendering',
    thumbnail: '🏔️',
    tags: ['Advanced', '高级'],
    difficulty: 'medium',
    link: 'https://sparkjs.dev/examples/#sogs'
  },
  {
    id: 'glsl',
    title: 'GLSL Shaders',
    titleZh: 'GLSL着色器',
    description: '自定义GLSL着色器，实时修改3D模型外观',
    descriptionZh: 'Custom GLSL shaders, real-time modification of 3D model appearance',
    thumbnail: '🔮',
    tags: ['Advanced', '高级'],
    difficulty: 'hard',
    link: 'https://sparkjs.dev/examples/#glsl'
  },
  {
    id: 'editor',
    title: '3D Editor',
    titleZh: '3D编辑器',
    description: '功能完整的在线3DGS编辑器，支持拖拽上传文件',
    descriptionZh: 'Full-featured online 3DGS editor, supports drag and drop file upload',
    thumbnail: '🛠️',
    tags: ['Tools', '工具'],
    difficulty: 'easy',
    link: 'https://sparkjs.dev/examples/#editor'
  },
  {
    id: 'extsplats',
    title: 'ExtSplats Precision',
    titleZh: '高精度扩展',
    description: '展示ExtSplats与普通Splats的精度对比',
    descriptionZh: 'Compare precision between ExtSplats and regular Splats',
    thumbnail: '📡',
    tags: ['Advanced', '高级'],
    difficulty: 'medium',
    link: 'https://sparkjs.dev/examples/#extsplats'
  }
];

// 难度颜色
const DIFFICULTY_COLORS = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444'
};

// 难度标签
const DIFFICULTY_TEXT = {
  easy: { en: 'Easy', zh: '入门' },
  medium: { en: 'Medium', zh: '进阶' },
  hard: { en: 'Advanced', zh: '高级' }
};

// 卡片背景
const CARD_GRADIENTS = [
  'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)',
  'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(6, 182, 212, 0.3) 100%)',
  'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(239, 68, 68, 0.3) 100%)',
  'linear-gradient(135deg, rgba(236, 72, 153, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
];

// 官方模型 URLs
const OFFICIAL_MODELS: Record<string, string> = {
  'hello-world': 'https://sparkjs.dev/models/butterfly.spz',
  'interactivity': 'https://sparkjs.dev/models/food/food_set.spz',
  'multiple-splats': '/models/cat.spz', // 使用本地文件
  'raycasting': 'https://sparkjs.dev/models/robot.spz',
  'editor': 'https://sparkjs.dev/models/demo.spz',
};

// 分类
const CATEGORIES = [
  { value: 'all', label: '全部', labelEn: 'All', icon: <AppstoreOutlined />, count: EXAMPLES.length },
  { value: 'easy', label: '入门', labelEn: 'Easy', icon: <StarOutlined />, count: EXAMPLES.filter(e => e.difficulty === 'easy').length },
  { value: 'medium', label: '进阶', labelEn: 'Medium', icon: <RocketOutlined />, count: EXAMPLES.filter(e => e.difficulty === 'medium').length },
  { value: 'hard', label: '高级', labelEn: 'Advanced', icon: <ToolOutlined />, count: EXAMPLES.filter(e => e.difficulty === 'hard').length },
];

// 每页数量
const CARDS_PER_PAGE = 8;

export function SparkShowcase() {
  const { language } = useTranslation();
  const isZh = language === 'zh-CN';
  const [filter, setFilter] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);

  // 过滤示例
  const filteredExamples = filter === 'all'
    ? EXAMPLES
    : EXAMPLES.filter(ex => ex.difficulty === filter);

  // 分页
  const totalSlides = Math.ceil(filteredExamples.length / CARDS_PER_PAGE);
  const currentPageItems = filteredExamples.slice(
    currentSlide * CARDS_PER_PAGE,
    (currentSlide + 1) * CARDS_PER_PAGE
  );

  // 翻页
  const goNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  // 分类切换
  const handleCategoryChange = (category: string) => {
    setFilter(category);
    setCurrentSlide(0);
  };

  // 鼠标拖拽
  const dragState = useRef({ isDragging: false, startX: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    dragState.current = { isDragging: true, startX: e.clientX };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDragging) return;
    const deltaX = e.clientX - dragState.current.startX;
    const threshold = 100;
    if (Math.abs(deltaX) > threshold) {
      if (deltaX < 0 && currentSlide < totalSlides - 1) {
        goNext();
      } else if (deltaX > 0 && currentSlide > 0) {
        goPrev();
      }
      dragState.current.isDragging = false;
    }
  };

  const handleMouseUp = () => {
    dragState.current.isDragging = false;
  };

  // 打开链接
  const openExample = (link: string) => {
    window.open(link, '_blank');
  };

  return (
    <div className="showcase-page" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      {/* 左侧导航 */}
      <aside className="showcase-sidebar">
        <div className="showcase-logo">✨</div>
        <h1 className="showcase-sidebar-title">{isZh ? '示例' : 'Showcase'}</h1>

        <nav className="showcase-nav">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`showcase-nav-btn ${filter === cat.value ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.value)}
            >
              <span className="showcase-nav-icon">{cat.icon}</span>
              <span className="showcase-nav-label">{isZh ? cat.label : cat.labelEn}</span>
              <span className="showcase-nav-count">{cat.count}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 右侧内容 */}
      <main className="showcase-main">
        <div className="showcase-top-bar">
          <span className="showcase-filter-hint">
            {isZh ? '筛选' : 'Filter'}: {isZh ? '全部示例' : 'All Examples'}
          </span>
        </div>

        {/* 卡片区域 */}
        <section
          className="showcase-carousel-area"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{ cursor: dragState.current.isDragging ? 'grabbing' : 'grab' }}
        >
          {/* 左导航 */}
          <button
            className={`showcase-nav-arrow prev ${currentSlide === 0 ? 'disabled' : ''}`}
            onClick={goPrev}
            disabled={currentSlide === 0}
          >
            <LeftOutlined />
          </button>

          <div className="showcase-cards-viewport">
            <div className="showcase-cards-track">
              {currentPageItems.map((example, index) => (
                <div
                  key={example.id}
                  className="showcase-3d-card"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* 3D 预览 */}
                  <div className="showcase-card-preview">
                    {example.id === 'sam-3d' ? (
                      <SAM3DCard
                        thumbnail={example.thumbnail}
                        title={example.title}
                        backgroundColor={CARD_GRADIENTS[index % CARD_GRADIENTS.length]}
                      />
                    ) : (
                      <SparkExampleCard3D
                        modelUrl={OFFICIAL_MODELS[example.id]}
                        thumbnail={example.thumbnail}
                        title={example.title}
                        autoRotate={true}
                        backgroundColor={CARD_GRADIENTS[index % CARD_GRADIENTS.length]}
                      />
                    )}
                  </div>

                  {/* 卡片内容 */}
                  <div className="showcase-card-info">
                    <div className="showcase-card-header">
                      <h3 className="showcase-card-title">
                        {isZh ? example.titleZh : example.title}
                      </h3>
                      <span
                        className="showcase-difficulty-badge"
                        style={{ backgroundColor: DIFFICULTY_COLORS[example.difficulty as keyof typeof DIFFICULTY_COLORS] }}
                      >
                        {isZh ? DIFFICULTY_TEXT[example.difficulty as keyof typeof DIFFICULTY_TEXT].zh : DIFFICULTY_TEXT[example.difficulty as keyof typeof DIFFICULTY_TEXT].en}
                      </span>
                    </div>

                    <div className="showcase-card-tags">
                      {example.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="showcase-tag">{tag}</span>
                      ))}
                    </div>

                    <button
                      className="showcase-card-action"
                      onClick={() => openExample(example.link)}
                    >
                      {isZh ? '🚀 体验' : '🚀 Try'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右导航 */}
          <button
            className={`showcase-nav-arrow next ${currentSlide >= totalSlides - 1 ? 'disabled' : ''}`}
            onClick={goNext}
            disabled={currentSlide >= totalSlides - 1}
          >
            <RightOutlined />
          </button>
        </section>

        {/* 分页指示器 */}
        {totalSlides > 1 && (
          <div className="showcase-pagination">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                className={`showcase-pagination-dot ${currentSlide === i ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
