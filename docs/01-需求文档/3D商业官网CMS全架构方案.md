# 3D商业官网CMS全架构方案

> 版本：v1.0
> 日期：2026-04-20
> 状态：需求评审阶段

---

## 一、文档目的

本文档旨在定义一套基于 V3 3DGS 渲染引擎的商业官网 CMS（内容管理系统）完整架构方案。涵盖设计系统、镜头预设、页面区块管理、前端用户交互控制、多租户白标、数据埋点分析等核心模块，作为后续开发实施的蓝图。

---

## 二、项目背景与商业价值

### 2.1 背景

当前 V3 组件（UniversalGaussianCardV3 + Base3DViewer）已实现：
- 一套组件覆盖所有布局（featured / grid / gallery / compact / modal）
- 所有渲染参数通过 props 驱动
- SPZ 格式实现秒开级加载速度

但缺乏**后台可视化配置系统**，每次页面展示需要前端硬编码，无法让运营/设计人员自主控制官网展示效果。

### 2.2 商业价值

| 维度 | 价值 |
|:---|:---|
| **降低交付成本** | 一套系统适配多行业官网，无需为每个客户重新开发前端 |
| **运营自主** | 运营人员通过后台拖拽配置页面，无需开发介入 |
| **用户粘性** | 前端交互控制台让用户主动调节参数，提升参与感与停留时长 |
| **2B 转售** | 支持多租户隔离，可向不同企业按年/按服务收费 |
| **数据驱动** | 通过埋点分析知道哪些角度/参数用户最喜欢，反向优化模型拍摄 |

### 2.3 目标用户画像

| 用户类型 | 核心需求 |
|:---|:---|
| **运营/设计人员**（后台使用者） | 页面管理、区块拖拽、主题色配置、模型上架、预览发布 |
| **终端用户**（前台浏览者） | 流畅拖拽查看 3D 模型、调节镜头参数体验 |
| **管理员**（系统维护者） | 权限分配、多租户管理、数据统计 |
| **企业客户**（购买方） | 定制品牌色、独立域名、白标 |

---

## 三、目标行业与适用场景

### 3.1 行业需求矩阵

| 行业 | 设计风格偏好 | 镜头偏好 | 装饰偏好 | 关键交互需求 |
|:---|:---|:---|:---|:---|
| **珠宝奢侈品** | 深色背景、金色强调色、极简 | FOV 15-25（微距）、慢速环绕 | 无粒子、镜面展示台 | 细节放大、灯光切换 |
| **汽车出行** | 动态科技感、速度线条、广角 | FOV 60-75（广角）、水平环绕 | 地面反射、有粒子 | 颜色切换、多角度预设 |
| **家居家具** | 明亮暖色、自然光感、生活化 | FOV 45-55、轻柔环绕 | 环境光柔和、木质展示台 | AR 放置预览 |
| **教育科研** | 简洁清晰、冷色调、功能性 | FOV 40-50、螺旋模式（全视角） | 标签显眼、慢速旋转 | 标注点、爆炸视图 |
| **建筑设计** | 冷灰/白色系、结构线条 | FOV 35-45、固定仰角横向环绕 | 无粒子、透明展示台 | 横切面视图、测量 |
| **电商商品** | 白色/浅色背景、干净 | FOV 30-45、自动旋转 | 低粒子或关闭 | 快捷缩放、多 SKU 切换 |
| **数字艺术/NFT** | 黑暗背景、霓虹光效 | FOV 35-50、任意角度 | 粒子丰富、发光展示台 | 特效切换、截图分享 |

### 3.2 最适合的企业特征

1. 拥有大量 3D 模型资产
2. 需要通过官网展示三维商品的品牌方
3. 期望用户无需安装软件即可查看 3D 内容
4. 对首屏加载体验有高要求
5. 需要多页面、多风格展示同一批模型

---

## 四、系统总体架构

### 4.1 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         Admin 管理端                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ 页面管理  │  │ 设计系统  │  │ 镜头预设  │  │ 用户控制授权    │  │
│  │ 区块编辑  │  │ 主题编辑  │  │ 预设管理  │  │ 参数范围限制    │  │
│  │ 多版本    │  │ 多主题   │  │ 行业模板  │  │ 导出导入配置    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬─────────┘  │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌───────┴─────────┐  │
│  │ 模型库管理 │  │ 权限管理  │  │ 数据统计  │  │ 多租户/白标    │  │
│  │ 上传/转换  │  │ 角色权限  │  │ 埋点分析  │  │ 品牌隔离       │  │
│  │ 分类标签   │  │ 页面授权  │  │ 热力图   │  │ 独立域名       │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend 动态渲染引擎                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PageRenderer（页面渲染器）                                 │   │
│  │   ├── ThemeProvider        ← 注入 DesignSystem Token      │   │
│  │   ├── SectionRenderer      ← 按配置渲染区块序列             │   │
│  │   ├── <User3DControls>     ← 授权控制面板                  │   │
│  │   └── AnalyticsTracker     ← 用户行为埋点                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 数据流转流程

