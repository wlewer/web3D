/**
 * useOrbitController - OrbitController 的 React Hook 封装
 *
 * 提供与 React 状态同步的便捷 API，自动管理生命周期。
 *
 * @example
 * ```tsx
 * const { active, start, stop, setSpeed, speed, mode, setMode } =
 *   useOrbitController(cameraRef, controlsRef, { defaultMode: 'hemispherical' });
 *
 * return <button onClick={() => active ? stop() : start()}>
 *   {active ? '停止' : '开始'}
 * </button>;
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrbitController } from './OrbitController';
import { findPresetById, BUILTIN_PRESETS } from './presets';
import type {
  OrbitModeMeta,
  OrbitParamDef,
  OrbitPreset,
  OrbitSnapshot,
} from './types';

// ========== 类型定义 ==========

export interface UseOrbitControllerOptions {
  /** 环绕中心点 */
  center?: THREE.Vector3;
  /** 默认模式 ID */
  defaultMode?: string;
  /** 默认速度倍率 0.5~3.0 */
  defaultSpeed?: number;
  /** 默认周期毫秒 */
  defaultDuration?: number;
  /** 自动保存偏好到 localStorage */
  autoPersist?: boolean;
  /** localStorage key */
  persistKey?: string;
}

export interface OrbitControllerUIState {
  /** 当前模式 ID */
  mode: string;
  /** 当前速度倍率 */
  speed: number;
  /** 当前模式参数 */
  params: Record<string, any>;
  /** 是否正在运行 */
  active: boolean;
  /** 当前周期数 */
  cycle: number;
  /** 最近一次位置快照 */
  lastSnapshot: OrbitSnapshot | null;
}

export interface OrbitControllerAPI extends OrbitControllerUIState {
  /** 底层控制器实例（直接操作） */
  controller: OrbitController;

  /** 切换模式 */
  setMode: (id: string) => void;
  /** 设置速度 */
  setSpeed: (speed: number) => void;
  /** 设置当前模式参数 */
  setParams: (p: Record<string, any>) => void;
  /** 启动 */
  start: (duration?: number) => void;
  /** 停止 */
  stop: () => void;
  /** 暂停 */
  pause: () => void;
  /** 恢复 */
  resume: () => void;

  /** 可用模式列表 */
  availableModes: OrbitModeMeta[];
  /** 当前模式的参数定义（用于动态生成 UI 控件） */
  currentParamDefs: OrbitParamDef[];
  /** 预设列表 */
  presets: OrbitPreset[];
  /** 应用预设 */
  applyPreset: (id: string) => void;
}

// ========== 持久化工具 ==========

const DEFAULT_STORAGE_KEY = 'orbit-controller-prefs';

interface StoredPrefs {
  mode: string;
  speed: number;
  duration: number;
  params: Record<string, any>;
}

function loadPrefs(key: string): StoredPrefs | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function savePrefs(key: string, prefs: StoredPrefs): void {
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

// ========== Hook ==========

export function useOrbitController(
  cameraRef: React.RefObject<THREE.PerspectiveCamera | null>,
  controlsRef: React.RefObject<OrbitControls | null>,
  options: UseOrbitControllerOptions = {}
): OrbitControllerAPI {
  const {
    center,
    defaultMode,
    defaultSpeed = 1.0,
    autoPersist = false,
    persistKey = DEFAULT_STORAGE_KEY,
  } = options;

  // 控制器实例
  const controllerRef = useRef<OrbitController | null>(null);

  // 响应式状态
  const [mode, setModeState] = useState(defaultMode ?? 'hemispherical');
  const [speed, setSpeedState] = useState(defaultSpeed);
  const [params, setParamsState] = useState<Record<string, any>>({});
  const [active, setActive] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [lastSnapshot, setLastSnapshot] = useState<OrbitSnapshot | null>(null);

  // 可用模式 & 预设
  const [availableModes, setAvailableModes] = useState<OrbitModeMeta[]>([]);
  const [currentParamDefs, setCurrentParamDefs] = useState<OrbitParamDef[]>([]);
  const presets = BUILTIN_PRESETS;

  // ============ 初始化控制器 ============

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const controller = new OrbitController(camera, controls, center);
    controllerRef.current = controller;

    // 恢复持久化偏好
    if (autoPersist) {
      const stored = loadPrefs(persistKey);
      if (stored) {
        if (stored.params) controller.setAllParams({ [stored.mode]: stored.params });
        controller.setSpeed(stored.speed);
      }
    }

    // 应用默认模式
    if (defaultMode) {
      controller.setMode(defaultMode);
    }

    // 注册事件
    controller.setEvent('onStateChange', (active) => {
      setActive(active);
    });
    controller.setEvent('onCycleComplete', (cycle) => {
      setCycle(cycle);
    });
    controller.setEvent('onPositionUpdate', (snapshot) => {
      setLastSnapshot(snapshot);
    });

    // 初始状态
    setAvailableModes(controller.getAvailableModes());
    setCurrentParamDefs(controller.getCurrentMode().meta.params);
    setModeState(controller.getCurrentMode().meta.id);
    setSpeedState(controller.getSpeed());
    setParamsState(controller.getParams());

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ 方法封装 ============

  const setMode = useCallback((id: string) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (ctrl.setMode(id)) {
      setModeState(ctrl.getCurrentMode().meta.id);
      setCurrentParamDefs(ctrl.getCurrentMode().meta.params);
      setParamsState(ctrl.getParams());
    }
  }, []);

  const handleSetSpeed = useCallback((newSpeed: number) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    ctrl.setSpeed(newSpeed);
    setSpeedState(ctrl.getSpeed());

    if (autoPersist) {
      savePrefs(persistKey, {
        mode: ctrl.getCurrentMode().meta.id,
        speed: ctrl.getSpeed(),
        duration: 0,
        params: ctrl.getParams(),
      });
    }
  }, [autoPersist, persistKey]);

  const handleSetParams = useCallback((newParams: Record<string, any>) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    ctrl.setParams(newParams);
    setParamsState(ctrl.getParams());

    if (autoPersist) {
      savePrefs(persistKey, {
        mode: ctrl.getCurrentMode().meta.id,
        speed: ctrl.getSpeed(),
        duration: 0,
        params: ctrl.getParams(),
      });
    }
  }, [autoPersist, persistKey]);

  const start = useCallback((duration?: number) => {
    controllerRef.current?.start(duration);
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.stop();
  }, []);

  const pause = useCallback(() => {
    controllerRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    controllerRef.current?.resume();
  }, []);

  const applyPreset = useCallback((id: string) => {
    const preset = findPresetById(id);
    if (!preset) {
      console.warn(`[useOrbitController] 未找到预设: ${id}`);
      return;
    }
    const ctrl = controllerRef.current;
    if (!ctrl) return;

    // 切换模式
    if (ctrl.setMode(preset.modeId)) {
      setModeState(ctrl.getCurrentMode().meta.id);
      setCurrentParamDefs(ctrl.getCurrentMode().meta.params);
    }

    // 应用参数
    ctrl.setParams(preset.params);
    setParamsState(ctrl.getParams());

    // 启动
    ctrl.start(preset.duration);
    setActive(true);
  }, []);

  // ============ 返回 API ============

  return {
    // 状态
    controller: controllerRef.current!,
    mode,
    speed,
    params,
    active,
    cycle,
    lastSnapshot,

    // 方法
    setMode,
    setSpeed: handleSetSpeed,
    setParams: handleSetParams,
    start,
    stop,
    pause,
    resume,

    // UI 辅助
    availableModes,
    currentParamDefs,
    presets,
    applyPreset,
  };
}
