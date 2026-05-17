import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../stores/app.store';

describe('App Store (Zustand)', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useAppStore.getState();
    store.setLoading(false);
    store.setCurrentModel(null);
    // Reset autoRotate to true
    const state = useAppStore.getState();
    if (!state.autoRotate) {
      state.toggleAutoRotate();
    }
  });

  it('should have correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.currentModel).toBeNull();
    expect(state.autoRotate).toBe(true);
  });

  it('should toggle loading state', () => {
    const { setLoading } = useAppStore.getState();
    setLoading(true);
    expect(useAppStore.getState().isLoading).toBe(true);

    setLoading(false);
    expect(useAppStore.getState().isLoading).toBe(false);
  });

  it('should set current model', () => {
    const { setCurrentModel } = useAppStore.getState();
    setCurrentModel('butterfly.spz');
    expect(useAppStore.getState().currentModel).toBe('butterfly.spz');

    setCurrentModel(null);
    expect(useAppStore.getState().currentModel).toBeNull();
  });

  it('should toggle autoRotate', () => {
    const { toggleAutoRotate } = useAppStore.getState();
    expect(useAppStore.getState().autoRotate).toBe(true);

    toggleAutoRotate();
    expect(useAppStore.getState().autoRotate).toBe(false);

    toggleAutoRotate();
    expect(useAppStore.getState().autoRotate).toBe(true);
  });
});
