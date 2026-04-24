# 360°全景图资源

## 📁 文件说明

本目录包含3张工业风格的360°全景图，用于3D车间的背景环境。

### 全景图列表

| 文件名 | 大小 | 说明 |
|--------|------|------|
| `mob2uecf.png` | 34MB | 工业车间全景图 1（默认） |
| `mob12moh.png` | 29MB | 工业车间全景图 2 |
| `mob15ycq.png` | 30MB | 工业车间全景图 3 |

## 🎯 使用方式

### 1. 在HomePage中自动切换

点击3D车间右上角的 **🌐 全景图** 按钮，可以在3张全景图之间切换。

### 2. 编程方式使用

```tsx
import { Workshop3D } from '../Workshop3D';
import { PANORAMAS } from '../../data/panoramas';

// 使用特定全景图
<Workshop3D 
  embedded={true}
  panoramaUrl="/models/panoramas/mob12moh.png"
/>

// 使用配置对象
const panorama = PANORAMAS.find(p => p.id === 'mob15ycq');
if (panorama) {
  <Workshop3D 
    embedded={true}
    panoramaUrl={panorama.url}
  />
}
```

### 3. 添加新的全景图

1. 将全景图放入此目录
2. 更新 `src/data/panoramas.ts` 配置文件：

```typescript
export const PANORAMAS: PanoramaConfig[] = [
  // ... 现有配置
  {
    id: 'new-panorama',
    name: 'New Panorama',
    nameZh: '新全景图',
    url: '/models/panoramas/new-panorama.png',
    description: '描述信息'
  }
];
```

## 📐 技术要求

### 全景图规格

- **格式**: PNG 或 JPG
- **比例**: 2:1（推荐 2048x1024、4096x2048）
- **投影**: Equirectangular（等距矩形投影）
- **文件大小**: 建议 < 50MB（当前文件约30MB）

### Three.js 配置

```typescript
const texture = new THREE.TextureLoader().load(url);
texture.mapping = THREE.UVMapping;
texture.wrapS = THREE.ClampToEdgeWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
```

## 🌐 在线资源

如果需要更多免费的全景图资源，可以参考：

- [HDRI Haven](https://hdrihaven.com/) - 免费HDR全景图
- [Poly Haven](https://polyhaven.com/hdris) - 高质量HDR环境贴图
- [AmbientCG](https://ambientcg.com/) - PBR材质和全景图

## ⚠️ 注意事项

1. **性能优化**: 大尺寸全景图会影响加载速度，建议使用渐进式JPEG
2. **内存占用**: 每张30MB的图片解压后会占用较多显存
3. **跨域问题**: 如果使用外部URL，需要确保支持CORS
4. **降级策略**: 如果全景图加载失败，会自动使用Canvas生成的占位图

## 🔧 故障排查

### 全景图不显示

1. 检查文件路径是否正确
2. 查看浏览器Console是否有加载错误
3. 确认图片格式是否为2:1比例的等距矩形投影

### 加载缓慢

1. 压缩图片大小（保持2:1比例）
2. 使用WebP格式替代PNG
3. 实现懒加载或预加载策略

### 显示变形

1. 确认图片比例为2:1
2. 检查Three.js纹理映射设置
3. 验证天空球几何体分段数（建议64x64）

## 📝 版本历史

- **v1.0** (2026-04-24): 初始版本，包含3张工业风格全景图
