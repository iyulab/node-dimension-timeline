/**
 * TaskTemplate
 * Task 렌더링 템플릿 인터페이스
 */

import type { Task, LayoutedTask, TaskStatus } from '../types/index.js';

/**
 * 렌더링 컨텍스트
 */
export interface RenderContext {
  /** Canvas 2D 컨텍스트 */
  ctx: CanvasRenderingContext2D;
  /** 디바이스 픽셀 비율 */
  dpr: number;
  /** 현재 줌 레벨 */
  zoom: number;
  /** 현재 시간 */
  now: Date;
}

/**
 * Task 상태별 스타일
 */
export interface TaskStateStyle {
  /** 배경색 */
  backgroundColor: string;
  /** 테두리 색 */
  borderColor: string;
  /** 텍스트 색 */
  textColor: string;
  /** 테두리 두께 */
  borderWidth: number;
  /** 투명도 (0-1) */
  opacity: number;
}

/**
 * 전체 Task 스타일 설정
 */
export interface TaskStyleConfig {
  /** 상태별 스타일 */
  states: Record<TaskStatus | 'default', TaskStateStyle>;
  /** 선택됨 스타일 오버레이 */
  selected: Partial<TaskStateStyle>;
  /** 호버 스타일 오버레이 */
  hovered: Partial<TaskStateStyle>;
  /** 드래그 중 스타일 오버레이 */
  dragging: Partial<TaskStateStyle>;
  /** 둥근 모서리 반경 */
  borderRadius: number;
  /** 폰트 패밀리 */
  fontFamily: string;
  /** 폰트 크기 */
  fontSize: number;
  /** 폰트 굵기 */
  fontWeight: string;
  /** 내부 패딩 */
  padding: number;
  /** 프로그레스 바 높이 */
  progressBarHeight: number;
  /** 프로그레스 바 색상 */
  progressBarColor: string;
  /** 프로그레스 바 배경색 */
  progressBarBgColor: string;
  /** 리사이즈 핸들 너비 */
  resizeHandleWidth: number;
  /** 리사이즈 핸들 색상 */
  resizeHandleColor: string;
}

/**
 * 기본 스타일 설정
 */
export const DEFAULT_STYLE_CONFIG: TaskStyleConfig = {
  states: {
    default: {
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      textColor: '#FFFFFF',
      borderWidth: 1,
      opacity: 1,
    },
    pending: {
      backgroundColor: '#9CA3AF',
      borderColor: '#6B7280',
      textColor: '#FFFFFF',
      borderWidth: 1,
      opacity: 0.8,
    },
    'in-progress': {
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      textColor: '#FFFFFF',
      borderWidth: 1,
      opacity: 1,
    },
    completed: {
      backgroundColor: '#10B981',
      borderColor: '#059669',
      textColor: '#FFFFFF',
      borderWidth: 1,
      opacity: 1,
    },
    cancelled: {
      backgroundColor: '#EF4444',
      borderColor: '#DC2626',
      textColor: '#FFFFFF',
      borderWidth: 1,
      opacity: 0.6,
    },
  },
  selected: {
    borderColor: '#1D4ED8',
    borderWidth: 2,
  },
  hovered: {
    opacity: 0.9,
  },
  dragging: {
    opacity: 0.7,
  },
  borderRadius: 4,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 12,
  fontWeight: '500',
  padding: 6,
  progressBarHeight: 3,
  progressBarColor: 'rgba(255, 255, 255, 0.8)',
  progressBarBgColor: 'rgba(0, 0, 0, 0.2)',
  resizeHandleWidth: 6,
  resizeHandleColor: 'rgba(255, 255, 255, 0.4)',
};

/**
 * TaskTemplate 인터페이스
 * Task 렌더링을 커스터마이징하기 위한 템플릿
 */
export interface TaskTemplate<T = unknown> {
  /** 템플릿 이름 */
  name: string;

  /**
   * Task 렌더링
   * @param layoutedTask 레이아웃된 Task 정보
   * @param context 렌더링 컨텍스트
   * @param state 현재 상태 (selected, hovered, dragging)
   */
  render(
    layoutedTask: LayoutedTask<T>,
    context: RenderContext,
    state: {
      selected: boolean;
      hovered: boolean;
      dragging: boolean;
    },
  ): void;

  /**
   * Task 색상 결정 (선택적)
   * Task의 color 속성이 없을 때 사용
   */
  getColor?(task: Task<T>): string;

  /**
   * Task 라벨 결정 (선택적)
   * Task의 label 속성 대신 사용
   */
  getLabel?(task: Task<T>): string;

  /**
   * 스타일 설정 가져오기
   */
  getStyleConfig(): TaskStyleConfig;

  /**
   * 스타일 설정 수정
   */
  setStyleConfig(config: Partial<TaskStyleConfig>): void;
}
