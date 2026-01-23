/**
 * Timeline 커스텀 이벤트 정의
 */

import type { Task, TimeScaleUnit, TimeRange } from '../types/index.js';

// ============================================================================
// Task 이벤트
// ============================================================================

/**
 * Task 선택 이벤트 상세
 */
export interface TimelineTaskSelectDetail<T = unknown> {
  task: Task<T>;
  previousTask: Task<T> | null;
  dimensionValue: string;
}

/**
 * Task 이동 이벤트 상세
 */
export interface TimelineTaskMoveDetail<T = unknown> {
  task: Task<T>;
  originalStart: Date;
  originalEnd: Date;
  newStart: Date;
  newEnd: Date;
  originalDimensionValue: string;
  newDimensionValue: string;
}

/**
 * Task 리사이즈 이벤트 상세
 */
export interface TimelineTaskResizeDetail<T = unknown> {
  task: Task<T>;
  originalStart: Date;
  originalEnd: Date;
  newStart: Date;
  newEnd: Date;
  edge: 'start' | 'end';
}

/**
 * Task 호버 이벤트 상세
 */
export interface TimelineTaskHoverDetail<T = unknown> {
  task: Task<T> | null;
  dimensionValue: string | null;
}

/**
 * Task 더블클릭 이벤트 상세
 */
export interface TimelineTaskDoubleClickDetail<T = unknown> {
  task: Task<T>;
  dimensionValue: string;
  x: number;
  y: number;
}

/**
 * Task 컨텍스트 메뉴 이벤트 상세
 */
export interface TimelineTaskContextMenuDetail<T = unknown> {
  task: Task<T>;
  dimensionValue: string;
  x: number;
  y: number;
  originalEvent: MouseEvent;
}

// ============================================================================
// Dimension 이벤트
// ============================================================================

/**
 * Dimension 변경 이벤트 상세
 */
export interface TimelineDimensionChangeDetail {
  previousDimension: string;
  newDimension: string;
}

/**
 * Dimension 값 클릭 이벤트 상세
 */
export interface TimelineDimensionValueClickDetail {
  dimension: string;
  value: string;
  label: string;
}

/**
 * Dimension 필터 이벤트 상세
 */
export interface TimelineDimensionFilterDetail {
  dimension: string;
  selectedValues: string[];
}

// ============================================================================
// 뷰 이벤트
// ============================================================================

/**
 * 뷰 변경 이벤트 상세
 */
export interface TimelineViewChangeDetail {
  visibleRange: TimeRange;
  scrollX: number;
  scrollY: number;
}

/**
 * 줌 이벤트 상세
 */
export interface TimelineZoomDetail {
  previousScale: TimeScaleUnit;
  newScale: TimeScaleUnit;
  previousZoom: number;
  newZoom: number;
  focusDate: Date | null;
}

/**
 * 스케일 변경 이벤트 상세
 */
export interface TimelineScaleChangeDetail {
  previousScale: TimeScaleUnit;
  newScale: TimeScaleUnit;
}

// ============================================================================
// 드래그 이벤트
// ============================================================================

/**
 * 드래그 시작 이벤트 상세
 */
export interface TimelineDragStartDetail<T = unknown> {
  task: Task<T>;
  mode: 'move' | 'resize-start' | 'resize-end';
  x: number;
  y: number;
}

/**
 * 드래그 중 이벤트 상세
 */
export interface TimelineDragDetail<T = unknown> {
  task: Task<T>;
  mode: 'move' | 'resize-start' | 'resize-end';
  x: number;
  y: number;
  snappedStart: Date;
  snappedEnd: Date;
  currentDimensionValue: string;
}

/**
 * 드래그 종료 이벤트 상세
 */
export interface TimelineDragEndDetail<T = unknown> {
  task: Task<T>;
  mode: 'move' | 'resize-start' | 'resize-end';
  cancelled: boolean;
}

// ============================================================================
// Canvas 이벤트
// ============================================================================

/**
 * Canvas 클릭 이벤트 상세
 */
export interface TimelineCanvasClickDetail {
  x: number;
  y: number;
  date: Date;
  dimensionValue: string | null;
}