```
运营后台配置
    │
    ▼
设计主题 + 镜头预设 + 页面区块 → 存储为 JSON 配置
    │
    ▼
API 聚合接口: GET /api/v1/pages/:slug/render-config
    │
    ▼
返回完整渲染配置（含主题 Token + 各区块 V3 参数 + 授权控制配置）
    │
    ▼
前端 PageRenderer 接收配置 →
    ├── ThemeProvider 注入 CSS 变量
    ├── SectionRenderer 逐区块渲染
    │    每个 Section 对应一个 V3 组件实例
    └── User3DControls 读取授权配置，决定渲染哪些控件
```

### 4.3 V3 组件与 CMS 的映射关系

```
后台配置字段                   →  V3 组件 Props
────────────                    ────────────
section.modelIds[]              →  modelUrl
section.layout                  →  layout
theme.colors.background         →  backgroundColor
section.cameraPreset            →  orbitMode + fov + margin
section.decorations.particles   →  showParticles + particleSize
section.decorations.platform    →  showPlatform
section.decorations.labels      →  showLabels + products
section.title                   →  title + subtitle
section.cameraPreset.orbitSpeed →  orbitSpeed + orbitDuration
```

---

## 五、设计系统引擎（Design Theme）

### 5.1 功能概述

一套可视化的**设计 Token 管理**系统，行业运营人员无需写 CSS 即可自定义官网视觉风格。每个主题包含完整的颜色、字体、间距、圆角、阴影、动画定义。

### 5.2 数据模型

```python
class DesignTheme(Base):
    """设计主题表"""
    __tablename__ = "design_themes"

    id: str (UUID, PK)
    name: str                          # 主题名称（如"珠宝深邃"）
    description: str | None            # 描述
    industry: str                      # 所属行业（枚举）
    status: str                        # draft / published / archived
    is_default: bool                   # 是否为行业默认主题

    # ── 颜色系统 ──
    colors: JSON = {
        "primary": "#...",             # 主色
        "secondary": "#...",           # 辅色
        "accent": "#...",              # 强调色
        "background": "#0a0a0f",       # 页面背景
        "surface": "#1a1a2e",          # 卡片/面板背景
        "text": "#ffffff",             # 正文文字
        "textSecondary": "#a0a0b0",    # 次要文字
        "cardBg": "rgba(255,255,255,0.05)",  # 卡片背景
        "cardBorder": "rgba(255,255,255,0.1)", # 卡片边框
        "glow": "rgba(0,150,255,0.5)" # 发光色
    }

    # ── 字体系统 ──
    typography: JSON = {
        "headingFont": "'PingFang SC', 'Microsoft YaHei', sans-serif",
        "bodyFont": "'PingFang SC', 'Microsoft YaHei', sans-serif",
        "headingWeight": 700,
        "bodyWeight": 400,
        "baseSize": 16,                # 基准字号(px)
        "scaleRatio": 1.25             # 字号放大比例
    }

    # ── 间距系统 ──
    spacing: JSON = {
        "sectionPadding": "80px 0",    # 区块上下内边距
        "cardGap": "20px",             # 卡片间距
        "containerWidth": "1280px",    # 内容区最大宽度
        "contentPadding": "24px"       # 内容区内边距
    }

    # ── 圆角系统 ──
    borderRadius: JSON = {
        "sm": "4px",
        "md": "8px",
        "lg": "16px",
        "full": "50%"
    }

    # ── 阴影系统 ──
    shadows: JSON = {
        "card": "0 4px 20px rgba(0,0,0,0.3)",
        "modal": "0 8px 40px rgba(0,0,0,0.5)",
        "glow": "0 0 20px rgba(0,150,255,0.3)"
    }

    # ── 动画系统 ──
    animations: JSON = {
        "pageTransition": "fade",       # fade / slide / zoom
        "sectionReveal": "fade-up",    # 区块进入动画
        "hoverEffect": "scale",        # 悬停效果
        "loadingStyle": "spinner"      # 加载样式
    }

    # ── CSS 变量覆盖（高级用法） ──
    customCss: str | None              # 额外 CSS 代码

    created_by: str (FK -> users.id)
    created_at: datetime
    updated_at: datetime
```

### 5.3 API 端点

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| GET | `/api/v1/themes` | 主题列表（支持按行业筛选） |
| POST | `/api/v1/themes` | 创建主题 |
| GET | `/api/v1/themes/{id}` | 主题详情 |
| PUT | `/api/v1/themes/{id}` | 更新主题 |
| DELETE | `/api/v1/themes/{id}` | 删除主题 |
| POST | `/api/v1/themes/{id}/publish` | 发布主题 |
| GET | `/api/v1/themes/default?industry=xxx` | 获取行业默认主题 |

