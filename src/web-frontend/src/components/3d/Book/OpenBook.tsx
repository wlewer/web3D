/**
 * 摊开的3D书本组件
 * 展示左右两页内容，类似PDF阅读器的真实书本效果
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { PageContentData } from '../../../types/book.types';
import { useTranslation } from '../../../i18n';

interface OpenBookProps {
  /** 左页内容 */
  leftPage: PageContentData;
  /** 右页内容 */
  rightPage: PageContentData;
  /** 当前翻开的页码 */
  currentPage: number;
  /** 书页宽度 */
  pageWidth?: number;
  /** 书页高度 */
  pageHeight?: number;
  /** 是否显示 */
  visible?: boolean;
  /** 翻页进度 0-1 */
  flipProgress?: number;
}

export function OpenBook({
  leftPage,
  rightPage,
  currentPage,
  pageWidth = 1.5,
  pageHeight = 2,
  visible = true,
  flipProgress = 0,
}: OpenBookProps) {
  const { t } = useTranslation();
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // 书本翻开角度 - 优化为更平摊的效果，接近Word文档的摊开方式
  const openAngle = Math.PI * 0.48; // 约86度，几乎平摊

  useFrame(() => {
    if (!groupRef.current) return;
    // 添加轻微的悬浮动画
    const floatY = Math.sin(Date.now() * 0.001) * 0.02;
    groupRef.current.position.y = floatY;
  });

  if (!visible) return null;

  return (
    <group 
      ref={groupRef}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    >
      {/* 左页（翻开的左侧）- 几乎平摊 */}
      <group rotation={[0, openAngle, 0]} position={[-pageWidth * 0.5, 0, 0]}>
        {/* 左页正面 */}
        <mesh position={[0, 0, 0.005]}>
          <boxGeometry args={[pageWidth, pageHeight, 0.01]} />
          <meshStandardMaterial
            color="#faf8f5"
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>

        {/* 左页书脊边缘 */}
        <mesh position={[pageWidth * 0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.01, pageHeight, 0.02]} />
          <meshStandardMaterial color="#e8e0d8" roughness={0.95} />
        </mesh>
      </group>

      {/* 右页（翻开的右侧）- 几乎平摊 */}
      <group rotation={[0, -openAngle, 0]} position={[pageWidth * 0.5, 0, 0]}>
        {/* 右页正面 */}
        <mesh position={[0, 0, 0.005]}>
          <boxGeometry args={[pageWidth, pageHeight, 0.01]} />
          <meshStandardMaterial
            color="#faf8f5"
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>

        {/* 右页书脊边缘 */}
        <mesh position={[-pageWidth * 0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.01, pageHeight, 0.02]} />
          <meshStandardMaterial color="#e8e0d8" roughness={0.95} />
        </mesh>
      </group>

      {/* 左页内容 - 使用billboard效果，内容始终面向摄像机 */}
      <BillboardPage
        content={leftPage}
        width={pageWidth}
        height={pageHeight}
        side="left"
        basePosition={[-pageWidth * 0.5, 0, 0]}
        pageRotation={[0, openAngle, 0]}
      />

      {/* 右页内容 - 使用billboard效果，内容始终面向摄像机 */}
      <BillboardPage
        content={rightPage}
        width={pageWidth}
        height={pageHeight}
        side="right"
        basePosition={[pageWidth * 0.5, 0, 0]}
        pageRotation={[0, -openAngle, 0]}
      />

      {/* 书脊（中间） */}
      <mesh position={[0, 0, -0.03]}>
        <boxGeometry args={[0.04, pageHeight, 0.12]} />
        <meshStandardMaterial color="#654321" roughness={0.9} />
      </mesh>

      {/* 当前页码指示 - 底部，也使用billboard效果 */}
      <BillboardText
        position={[0, -pageHeight * 0.52, 0.05]}
        text={`${currentPage} ${t.book?.viewer?.of || '-'} ${currentPage + 1}`}
        fontSize={0.12}
        color="#666666"
      />

      {/* 悬浮高亮效果 */}
      {hovered && (
        <>
          <mesh position={[0, 0, -0.1]}>
            <planeGeometry args={[pageWidth * 3, pageHeight * 1.3]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.1}
              side={THREE.BackSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

// 单页内容渲染组件 - 使用billboard效果让内容始终面向摄像机
interface BillboardPageProps {
  content: PageContentData;
  width: number;
  height: number;
  side: 'left' | 'right';
  /** 基础位置（未旋转前） */
  basePosition: [number, number, number];
  /** 页面旋转角度 */
  pageRotation: [number, number, number];
}

function BillboardPage({ content, width, height, side, basePosition, pageRotation }: BillboardPageProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // 计算页面的世界坐标位置（考虑旋转）
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler(...pageRotation);
    quaternion.setFromEuler(euler);
    
    // 计算内容应该放置的位置：基础位置 + 沿页面法线方向的偏移
    const offset = new THREE.Vector3(0, 0, 0.03); // 内容稍微浮起
    offset.applyQuaternion(quaternion);
    
    const worldPos = new THREE.Vector3(...basePosition).add(offset);
    groupRef.current.position.copy(worldPos);
    
    // 让内容始终面向摄像机（billboard效果）
    // 使用lookAt让内容的Z轴指向摄像机
    const cameraPos = state.camera.position.clone();
    groupRef.current.lookAt(cameraPos);
  });

  const hasImage = content.imageUrl;
  const hasText = content.text || content.title;

  return (
    <group ref={groupRef}>
      {/* 页面背景 */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[width - 0.1, height - 0.1]} />
        <meshStandardMaterial
          color={content.backgroundColor || '#faf8f5'}
          roughness={0.9}
        />
      </mesh>

      {/* 标题 */}
      {content.title && (
        <Text
          position={[0, height * 0.35, 0.02]}
          fontSize={0.15}
          color="#333333"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.3}
        >
          {content.title}
        </Text>
      )}

      {/* 图片 */}
      {hasImage && (
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[width - 0.2, width - 0.2]} />
          <meshStandardMaterial
            color="#e0e0e0"
            roughness={0.5}
          />
        </mesh>
      )}

      {/* 图片描述 */}
      {content.imageCaption && (
        <Text
          position={[0, -width * 0.3, 0.02]}
          fontSize={0.08}
          color="#666666"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.2}
        >
          {content.imageCaption}
        </Text>
      )}

      {/* 文本内容 */}
      {hasText && content.text && (
        <Text
          position={[0, hasImage ? -height * 0.15 : -height * 0.05, 0.02]}
          fontSize={0.08}
          color="#444444"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.2}
          lineHeight={1.5}
        >
          {content.text}
        </Text>
      )}

      {/* 页码 */}
      <Text
        position={[side === 'left' ? -width * 0.4 : width * 0.4, -height * 0.45, 0.02]}
        fontSize={0.07}
        color="#999999"
        anchorX="center"
        anchorY="middle"
      >
        {content.pageNumber}
      </Text>
    </group>
  );
}

// Billboard文本组件 - 始终面向摄像机的文本
interface BillboardTextProps {
  position: [number, number, number];
  text: string;
  fontSize: number;
  color: string;
}

function BillboardText({ position, text, fontSize, color }: BillboardTextProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    // 让文本始终面向摄像机
    const cameraPos = state.camera.position.clone();
    groupRef.current.lookAt(cameraPos);
  });

  return (
    <group ref={groupRef} position={position}>
      <Text
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#ffffff"
      >
        {text}
      </Text>
    </group>
  );
}

export default OpenBook;
