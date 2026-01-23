/**
 * Dimension Timeline 타입 정의
 */

// ============================================================================
// Task 관련 타입
// ============================================================================

/**
 * Task 상태
 */
export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

/**
 * Task 데이터 인터페이스
 * @template T - 메타데이터 타입
 */
export interface Task<T = unknown> {
  /** 고유 식별자 */
  id: string;
  /** 시작 시간 */
  start: Date;
  /** 종료 시간 */
  end: Date;
  /** Dimension 값 매핑 (key: dimension 이름, value: dimension 값 또는 배열) */
  dimensions: Record<string, string | string[]>;
  /** 표시 라벨 */
  label?: string;
  /** 색상 (CSS 색상 값) */
  color?: string;
  /** 상태 */
  status?: TaskStatus;
  /** 진행률 (0-100) */
  progress?: number;
  /** 사용자 정의 메타데이터 */
  metadata?: T;
}

/**
 * Task 생성 시 필요한 데이터 (id 제외)
 */
export type TaskCreate<T = unknown> = Omit<Task<T>, 'id'>;

/**
 * Task 업데이트 시 변경 가능한 데이터
 */
export type TaskUpdate<T = unknown> = Partial<Omit<Task<T>, 'id'>>;

// ============================================================================
// Dimension 관련 타입
// ============================================================================

/**
 * Dimension 정의
 */
export interface Dimension {
  /** Dimension 식별자 (예: 'project', 'assignee') */
  key: string;
  /** 표시 라벨 */
  label: string;
  /** 아이콘 (선택) */
  icon?: string;
  /** Dimension 값 목록 (선택, 없으면 Task에서 자동 추출) */
  values?: DimensionValue[];
}

/**
 * Dimension 값 정의
 */
export interface DimensionValue {
  /** 값 식별자 */
  key: string;
  /** 표시 라벨 */
  label: string;
  /** 색상 (선택) */
  color?: string;
  /** 아이콘 (선택) */
  icon?: string;
}

// ============================================================================
// 시간 관련 타입
// ============================================================================

/**
 * 시간 범위
 */
export interface TimeRange {
  /** 시작 시간 */
  start: Date;
  /** 종료 시간 */
  end: Date;
}

/**
 * 타임 영역 타입
 */
export type TimeRegionType = 'holiday' | 'work-shift' | 'break' | 'custom';

/**
 * 타임 영역 (공휴일, 근무시간대 등)
 * 세로로 타임라인을 가로지르는 영역
 */
export interface TimeRegion {
  /** 고유 식별자 */
  id: string;
  /** 시작 시간 */
  start: Date;
  /** 종료 시간 */
  end: Date;
  /** 라벨 */
  label?: string;
  /** 영역 타입 */
  type: TimeRegionType;
  /** 배경 색상 */
  color?: string;
  /** 배경 투명도 (0-1) */
  opacity?: number;
  /** 반복 패턴 (선택) - daily, weekly 등 */
  recurring?: 'daily' | 'weekly' | 'monthly' | 'none';
  /** 반복 종료일 (recurring 사용 시) */
  recurringEnd?: Date;
}

/**
 * 시간 스케일 단위
 */
export type TimeScaleUnit = '10min' | 'hour' | 'day' | 'week';

/**
 * 시간 스케일 설정
 */
export interface TimeScaleConfig {
  /** 현재 스케일 단위 */
  unit: TimeScaleUnit;
  /** 단위당 픽셀 수 */
  pixelsPerUnit: number;
  /** 최소 픽셀 수 (줌 아웃 한계) */
  minPixelsPerUnit: number;
  /** 최대 픽셀 수 (줌 인 한계) */
  maxPixelsPerUnit: number;
}

// ============================================================================
// 뷰포트 관련 타입
// ============================================================================

/**
 * 뷰포트 상태
 */
export interface ViewportState {
  /** 보이는 시간 범위 */
  visibleRange: TimeRange;
  /** 스크롤 오프셋 X (픽셀) */
  scrollX: number;
  /** 스크롤 오프셋 Y (픽셀) */
  scrollY: number;
  /** 줌 레벨 (1.0 = 기본) */
  zoom: number;
}

