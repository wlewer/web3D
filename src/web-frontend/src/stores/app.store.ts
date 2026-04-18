// 应用状态管理
import { create } from 'zustand';

interface AppState {
  // 加载状态
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // 当前模型
  currentModel: string | null;
  setCurrentModel: (model: string | null) => void;

  // 场景配置
  autoRotate: boolean;
  toggleAutoRotate: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  currentModel: null,
  setCurrentModel: (model) => set({ currentModel: model }),

  autoRotate: true,
  toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
}));
