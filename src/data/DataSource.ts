/**
 * DataSource 추상 인터페이스
 * Task 데이터의 CRUD 및 쿼리를 위한 추상 레이어
 */

import type { Task, TaskCreate, TaskUpdate, TimeRange } from '../types/index.js';

// ============================================================================
// 쿼리 관련 타입
// ============================================================================

/**
 * 데이터 쿼리 옵션
 */
export interface DataQueryOptions {
  /** 시간 범위 필터 */
  timeRange?: TimeRange;
  /** Dimension 필터 (key: dimension 이름, value: 필터할 값들) */
  dimensions?: Record<string, string | string[]>;
  /** 검색어 (label 검색) */
  search?: string;
  /** 상태 필터 */
  status?: Array<'pending' | 'in-progress' | 'completed' | 'cancelled'>;
  /** 정렬 기준 */
  sortBy?: 'start' | 'end' | 'label' | 'status';
  /** 정렬 방향 */
  sortDirection?: 'asc' | 'desc';
  /** 페이지네이션 - 오프셋 */
  offset?: number;
  /** 페이지네이션 - 개수 */
  limit?: number;
}

/**
 * 쿼리 결과
 */
export interface DataQueryResult<T = unknown> {
  /** 조회된 Task 목록 */
  tasks: Task<T>[];
  /** 전체 개수 (필터 적용 후) */
  totalCount: number;
  /** 쿼리 시간 (ms) */
  queryTime?: number;
}

// ============================================================================
// 변경 이벤트 관련 타입
// ============================================================================

/**
 * 변경 이벤트 타입
 */
export type DataChangeType = 'add' | 'update' | 'delete' | 'bulk';

/**
 * 변경 이벤트
 */
export interface DataChangeEvent<T = unknown> {
  /** 변경 타입 */
  type: DataChangeType;
  /** 변경된 Task (delete의 경우 삭제 전 데이터) */
  task?: Task<T>;
  /** 벌크 변경 시 여러 Task */
  tasks?: Task<T>[];
  /** 변경된 필드 (update의 경우) */
  changedFields?: Array<keyof Task<T>>;
  /** 이전 값 (update의 경우) */
  previousValues?: Partial<Task<T>>;
}

/**
 * 변경 이벤트 콜백
 */
export type DataChangeCallback<T = unknown> = (event: DataChangeEvent<T>) => void;

// ============================================================================
// DataSource 인터페이스
// ============================================================================

/**
 * DataSource 인터페이스
 * 모든 데이터 소스 구현체가 구현해야 하는 추상 인터페이스
 */
export interface DataSource<T = unknown> {
  // -------------------------------------------------------------------------
  // 조회
  // -------------------------------------------------------------------------

  /**
   * Task 목록 쿼리
   * @param options 쿼리 옵션
   */
  query(options?: DataQueryOptions): Promise<DataQueryResult<T>>;

  /**
   * ID로 Task 조회
   * @param id Task ID
   */
  getById(id: string): Promise<Task<T> | null>;

  /**
   * 여러 ID로 Task 조회
   * @param ids Task ID 배열
   */
  getByIds(ids: string[]): Promise<Task<T>[]>;

  /**
   * 특정 시간 범위 내 Task 조회 (최적화된 메서드)
   * @param range 시간 범위
   * @param dimensionKey 선택적 Dimension 키
   * @param dimensionValue 선택적 Dimension 값
   */
  getInRange(
    range: TimeRange,
    dimensionKey?: string,
    dimensionValue?: string,
  ): Promise<Task<T>[]>;

  // -------------------------------------------------------------------------
  // 생성/수정/삭제
  // -------------------------------------------------------------------------

  /**
   * Task 생성
   * @param task Task 생성 데이터 (id 제외)
   */
  add(task: TaskCreate<T>): Promise<Task<T>>;

  /**
   * 여러 Task 생성
   * @param tasks Task 생성 데이터 배열
   */
  addBulk(tasks: TaskCreate<T>[]): Promise<Task<T>[]>;

  /**
   * Task 수정
   * @param id Task ID
   * @param changes 변경할 필드들
   */
  update(id: string, changes: TaskUpdate<T>): Promise<Task<T>>;

  /**
   * Task 삭제
   * @param id Task ID
   */
  delete(id: string): Promise<void>;

  /**
   * 여러 Task 삭제
   * @param ids Task ID 배열
   */
  deleteBulk(ids: string[]): Promise<void>;

  // -------------------------------------------------------------------------
  // 이벤트 구독
  // -------------------------------------------------------------------------

  /**
   * 변경 이벤트 구독
   * @param callback 콜백 함수
   * @returns 구독 해제 함수
   */
  subscribe(callback: DataChangeCallback<T>): () => void;

  // -------------------------------------------------------------------------
  // 유틸리티
  // -------------------------------------------------------------------------

  /**
   * 모든 Dimension 값 목록 조회
   * @param dimensionKey Dimension 키
   */
  getDimensionValues(dimensionKey: string): Promise<string[]>;

  /**
   * 전체 Task 수 조회
   */
  count(): Promise<number>;

  /**
   * 전체 데이터의 시간 범위 조회
   */
  getTimeRange(): Promise<TimeRange | null>;

  /**
   * 데이터 소스 정리 (리소스 해제)
   */
  dispose(): void;
}
