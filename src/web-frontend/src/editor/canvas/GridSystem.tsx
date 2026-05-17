/**
 * 12列响应式栅格系统
 * 12-Column Responsive Grid System
 *
 * 提供画布中的辅助线显示：
 * - 12列栅格辅助线
 * - 列宽自适应画布宽度
 * - 辅助线可开关
 * - 组件自动对齐到栅格
 */
import React, { useMemo } from 'react';
import { useEditorStore } from '../store/editorStore';
import { BREAKPOINTS } from '../types/page-schema';
import type { ResponsiveBreakpoint } from '../types/page-schema';

/** 栅格系统属性 */
export interface GridSystemProps {
  /** 画布内容区域宽度（px） */
  canvasWidth: number;
  /** 是否显示栅格辅助线 */
  showGrid: boolean;
  /** 是否吸附到栅格 */
  snapToGrid: boolean;
  /** 自定义栅格列数（默认12） */
  columns?: number;
  /** 栅格间距（px，默认20，对应gutter） */
  gutter?: number;
}

/** 栅格计算结果 */
export interface GridInfo {
  /** 总列数 */
  columns: number;
  /** 单列宽度（px） */
  columnWidth: number;
  /** 间距宽度（px） */
  gutterWidth: number;
  /** 栅格位置数组（每列的左边缘x坐标） */
  columnPositions: number[];
  /** 栅格吸附点（列边界x坐标集合） */
  snapPoints: number[];
}

/**
 * 计算栅格信息
 * @param canvasWidth - 画布宽度
 * @param columns - 列数
 * @param gutter - 间距
 */
export function calculateGrid(
  canvasWidth: number,
  columns: number = 12,
  gutter: number = 20,
): GridInfo {
  // 总间距数 = 列数 + 1（左右边距 + 列间距）
  const totalGutter = gutter * (columns + 1);
  const availableWidth = canvasWidth - totalGutter;
  const columnWidth = Math.max(1, availableWidth / columns);

  const columnPositions: number[] = [];
  const snapPoints = new Set<number>();

  // 左右边距
  const sidePadding = gutter;

  for (let i = 0; i < columns; i++) {
    const x = sidePadding + i * (columnWidth + gutter);
    columnPositions.push(x);
    snapPoints.add(Math.round(x));
    snapPoints.add(Math.round(x + columnWidth));
  }

  // 添加画布边缘的吸附点
  snapPoints.add(0);
  snapPoints.add(Math.round(canvasWidth));

  return {
    columns,
    columnWidth,
    gutterWidth: gutter,
    columnPositions,
    snapPoints: Array.from(snapPoints).sort((a, b) => a - b),
  };
}

/**
 * 将x坐标吸附到最近的栅格点
 * @param x - 目标x坐标
 * @param gridInfo - 栅格信息
 * @param threshold - 吸附阈值（px）
 */
export function snapToGridPoint(
  x: number,
  gridInfo: GridInfo,
  threshold: number = 5,
): number {
  let closest = x;
  let minDist = threshold;

  for (const point of gridInfo.snapPoints) {
    const dist = Math.abs(x - point);
    if (dist < minDist) {
      minDist = dist;
      closest = point;
    }
  }

  return closest;
}

/**
 * 获取当前设备模式对应的画布宽度
 */
export function getCanvasWidthForDevice(
  deviceMode: ResponsiveBreakpoint,
  customWidth?: number,
): number {
  if (customWidth !== undefined) return customWidth;
  return BREAKPOINTS[deviceMode]?.canvasWidth ?? 1440;
}

/** 栅格系统组件 */
export const GridSystem: React.FC<GridSystemProps> = ({
  canvasWidth,
  showGrid,
  snapToGrid: _snapToGrid,
  columns = 12,
  gutter = 20,
}) => {
  const deviceMode = useEditorStore((s) => s.canvas.deviceMode);
  const effectiveWidth = canvasWidth || getCanvasWidthForDevice(deviceMode);

  const gridInfo = useMemo(
    () => calculateGrid(effectiveWidth, columns, gutter),
    [effectiveWidth, columns, gutter],
  );

  if (!showGrid) return null;

  const columnElements = gridInfo.columnPositions.map((x, i) => (
    <div
      key={`col-${i}`}
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: gridInfo.columnWidth,
        height: '100%',
        borderLeft: '1px solid rgba(59, 130, 246, 0.15)',
        borderRight: '1px solid rgba(59, 130, 246, 0.15)',
        backgroundColor: 'rgba(59, 130, 246, 0.03)',
        pointerEvents: 'none',
      }}
    />
  ));

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: effectiveWidth,
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {columnElements}
    </div>
  );
};

GridSystem.displayName = 'GridSystem';

export default GridSystem;
