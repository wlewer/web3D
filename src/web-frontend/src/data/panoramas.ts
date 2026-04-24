/**
 * 3D车间全景图配置
 * 管理所有可用的360°全景图资源
 */

export interface PanoramaConfig {
  id: string;
  name: string;
  nameZh: string;
  url: string;
  thumbnail?: string;
  description?: string;
}

// 本地全景图列表
export const PANORAMAS: PanoramaConfig[] = [
  {
    id: 'mob2uecf',
    name: 'Industrial Workshop 1',
    nameZh: '工业车间 1',
    url: '/models/panoramas/mob2uecf.png',
    description: '工业风格车间全景图（34MB）'
  },
  {
    id: 'mob12moh',
    name: 'Industrial Workshop 2',
    nameZh: '工业车间 2',
    url: '/models/panoramas/mob12moh.png',
    description: '工业风格车间全景图（29MB）'
  },
  {
    id: 'mob15ycq',
    name: 'Industrial Workshop 3',
    nameZh: '工业车间 3',
    url: '/models/panoramas/mob15ycq.png',
    description: '工业风格车间全景图（30MB）'
  }
];

// 默认全景图
export const DEFAULT_PANORAMA = PANORAMAS[0]; // mob2uecf.png

/**
 * 根据ID获取全景图配置
 */
export function getPanoramaById(id: string): PanoramaConfig | undefined {
  return PANORAMAS.find(p => p.id === id);
}

/**
 * 获取所有全景图
 */
export function getAllPanoramas(): PanoramaConfig[] {
  return PANORAMAS;
}