### 5.4 前端注入机制

后端返回的主题配置在前端通过 `ThemeProvider` 转为 CSS 自定义属性（Custom Properties）：

```typescript
// ThemeProvider 核心逻辑
function ThemeProvider({ theme, children }) {
  const cssVars = {
    '--color-primary': theme.colors.primary,
    '--color-background': theme.colors.background,
    '--color-surface': theme.colors.surface,
    '--color-text': theme.colors.text,
    '--font-heading': theme.typography.headingFont,
    '--font-body': theme.typography.bodyFont,
    '--spacing-section': theme.spacing.sectionPadding,
    '--radius-md': theme.borderRadius.md,
    '--shadow-card': theme.shadows.card,
    // ... 全部展开为 CSS 变量
  };

  return <div style={cssVars as React.CSSProperties}>{children}</div>;
}
```

---

## 六、镜头预设系统（Camera Preset）

### 6.1 功能概述

预定义多组镜头参数模板，后台可一键应用到页面区块。不同行业有独立的默认预设。

### 6.2 数据模型

```python
class CameraPreset(Base):
    """镜头预设表"""
    __tablename__ = "camera_presets"

    id: str (UUID, PK)
    name: str                          # 预设名称（如"珠宝微距"）
    description: str | None
    industry: str                      # 所属行业
    is_default: bool                   # 是否行业默认
    sort_order: int                    # 排序

    # 相机基础参数
    fov: int                           # 视野角度 15-120
    margin: float                      # 相机距离倍数 1.0-8.0

    # 轨道控制限制
    minDistance: float                 # 最小距离
    maxDistance: float                 # 最大距离
    minPolarAngle: float               # 最小极角（度）
    maxPolarAngle: float               # 最大极角（度）

    # 自动旋转
    autoRotate: bool
    autoRotateSpeed: float             # 0.5-5.0

    # 环绕参数
    orbitMode: str                     # hemispherical / horizontal / spiral / vertical-arc / figure-8
    orbitDuration: int                 # 环绕周期(ms)
    orbitSpeed: float                  # 速度倍率 0.5-3.0
    orbitHeightFactor: float           # 垂直幅度
    orbitCenterYOffset: float          # 中心垂直偏移

    # 交互
    dampingFactor: float               # 阻尼系数 0.01-0.2
    zoomSpeed: float                   # 缩放速度
    enableDamping: bool

    # 高级
    cameraPosition: JSON | None        # 固定位置 [x, y, z]（可选）
    cameraTarget: JSON | None          # 固定观察点 [x, y, z]（可选）

    created_by: str (FK -> users.id)
    created_at: datetime
    updated_at: datetime
```

### 6.3 行业预设示例

| 预设名称 | 适用行业 | fov | orbitMode | orbitSpeed | margin | minPolar | maxPolar |
|:---|:---|:---|:---|:---|:---|:---|:---|
| 珠宝微距特写 | 珠宝 | 18 | hemispherical | 0.8 | 1.5 | 60 | 80 |
| 汽车广角动感 | 汽车 | 65 | horizontal | 2.5 | 3.0 | 10 | 30 |
| 家居生活感 | 家居 | 50 | hemispherical | 1.0 | 2.8 | 30 | 60 |
| 教育全视角 | 教育 | 45 | spiral | 1.2 | 2.5 | 0 | 90 |
| 建筑固定仰角 | 建筑 | 40 | horizontal | 1.5 | 3.5 | 20 | 25 |
| 商品标准 | 电商 | 40 | hemispherical | 1.2 | 2.5 | 30 | 60 |
| 艺术自由视角 | 艺术/NFT | 50 | figure-8 | 1.0 | 2.8 | 0 | 90 |
| 通用预览 | 通用 | 50 | hemispherical | 1.5 | 2.5 | 20 | 60 |

### 6.4 API 端点

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| GET | `/api/v1/presets` | 预设列表（按行业/全部） |
| POST | `/api/v1/presets` | 创建预设 |
| GET | `/api/v1/presets/{id}` | 预设详情 |
| PUT | `/api/v1/presets/{id}` | 更新预设 |
| DELETE | `/api/v1/presets/{id}` | 删除预设 |
| POST | `/api/v1/presets/{id}/duplicate` | 复制预设（基于已有创建） |

---

## 七、页面与区块管理

### 7.1 功能概述

**页面管理** = 创建/编辑/发布多个独立展示页面（首页、产品、关于等）。
**区块管理** = 每个页面由多个 Section 组成，后台拖拽排序，每个 Section 绑定其配置。

### 7.2 数据模型

