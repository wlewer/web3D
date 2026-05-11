// 3D书页组件

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BookPage } from '../../../types/book.types';
import { calculateFlipAngle, calculatePaperBend, calculatePageZOffset, calculatePageXOffset } from '../../../utils/bookPhysics';

interface PageProps {
  page: BookPage;
  pageIndex: number;
  currentPage: number;
  flipProgress: number;
  isFlipping: boolean;
  flipDirection: 'next' | 'prev';
  width?: number;
  height?: number;
}

export function Page({
  pageIndex,
  currentPage,
  flipProgress,
  isFlipping,
  flipDirection,
  width = 2,
  height = 2.8,
}: PageProps) {
  const meshRef = useRef<THREE.Group>(null);
  const frontRef = useRef<THREE.Mesh>(null);
  const backRef = useRef<THREE.Mesh>(null);

  // 判断当前页是否应该显示
  const isVisible = pageIndex <= currentPage + 1;
  
  // 判断是否是正在翻转的页面
  const isCurrentFlipping = isFlipping && (
    (flipDirection === 'next' && pageIndex === currentPage) ||
    (flipDirection === 'prev' && pageIndex === currentPage + 1)
  );

  // 计算阴影几何体
  const shadowGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(width, height, 10, 10);
  }, [width, height]);

  useFrame(() => {
    if (!meshRef.current) return;

    if (isCurrentFlipping) {
      // 计算翻转角度
      const angle = calculateFlipAngle(flipProgress);
      
      // 应用旋转（绕Y轴）- 围绕左侧边缘旋转
      meshRef.current.rotation.y = flipDirection === 'next' ? -angle : angle;
      
      // 添加纸张弯曲效果（Z轴隆起）
      const zOffset = calculatePageZOffset(flipProgress, width);
      meshRef.current.position.z = zOffset;
      
      // 添加X轴偏移（模拟弧形轨迹）
      const xOffset = calculatePageXOffset(flipProgress, width);
      meshRef.current.position.x = xOffset * (flipDirection === 'next' ? -1 : 1);
      
      // 添加轻微的倾斜效果，使翻页更自然
      const tiltAngle = Math.sin(flipProgress * Math.PI) * 0.1;
      meshRef.current.rotation.z = flipDirection === 'next' ? tiltAngle : -tiltAngle;
      
      // 动态调整光照效果
      if (frontRef.current) {
        const material = frontRef.current.material as THREE.MeshStandardMaterial;
        const bend = calculatePaperBend(flipProgress, 0.4);
        material.roughness = 0.6 + bend * 0.3;
        material.metalness = 0.1 - bend * 0.05;
      }
    } else {
      // 已翻过的页面
      if (pageIndex < currentPage) {
        meshRef.current.rotation.y = -Math.PI;
        meshRef.current.position.x = -0.05;
        meshRef.current.position.z = -0.02;
        meshRef.current.rotation.z = 0;
      } 
      // 未翻的页面
      else if (pageIndex > currentPage) {
        meshRef.current.rotation.y = 0;
        meshRef.current.position.x = 0.05;
        meshRef.current.position.z = 0;
        meshRef.current.rotation.z = 0;
      }
      // 当前页
      else {
        meshRef.current.rotation.y = 0;
        meshRef.current.position.x = 0;
        meshRef.current.position.z = 0;
        meshRef.current.rotation.z = 0;
      }
    }
  });

  if (!isVisible) return null;

  return (
    <group ref={meshRef}>
      {/* 正面 */}
      <mesh ref={frontRef} position={[width / 2, 0, 0.01]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial 
          color="#f5f5dc" 
          side={THREE.FrontSide}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* 背面 */}
      <mesh ref={backRef} position={[width / 2, 0, -0.01]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[width, height, 0.02]} />
        <meshStandardMaterial 
          color="#f0f0e0" 
          side={THREE.FrontSide}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* 书脊（左侧边缘） */}
      <mesh position={[-width / 2 + 0.025, 0, 0]}>
        <boxGeometry args={[0.05, height, 0.02]} />
        <meshStandardMaterial color="#8b4513" roughness={0.9} />
      </mesh>
      
      {/* 动态阴影 */}
      {isCurrentFlipping && (
        <mesh 
          position={[width / 2, 0, -0.05]} 
          rotation={[0, flipDirection === 'next' ? -Math.PI / 4 : Math.PI / 4, 0]}
        >
          <primitive object={shadowGeometry} />
          <meshBasicMaterial 
            color="#000000" 
            transparent 
            opacity={0.3 * Math.sin(flipProgress * Math.PI)}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