// ============================================================================
// 레이아웃 관련 타입
// ============================================================================

/**
 * 레이아웃된 Task 정보
 */
export interface LayoutedTask<T = unknown> {
  /** 원본 Task 데이터 */
  task: Task<T>;
  /** X 좌표 (픽셀) */
  x: number;
  /** Y 좌표 (픽셀) - Context 내 상대 좌표 */
  y: number;
  /** 너비 (픽셀) */
  width: number;
  /** 높이 (픽셀) */
  height: number;
  /** 할당된 행 번호 (충돌 레이아웃 결과) */
  row: number;
}

/**
 * Context (Dimension 값별 그룹) 레이아웃 정보
 */
export interface ContextLayout {
  /** Dimension 값 */
  dimensionValue: string;
  /** 표시 라벨 */
  label: string;
  /** Y 시작 좌표 (픽셀) */
  y: number;
  /** 전체 높이 (픽셀) */
  height: number;
  /** 행 수 */
  rowCount: number;
  /** 접힘 상태 */
  collapsed: boolean;
}

// ============================================================================
// 옵션 타입
// ============================================================================

/**
 * Timeline 컴포넌트 옵션
 */
export interface TimelineOptions {
  /** 초기 시간 범위 */
  initialRange?: TimeRange;
  /** 초기 스케일 단위 */
  initialScale?: TimeScaleUnit;
  /** 줌 활성화 */
  zoomable?: boolean;
  /** 팬 활성화 */
  pannable?: boolean;
  /** Task 드래그 이동 활성화 */
  tasksDraggable?: boolean;
  /** Task 리사이즈 활성화 */
  tasksResizable?: boolean;
  /** Cross-dimension 이동 활성화 */
  crossDimensionMove?: boolean;
  /** Task 높이 (픽셀) */
  taskHeight?: number;
  /** Task 간 간격 (픽셀) */
  taskGap?: number;
  /** Context 헤더 높이 (픽셀) */
  contextHeaderHeight?: number;
  /** 시간축 헤더 높이 (픽셀) */
  timeAxisHeight?: number;
  /** Dimension 선택기 너비 (픽셀) */
  dimensionSelectorWidth?: number;
}

/**
 * 기본 옵션 값
 */
export const DEFAULT_OPTIONS: Required<TimelineOptions> = {
  initialRange: {
    start: new Date(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1주일
  },
  initialScale: 'day',
  zoomable: true,
  pannable: true,
  tasksDraggable: true,
  tasksResizable: true,
  crossDimensionMove: true,
  taskHeight: 32,
  taskGap: 4,
  contextHeaderHeight: 40,
  timeAxisHeight: 48,
  dimensionSelectorWidth: 200,
};

// ============================================================================
// 히트 테스트 타입
// ============================================================================

/**
 * 히트 테스트 영역 타입
 */
export type HitArea = 'body' | 'resize-start' | 'resize-end' | 'none';

/**
 * 히트 테스트 결과
 */
export interface HitTestResult<T = unknown> {
  /** 히트된 Task (없으면 null) */
  task: Task<T> | null;
  /** 히트된 영역 */
  area: HitArea;
  /** Dimension 값 */
  dimensionValue: string | null;
}

// ============================================================================
// 드래그 관련 타입
// ============================================================================

/**
 * 드래그 모드
 */
export type DragMode = 'move' | 'resize-start' | 'resize-end' | 'none';

/**
 * 드래그 상태
 */
export interface DragState<T = unknown> {
  /** 드래그 중인 Task */
  task: Task<T>;
  /** 드래그 모드 */
  mode: DragMode;
  /** 시작 X 좌표 */
  startX: number;
  /** 시작 Y 좌표 */
  startY: number;
  /** 시작 시 Task 시작 시간 */
  originalStart: Date;
  /** 시작 시 Task 종료 시간 */
  originalEnd: Date;
  /** 시작 시 Dimension 값 */
  originalDimensionValue: string;
  /** 현재 스냅된 시작 시간 */
  snappedStart: Date;
  /** 현재 스냅된 종료 시간 */
  snappedEnd: Date;
  /** 현재 Dimension 값 */
  currentDimensionValue: string;
}