```python
class Page(Base):
    """页面表"""
    __tablename__ = "cms_pages"

    id: str (UUID, PK)
    title: str                          # 页面标题
    slug: str (unique)                  # URL 路径（如 /products）
    description: str | None             # 页面描述 / SEO description

    status: str                         # draft / published / archived
    is_homepage: bool                   # 是否为首页

    # 关联
    theme_id: str (FK -> design_themes.id, nullable)  # 绑定主题
    tenant_id: str | None               # 多租户（可选）

    # SEO
    seo_title: str | None               # SEO 标题
    seo_description: str | None         # SEO 描述
    seo_keywords: str | None            # SEO 关键词（逗号分隔）
    og_image_url: str | None            # 社交分享图

    # 发布信息
    published_at: datetime | None
    published_by: str | None (FK -> users.id)
    version: int                        # 当前版本号

    created_by: str (FK -> users.id)
    created_at: datetime
    updated_at: datetime


class PageSection(Base):
    """页面区块表"""
    __tablename__ = "page_sections"

    id: str (UUID, PK)
    page_id: str (FK -> cms_pages.id, indexed)

    # 区块类型
    section_type: str                   # hero / grid / gallery / carousel / text / image-text / divider / cta / custom

    # 排序
    sort_order: int                     # 排序序号（从小到大）
    is_visible: bool = True             # 是否可见

    # 区块配置（核心）
    config: JSON = {}                   # 见 7.3 节

    # 区块样式覆盖
    custom_style: JSON | None           # CSS 样式覆盖（高级）

    created_at: datetime
    updated_at: datetime
```

### 7.3 Section 类型与配置定义

每个 section_type 对应不同的 config JSON 结构：

#### 7.3.1 Hero Section（全屏展示）

```json
{
  "type": "hero",
  "config": {
    "models": ["model-id-1", "model-id-2", "model-id-3"],
    "layout": "featured",
    "autoRotate": true,
    "carouselEnabled": true,
    "carouselInterval": 6000,
    "cameraPresetId": "preset-id",
    "decorations": {
      "particles": true,
      "particleSize": 0.05,
      "platform": true,
      "labels": false
    },
    "theme": {
      "titleOverlay": true,
      "title": "主标题",
      "subtitle": "副标题"
    },
    "userControls": {
      "enabled": true,
      "allowedParams": ["fov", "orbitSpeed", "background", "particles", "rotation"],
      "paramRanges": {
        "fov": { "min": 15, "max": 120, "default": 50, "step": 5 },
        "orbitSpeed": { "min": 0, "max": 5, "default": 1.5, "step": 0.5 },
        "particleSize": { "min": 0, "max": 0.3, "default": 0.05, "step": 0.01 }
      },
      "uiStyle": "floating",
      "position": "bottom-right"
    },
    "height": "100vh",
    "overlayContent": {
      "show": true,
      "type": "center-text",
      "text": "品牌标语",
      "ctaButton": { "text": "了解更多", "link": "/about" }
    }
  }
}
```

#### 7.3.2 Grid Section（网格卡片）

```json
{
  "type": "grid",
  "config": {
    "models": ["id1", "id2", "id3", "id4", "id5", "id6"],
    "layout": "grid",
    "columns": 3,
    "cardMargin": 1.8,
    "cardAutoRotateSpeed": 0.5,
    "showParticles": true,
    "particleSize": 0.05,
    "showPlatform": false,
    "showLabels": false,
    "showTitle": true,
    "showStats": false,
    "sectionTitle": "产品系列",
    "sectionSubtitle": "探索我们的产品"
  }
}
```

#### 7.3.3 Gallery Section（画廊展示）

```json
{
  "type": "gallery",
  "config": {
    "models": ["id7", "id8", "id9"],
    "layout": "gallery",
    "cardMargin": 2.0,
    "cardAutoRotateSpeed": 0.5,
    "showParticles": true,
    "showPlatform": false,
    "showLabels": false,
    "showTitle": true,
    "showStats": false,
    "sectionTitle": "应用案例",
    "sectionSubtitle": "各行各业的选择"
  }
}
```

#### 7.3.4 Carousel Section（轮播展示）

```json
{
  "type": "carousel",
  "config": {
    "models": ["id1", "id2", "id3"],
    "layout": "featured",
    "autoPlay": true,
    "interval": 5000,
    "showIndicators": true,
    "showArrows": true,
    "showDots": true,
    "cameraPresetId": "preset-id",
    "decorations": {
      "particles": true,
      "platform": false,
      "labels": true
    }
  }
}
```

#### 7.3.5 Text Section（文字内容区）

```json
{
  "type": "text",
  "config": {
    "content": "<h2>标题</h2><p>正文内容...</p>",
    "alignment": "center",
    "maxWidth": "800px",
    "backgroundType": "none",
    "padding": "80px 0"
  }
}
```

#### 7.3.6 ImageText Section（图文混排）

```json
{
  "type": "image-text",
  "config": {
    "layout": "image-left",
    "imageUrl": "https://...",
    "title": "标题",
    "content": "描述文字...",
    "ctaButton": { "text": "了解更多", "link": "/page" },
    "ratio": "50-50"
  }
}
```

