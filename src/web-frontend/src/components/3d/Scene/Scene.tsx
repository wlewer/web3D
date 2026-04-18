// 3D场景容器组件
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { BACKGROUND_COLOR } from '../../../constants';

interface SceneProps {
  children: React.ReactNode;
}

export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 50 }}
      style={{ background: BACKGROUND_COLOR }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>{children}</Suspense>
      <Preload all />
    </Canvas>
  );
}
