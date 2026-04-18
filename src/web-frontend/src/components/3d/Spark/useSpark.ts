// useSpark Hook - 管理 Spark 渲染器生命周期
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SparkRenderer } from '@sparkjsdev/spark';

export interface UseSparkOptions {
  renderer: THREE.WebGLRenderer;
  autoInit?: boolean;
}

export interface UseSparkReturn {
  spark: SparkRenderer | null;
  initialized: boolean;
  error: Error | null;
  init: () => Promise<void>;
  dispose: () => void;
}

export function useSpark(options: UseSparkOptions): UseSparkReturn {
  const { renderer, autoInit = true } = options;
  const sparkRef = useRef<SparkRenderer | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const init = async () => {
    try {
      if (sparkRef.current) return;

      const spark = new SparkRenderer({ renderer });
      sparkRef.current = spark;
      setInitialized(true);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setInitialized(false);
    }
  };

  const dispose = () => {
    if (sparkRef.current) {
      sparkRef.current.dispose();
      sparkRef.current = null;
      setInitialized(false);
    }
  };

  useEffect(() => {
    if (autoInit) {
      init();
    }

    return () => {
      dispose();
    };
  }, [autoInit]);

  return {
    spark: sparkRef.current,
    initialized,
    error,
    init,
    dispose,
  };
}