#### 7.3.7 Divider Section（分隔线）

```json
{
  "type": "divider",
  "config": {
    "style": "gradient",
    "height": "2px",
    "margin": "40px 0",
    "color": "var(--color-accent)"
  }
}
```

### 7.4 API 端点

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| GET | `/api/v1/pages` | 页面列表 |
| POST | `/api/v1/pages` | 创建页面 |
| GET | `/api/v1/pages/{id}` | 页面详情（含区块） |
| PUT | `/api/v1/pages/{id}` | 更新页面 |
| DELETE | `/api/v1/pages/{id}` | 删除页面 |
| POST | `/api/v1/pages/{id}/publish` | 发布页面 |
| POST | `/api/v1/pages/{id}/duplicate` | 复制页面 |
| GET | `/api/v1/pages/{id}/versions` | 版本历史 |
| POST | `/api/v1/pages/{id}/rollback` | 回滚到指定版本 |
| | |
| POST | `/api/v1/sections` | 创建区块 |
| PUT | `/api/v1/sections/{id}` | 更新区块配置 |
| DELETE | `/api/v1/sections/{id}` | 删除区块 |
| PUT | `/api/v1/sections/reorder` | 批量排序区块 |
| | |
| **GET** | **`/api/v1/pages/{slug}/render-config`** | **★ 核心接口：获取页面完整渲染配置** |
| **GET** | **`/api/v1/pages/{slug}/user-controls`** | **★ 获取前端用户控制授权配置** |

---

## 八、聚合渲染接口（核心 API）

### 8.1 接口定义

这是前后端联动的核心接口，一次请求返回页面完整配置，前端直接渲染。

```
GET /api/v1/pages/{slug}/render-config
```

### 8.2 响应结构

```json
{
  "page": {
    "id": "uuid",
    "title": "首页",
    "slug": "home",
    "seo": {
      "title": "xxx",
      "description": "xxx",
      "keywords": "xxx",
      "ogImage": "https://..."
    }
  },
  "theme": {
    "id": "uuid",
    "name": "珠宝深邃",
    "colors": { ... },
    "typography": { ... },
    "spacing": { ... },
    "borderRadius": { ... },
    "shadows": { ... },
    "animations": { ... },
    "customCss": null
  },
  "sections": [
    {
      "id": "sec-1",
      "type": "hero",
      "sortOrder": 1,
      "config": { ... }
    },
    {
      "id": "sec-2",
      "type": "grid",
      "sortOrder": 2,
      "config": { ... }
    }
  ],
  "userControls": {
    "enabled": true,
    "allowedParams": ["fov", "orbitSpeed"],
    "paramRanges": { ... },
    "uiStyle": "floating",
    "position": "bottom-right"
  },
  "models": {
    "id1": { "name": "蝴蝶", "url": "/models/butterfly.spz", "thumbnail": "...", "format": "SPZ" },
    "id2": { "name": "猫咪", "url": "/models/cat.spz", "thumbnail": "...", "format": "SPZ" }
  }
}
```

### 8.3 前端消费流程

```typescript
// 页面组件
function DynamicPage({ slug }) {
  const [pageConfig, setPageConfig] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/pages/${slug}/render-config`)
      .then(res => res.json())
      .then(setPageConfig);
  }, [slug]);

  if (!pageConfig) return <Loading />;

  return (
    <ThemeProvider theme={pageConfig.theme}>
      {pageConfig.page.seo &&
        <SEOHead {...pageConfig.page.seo} />
      }
      {pageConfig.sections.map(section => (
        <SectionRenderer key={section.id} section={section} />
      ))}
      {pageConfig.userControls.enabled &&
        <User3DControls
          allowedParams={pageConfig.userControls.allowedParams}
          paramRanges={pageConfig.userControls.paramRanges}
          position={pageConfig.userControls.position}
        />
      }
    </ThemeProvider>
  );
}
```

---

## 九、前端用户交互控制台（User Control Panel）

### 9.1 功能概述

在官网前端展示一个可折叠的浮动控制面板，允许终端用户实时调节 3D 渲染参数（FOV、旋转速度、粒子开关等）。**哪些参数开放由后台授权控制，不同页面可以有不同的授权策略。**

### 9.2 前端组件接口

```typescript
interface User3DControlsProps {
  // 由后台 API 返回的配置驱动
  allowedParams: string[];        // 允许调节的参数列表
  paramRanges: {
    [paramName: string]: {
      min: number;
      max: number;
      default: number;
      step: number;
    };
  };
  position: 'bottom-right' | 'top-right' | 'left';
  uiStyle: 'floating' | 'sidebar' | 'dropdown';
  // 回调
  onParamChange: (paramName: string, value: any) => void;
  onReset: () => void;
}