/**
 * Canvas 더블클릭 이벤트 상세
 */
export interface TimelineCanvasDoubleClickDetail {
  x: number;
  y: number;
  date: Date;
  dimensionValue: string | null;
}

// ============================================================================
// Context 이벤트
// ============================================================================

/**
 * Context 토글 이벤트 상세
 */
export interface TimelineContextToggleDetail {
  dimensionValue: string;
  collapsed: boolean;
}

/**
 * Context 드롭 이벤트 상세
 */
export interface TimelineContextDropDetail {
  dimensionValue: string;
  dataTransfer: DataTransfer | null;
}

// ============================================================================
// 이벤트 타입 맵
// ============================================================================

/**
 * Timeline 이벤트 맵
 */
export interface TimelineEventMap {
  // Task 이벤트
  'timeline-task-select': CustomEvent<TimelineTaskSelectDetail>;
  'timeline-task-move': CustomEvent<TimelineTaskMoveDetail>;
  'timeline-task-resize': CustomEvent<TimelineTaskResizeDetail>;
  'timeline-task-hover': CustomEvent<TimelineTaskHoverDetail>;
  'timeline-task-dblclick': CustomEvent<TimelineTaskDoubleClickDetail>;
  'timeline-task-contextmenu': CustomEvent<TimelineTaskContextMenuDetail>;

  // Dimension 이벤트
  'timeline-dimension-change': CustomEvent<TimelineDimensionChangeDetail>;
  'timeline-dimension-value-click': CustomEvent<TimelineDimensionValueClickDetail>;
  'timeline-dimension-filter': CustomEvent<TimelineDimensionFilterDetail>;

  // 뷰 이벤트
  'timeline-view-change': CustomEvent<TimelineViewChangeDetail>;
  'timeline-zoom': CustomEvent<TimelineZoomDetail>;
  'timeline-scale-change': CustomEvent<TimelineScaleChangeDetail>;

  // 드래그 이벤트
  'timeline-drag-start': CustomEvent<TimelineDragStartDetail>;
  'timeline-drag': CustomEvent<TimelineDragDetail>;
  'timeline-drag-end': CustomEvent<TimelineDragEndDetail>;

  // Canvas 이벤트
  'timeline-canvas-click': CustomEvent<TimelineCanvasClickDetail>;
  'timeline-canvas-dblclick': CustomEvent<TimelineCanvasDoubleClickDetail>;

  // Context 이벤트
  'timeline-context-toggle': CustomEvent<TimelineContextToggleDetail>;
  'timeline-context-drop': CustomEvent<TimelineContextDropDetail>;
}

// ============================================================================
// 이벤트 생성 헬퍼
// ============================================================================

/**
 * Timeline 커스텀 이벤트 생성
 */
export function createTimelineEvent<K extends keyof TimelineEventMap>(
  type: K,
  detail: TimelineEventMap[K] extends CustomEvent<infer D> ? D : never,
  options?: { cancelable?: boolean; bubbles?: boolean; composed?: boolean },
): TimelineEventMap[K] {
  return new CustomEvent(type, {
    detail,
    bubbles: options?.bubbles ?? true,
    composed: options?.composed ?? true,
    cancelable: options?.cancelable ?? false,
  }) as TimelineEventMap[K];
}

/**
 * Task 선택 이벤트 (cancelable)
 */
export function createTaskSelectEvent<T = unknown>(
  detail: TimelineTaskSelectDetail<T>,
): CustomEvent<TimelineTaskSelectDetail<T>> {
  return new CustomEvent('timeline-task-select', {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
}

/**
 * Task 이동 이벤트 (cancelable)
 */
export function createTaskMoveEvent<T = unknown>(
  detail: TimelineTaskMoveDetail<T>,
): CustomEvent<TimelineTaskMoveDetail<T>> {
  return new CustomEvent('timeline-task-move', {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
}

/**
 * Task 리사이즈 이벤트 (cancelable)
 */
export function createTaskResizeEvent<T = unknown>(
  detail: TimelineTaskResizeDetail<T>,
): CustomEvent<TimelineTaskResizeDetail<T>> {
  return new CustomEvent('timeline-task-resize', {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
}
