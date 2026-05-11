// SplatMesh 组件 - 加载和显示 3DGS 模型
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SparkRenderer, SplatMesh as SplatMeshType } from '@sparkjsdev/spark';
import type { SplatMeshConfig, SplatStats } from './spark.types';

export interface SplatMeshRef {
  getMesh: () => SplatMeshType | null;
  getStats: () => SplatStats;
  dispose: () => void;
}

interface SplatMeshProps extends SplatMeshConfig {
  spark: SparkRenderer;
}

export const SplatMesh = forwardRef<SplatMeshRef, SplatMeshProps>(
  ({ url, spark, position, rotation, scale, onProgress, onLoad, onError }, ref) => {
    const meshRef = useRef<SplatMeshType | null>(null);
    const [stats, setStats] = useState<SplatStats>({
      pointCount: 0,
      loaded: false,
      loading: true,
      progress: 0,
    });

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      getMesh: () => meshRef.current,
      getStats: () => stats,
      dispose: () => {
        if (meshRef.current) {
          (meshRef.current as any).geometry?.dispose();
          (meshRef.current as any).material?.dispose();
        }
      },
    }));

    useEffect(() => {
      let mounted = true;

      const loadSplat = async () => {
        try {
          const splat = new SplatMeshType({ url });
          meshRef.current = splat;

          // 设置位置
          if (position) {
            splat.position.set(...position);
          }

          // 设置旋转（四元数）
          if (rotation) {
            splat.quaternion.set(...rotation);
          }

          // 设置缩放
          if (scale) {
            if (typeof scale === 'number') {
              splat.scale.setScalar(scale);
            } else {
              splat.scale.set(...scale);
            }
          }

          // 添加到场景
          spark.add(splat);

          // 模拟加载进度
          for (let i = 0; i <= 100; i += 10) {
            if (!mounted) break;
            setStats((prev) => ({ ...prev, progress: i }));
            onProgress?.(i);
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          if (mounted) {
            setStats({
              pointCount: (splat as any).geometry ? 1000 : 0,
              loaded: true,
              loading: false,
              progress: 100,
            });
            onLoad?.();
          }
        } catch (error) {
          if (mounted) {
            setStats((prev) => ({ ...prev, loading: false }));
            onError?.(error as Error);
          }
        }
      };

      loadSplat();

      return () => {
        mounted = false;
        if (meshRef.current) {
          spark.remove(meshRef.current);
        }
      };
    }, [url, spark, position, rotation, scale, onProgress, onLoad, onError]);

    return null;
  }
);

SplatMesh.displayName = 'SplatMesh';