// 支持的可控参数清单
type UserControlParam =
  | 'fov'              // 视野角度
  | 'orbitSpeed'       // 环绕速度
  | 'background'       // 背景色（预设色板）
  | 'particles'        // 粒子开关
  | 'particleSize'     // 粒子大小
  | 'rotation'         // 旋转开关
  | 'platform'         // 展示台开关
  | 'labels'           // 标签开关
  | 'margin'           // 相机距离
  | 'exposure'         // 曝光度（HDR）
  | 'autoRotateSpeed'  // 自转速度
  ;
```

### 9.3 UI 设计

```typescript
// 浮动面板（floating）- 默认方案
function FloatingControls({ allowedParams, paramRanges, onParamChange }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="user-controls-floating">
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? '✕' : '🎛️'}  {/* 展开/折叠 */}
      </button>
      {expanded && (
        <div className="user-controls-panel">
          <h4>参数调节</h4>
          {allowedParams.includes('fov') && (
            <SliderControl
              label="视野 (FOV)"
              param="fov"
              range={paramRanges.fov}
              onChange={onParamChange}
            />
          )}
          {allowedParams.includes('orbitSpeed') && (
            <SliderControl
              label="环绕速度"
              param="orbitSpeed"
              range={paramRanges.orbitSpeed}
              onChange={onParamChange}
            />
          )}
          {allowedParams.includes('particles') && (
            <SwitchControl
              label="粒子背景"
              param="particles"
              onChange={onParamChange}
            />
          )}
          {allowedParams.includes('background') && (
            <ColorPresetControl
              label="背景色"
              param="background"
              presets={['#0a0a0f', '#1a1a2e', '#ffffff', '#2d1b00']}
              onChange={onParamChange}
            />
          )}
          <button className="reset-btn" onClick={() => onParamChange('reset', null)}>
            重置默认
          </button>
        </div>
      )}
    </div>
  );
}
```

### 9.4 参数变更传递机制

```typescript
// 方案：通过 React Context 传递参数变更
// 所有 V3 组件实例共享同一个 ControlsContext

const ControlsContext = createContext({
  params: defaultParams,
  updateParam: (name: string, value: any) => {},
});

// 在 PageRenderer 层注入
<ControlsContext.Provider value={controlsContext}>
  {sections.map(section => (
    <SectionRenderer key={section.id} section={section} />
  ))}
  <User3DControls
    allowedParams={...}
    paramRanges={...}
  />
</ControlsContext.Provider>

// 在每个 Section 中消费
function HeroSection({ config }) {
  const { params } = useContext(ControlsContext);
  return (
    <UniversalGaussianCardV3
      fov={params.fov ?? config.fov ?? 50}
      orbitSpeed={params.orbitSpeed ?? config.orbitSpeed ?? 1.5}
      showParticles={params.particles ?? config.decorations?.particles ?? true}
      // ...
    />
  );
}
```

---

## 十、多租户与白标（Phase 3）

### 10.1 功能概述

多租户 = 一套系统服务于多个独立企业客户，数据互相隔离。
白标 = 每个租户使用自己品牌的主题（LOGO、域名、颜色）。

### 10.2 数据模型

```python
class Tenant(Base):
    """租户表"""
    __tablename__ = "tenants"

    id: str (UUID, PK)
    name: str                           # 企业名称
    domain: str (unique)                # 独立域名

    # 白标
    logo_url: str | None                # LOGO
    favicon_url: str | None             # 网站图标
    brand_primary_color: str            # 品牌主色

    # 配置
    default_theme_id: str | None        # 默认主题
    max_pages: int                      # 最大页面数
    max_models: int                     # 最大模型数

    # 状态
    is_active: bool
    plan: str                           # basic / pro / enterprise

    created_at: datetime
    updated_at: datetime
```

### 10.3 数据隔离策略

- 每个租户的 page、theme、preset、model 数据通过 `tenant_id` 字段隔离
- 所有 API 通过中间件自动注入 `tenant_id`（基于域名解析）
- 存储资源（模型文件）按 `uploads/{tenant_id}/` 目录隔离

---

## 十一、数据埋点与分析（Phase 3）

### 11.1 埋点事件定义

```typescript
interface AnalyticsEvent {
  eventType: 'model_view'           // 模型展示
              | 'model_interact'    // 用户拖拽/缩放
              | 'param_change'      // 用户调节参数
              | 'screenshot'        // 截图
              | 'click_detail'      // 点击详情
              | 'page_view'         // 页面浏览
              | 'section_view';     // 区块曝光
  modelId?: string;
  sectionId?: string;
  params?: {
    fov?: number;
    orbitSpeed?: number;
    particles?: boolean;
    // ...
  };
  duration?: number;                 // 交互时长(ms)
  timestamp: string;
  sessionId: string;
  pageSlug: string;
}
```

### 11.2 API 端点

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| POST | `/api/v1/analytics/events` | 批量上报事件 |
| GET | `/api/v1/analytics/dashboard` | 统计仪表盘数据 |
| GET | `/api/v1/analytics/heatmap/{modelId}` | 模型查看热力图 |

---

## 十二、权限体系

### 12.1 角色定义

| 角色 | 权限范围 |
|:---|:---|
| **超级管理员** (super_admin) | 全部权限，含租户管理、系统配置 |
| **管理员** (admin) | 页面 CRUD、主题编辑、预设管理、用户管理 |
| **编辑者** (editor) | 页面/区块编辑、模型上传、主题使用（不可删/不可发布） |
| **查看者** (viewer) | 只读访问所有配置 |

### 12.2 权限粒度

```
页面级权限:
  - 访问控制（哪个角色可以查看/编辑/发布哪些页面）
  - 区块级编辑权限

