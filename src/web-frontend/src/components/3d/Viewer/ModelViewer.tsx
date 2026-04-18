// 3D模型查看器组件
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_VIEWER_CONFIG } from '../../../constants';
import type { ModelViewerConfig } from '../../../constants';

interface ModelViewerProps {
  modelUrl: string;
  config?: Partial<ModelViewerConfig>;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function ModelViewer({ modelUrl, config, onLoad, onError }: ModelViewerProps) {
  const mergedConfig = { ...DEFAULT_VIEWER_CONFIG, ...config };
  const meshRef = useRef<THREE.Group>(null);
  const [loading, setLoading] = useState(true);

  useFrame((_, delta) => {
    if (meshRef.current && mergedConfig.autoRotate) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  // 加载GLTF/GLB模型
  try {
    const { scene } = useGLTF(modelUrl);
    
    useFrame(() => {
      if (loading) {
        setLoading(false);
        onLoad?.();
      }
    });

    return (
      <>
        <OrbitControls
          enableDamping={mergedConfig.enableDamping}
          dampingFactor={mergedConfig.dampingFactor}
          minDistance={mergedConfig.minDistance}
          maxDistance={mergedConfig.maxDistance}
          enableZoom={mergedConfig.enableZoom}
          enablePan={mergedConfig.enablePan}
        />
        <group ref={meshRef}>
          <primitive object={scene} />
        </group>
      </>
    );
  } catch (error) {
    onError?.(error as Error);
    return null;
  }
}
