// 3D模型查看器组件
import { useRef, useState, Suspense } from 'react';
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

// GLB模型加载组件
function GLBModel({ modelUrl, meshRef }: { modelUrl: string; meshRef: React.RefObject<THREE.Group> }) {
  const { scene } = useGLTF(modelUrl);
  
  return (
    <group ref={meshRef}>
      <primitive object={scene} />
    </group>
  );
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
      <Suspense fallback={null}>
        <GLBModel 
          modelUrl={modelUrl} 
          meshRef={meshRef}
        />
      </Suspense>
    </>
  );
}