操作级权限:
  - 页面: create / read / update / delete / publish
  - 主题: create / read / update / delete / publish
  - 预设: create / read / update / delete
  - 模型: upload / delete / categorize
  - 用户控制授权: configure
```

---

## 十三、开发路线图

### Phase 1（核心 MVP）

| 模块 | 工作内容 | 预估工时 |
|:---|:---|:---|
| **后端模型** | DesignTheme + CameraPreset + Page + PageSection + UserControls 模型定义 | 2天 |
| **后端 API** | themes / presets / pages / sections CRUD + render-config 聚合接口 | 3天 |
| **后端数据库迁移** | 生成迁移脚本，更新 init_database.sql | 1天 |
| **前端 ThemeProvider** | 将 DesignTheme 转为 CSS 变量注入，热更新 | 1天 |
| **前端 PageRenderer** | 根据 render-config 动态渲染区块序列 | 2天 |
| **前端 Section 组件** | HeroSection / GridSection / GallerySection / TextSection / CarouselSection | 3天 |
| **前端 User3DControls** | 浮动控制面板，授权参数动态渲染 | 2天 |
| **Admin 管理界面** | 页面列表 + 区块编辑器（基础版表单） | 4天 |
| **集成测试** | 全链路验证：后台配置 → API → 前端渲染 | 1天 |
| **合计** | | **19天** |

### Phase 2（体验增强）

| 模块 | 工作内容 | 预估工时 |
|:---|:---|:---|
| **Admin 区块拖拽编辑器** | 可视化拖拽排序，实时预览 | 5天 |
| **Admin 主题可视化编辑** | 颜色选择器、字体下拉、CSS 编辑 | 3天 |
| **User3DControls 增强** | 更多参数类型（色板选择器、下拉、分组） | 2天 |
| **参数范围授权** | 后端校验前端提交的参数值在授权范围内 | 1天 |
| **页面版本管理** | 版本历史列表、对比、回滚 | 3天 |
| **合计** | | **14天** |

### Phase 3（企业级 - 按需）

| 模块 | 工作内容 |
|:---|:---|
| **多租户/白标** | 租户表、域名解析、数据隔离、品牌配置 |
| **数据埋点与分析** | 事件上报、统计仪表盘、模型热力图 |
| **SEO 优化** | SSR 预渲染、骨架屏、结构化数据 |
| **性能优化** | 组件懒加载、图片懒加载、CDN |

---

## 十四、复用现有代码清单

### 可直接复用

```
backend/app/models/user.py           → 用户/权限/租户关联
backend/app/models/model.py          → 模型库管理（models_3d 表）
backend/app/models/template.py       → 场景模板（SceneTemplate，可作为预装预设来源）
backend/app/schemas/auth.py          → 用户认证/授权
backend/app/dependencies.py          → get_current_user, require_role
backend/app/api/v1/auth.py           → JWT 认证
backend/app/api/v1/users.py          → 用户管理
backend/app/api/v1/models.py         → 3D模型 CRUD
backend/app/api/v1/templates.py      → 场景模板 CRUD（可作为 Seed 数据来源）

src/components/3d/ 全部               → V3 组件全家桶
src/components/3d/UniversalGaussianCardV3.tsx  → 页面 Section 渲染的核心组件
src/components/3d/Base3DViewer.tsx             → 所有 3D 参数驱动的渲染器
src/components/3d/types/decorations.ts         → 装饰控制协议
src/components/3d/orbits/ 全部                → 环绕动画
src/components/3d/engines/ 全部               → 模型加载/相机管理/居中引擎
```

### 需新增/扩展

```
backend/app/models/design_theme.py   → 设计主题模型（新建）
backend/app/models/camera_preset.py  → 镜头预设模型（新建）
backend/app/models/page.py           → 页面+区块模型（新建）
backend/app/models/tenant.py         → 租户模型（Phase 3）
backend/app/models/analytics.py      → 埋点模型（Phase 3）

backend/app/schemas/ 对应新建         → 各模型的 Pydantic Schema

backend/app/api/v1/ 对应新建          → 各模块 API 路由

src/components/3d/controls/          → 新增目录：用户控制面板相关组件
src/components/3d/PageRenderer.tsx    → 新增：页面动态渲染器
src/components/3d/ThemeProvider.tsx    → 新增：主题注入组件
src/components/3d/sections/           → 新增目录：各类 Section 组件

admin/ 管理前端（React 管理面板）      → 新增或扩展（如果管理面板需要更丰富的 UI）
```

---

## 十五、关键设计决策记录

| 决策 | 选择 | 理由 |
|:---|:---|:---|
| DesignTheme 用 JSON 字段 vs 独立表 | **JSON 字段** | 主题属性本身就是松散的键值对，独立表反而增加复杂度 |
| Section 配置存储格式 | **JSON 全量存储** | 每次渲染时无需多表 JOIN，一次查询即可拿到完整配置 |
| 用户控制参数传递方式 | **React Context** | 避免层层 prop drilling，多个 Section 共享同一组参数实例 |
| 前端路由 vs 后端路由 | **前端路由** | 通过 /:slug 参数请求 API 获取配置，前端动态渲染 |
| 多租户识别方式 | **域名解析** | 通过请求头 Host 或自定义 Header 识别租户 |
| 埋点上报道 | **批量上报** | 前端累积事件后定时批量 POST，减少请求次数 |

---

## 附录

### A. 数据库建表 SQL 参考

```sql
-- 设计主题表
CREATE TABLE design_themes (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_default BOOLEAN DEFAULT FALSE,
    colors JSON NOT NULL,
    typography JSON NOT NULL,
    spacing JSON NOT NULL,
    border_radius JSON NOT NULL,
    shadows JSON NOT NULL,
    animations JSON NOT NULL,
    custom_css TEXT,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 镜头预设表
CREATE TABLE camera_presets (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    fov INTEGER NOT NULL DEFAULT 50,
    margin FLOAT NOT NULL DEFAULT 2.5,
    min_distance FLOAT DEFAULT 1.0,
    max_distance FLOAT DEFAULT 20.0,
    min_polar_angle FLOAT DEFAULT 0,
    max_polar_angle FLOAT DEFAULT 90,
    auto_rotate BOOLEAN DEFAULT TRUE,
    auto_rotate_speed FLOAT DEFAULT 1.0,
    orbit_mode VARCHAR(50) DEFAULT 'hemispherical',
    orbit_duration INTEGER DEFAULT 12000,
    orbit_speed FLOAT DEFAULT 1.5,
    orbit_height_factor FLOAT DEFAULT 1.5,
    orbit_center_y_offset FLOAT DEFAULT 0,
    damping_factor FLOAT DEFAULT 0.05,
    zoom_speed FLOAT DEFAULT 1.0,
    enable_damping BOOLEAN DEFAULT TRUE,
    camera_position JSON,
    camera_target JSON,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 页面表
CREATE TABLE cms_pages (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_homepage BOOLEAN DEFAULT FALSE,
    theme_id VARCHAR(36) REFERENCES design_themes(id),
    tenant_id VARCHAR(36),
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    og_image_url VARCHAR(500),
    published_at TIMESTAMP,
    published_by VARCHAR(36) REFERENCES users(id),
    version INTEGER DEFAULT 1,
    created_by VARCHAR(36) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 区块表
CREATE TABLE page_sections (
    id VARCHAR(36) PRIMARY KEY,
    page_id VARCHAR(36) NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    config JSON NOT NULL DEFAULT '{}',
    custom_style JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_page_sections_page_id ON page_sections(page_id);
CREATE INDEX idx_page_sections_sort ON page_sections(page_id, sort_order);
```

### B. 前端组件文件结构

```
src/components/3d/
├── controls/                  # [新增] 用户控制面板
│   ├── User3DControls.tsx     # 主组件
│   ├── SliderControl.tsx      # 滑块控件
│   ├── SwitchControl.tsx      # 开关控件
│   ├── ColorPresetControl.tsx # 色板选择
│   └── ControlsContext.tsx    # 参数状态 Context
├── sections/                  # [新增] 区块组件
│   ├── SectionRenderer.tsx    # 区块路由分发器
│   ├── HeroSection.tsx        # Hero 区块
│   ├── GridSection.tsx        # 网格区块
│   ├── GallerySection.tsx     # 画廊区块
│   ├── CarouselSection.tsx    # 轮播区块
│   ├── TextSection.tsx        # 文字区块
│   ├── ImageTextSection.tsx   # 图文区块
│   └── DividerSection.tsx     # 分隔线区块
├── PageRenderer.tsx           # [新增] 页面渲染器
├── ThemeProvider.tsx          # [新增] 设计系统注入
├── Base3DViewer.tsx           # [已有] 核心 3D 查看器
└── UniversalGaussianCardV3.tsx # [已有] 业务组件
```

---

> *本文档为需求分析阶段产物，具体实现细节将在开发阶段根据实际情况调整。*
