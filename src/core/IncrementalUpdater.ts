/**
 * IncrementalUpdater
 * 증분 업데이트 및 부분 리렌더링 관리
 */

import type { Task, TimeRange } from '../types/index.js';
import type { DataChangeEvent } from '../data/DataSource.js';
import type { ContextLayoutResult } from './CollisionLayoutEngine.js';

/**
 * 변경 영역 정보
 */
export interface DirtyRegion {
  /** 영향받는 Dimension 값들 */
  dimensionValues: Set<string>;
  /** 영향받는 시간 범위 */
  timeRange: TimeRange | null;
  /** 전체 재계산 필요 여부 */
  fullRecalculate: boolean;
}

/**
 * 업데이트 콜백
 */
export type UpdateCallback = (region: DirtyRegion) => void;

/**
 * IncrementalUpdater 클래스
 * 데이터 변경을 추적하고 최소한의 영역만 재계산하도록 관리합니다.
 */
export class IncrementalUpdater<T = unknown> {
  private pendingChanges: DataChangeEvent<T>[] = [];
  private updateScheduled: boolean = false;
  private updateCallbacks: Set<UpdateCallback> = new Set();
  private batchTimeout: number | null = null;

  // 설정
  private batchDelay: number = 16; // ~60fps

  constructor(batchDelay?: number) {
    if (batchDelay !== undefined) {
      this.batchDelay = batchDelay;
    }
  }

  /**
   * 데이터 변경 알림
   */
  notifyChange(event: DataChangeEvent<T>): void {
    this.pendingChanges.push(event);
    this.scheduleUpdate();
  }

  /**
   * 업데이트 콜백 등록
   */
  onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  /**
   * 즉시 업데이트 강제 실행
   */
  flush(): void {
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.processChanges();
  }

  /**
   * 대기 중인 변경사항 취소
   */
  clear(): void {
    this.pendingChanges = [];
    if (this.batchTimeout !== null) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.updateScheduled = false;
  }

  /**
   * 배치 딜레이 설정
   */
  setBatchDelay(delay: number): void {
    this.batchDelay = delay;
  }

  // =========================================================================
  // Private
  // =========================================================================

  /**
   * 업데이트 스케줄링
   */
  private scheduleUpdate(): void {
    if (this.updateScheduled) return;

    this.updateScheduled = true;
    this.batchTimeout = window.setTimeout(() => {
      this.processChanges();
    }, this.batchDelay);
  }

  /**
   * 변경사항 처리
   */
  private processChanges(): void {
    this.updateScheduled = false;
    this.batchTimeout = null;

    if (this.pendingChanges.length === 0) return;

    // 변경사항 분석하여 dirty region 계산
    const dirtyRegion = this.calculateDirtyRegion(this.pendingChanges);
    this.pendingChanges = [];

    // 콜백 호출
    this.updateCallbacks.forEach(callback => callback(dirtyRegion));
  }

  /**
   * Dirty region 계산
   */
  private calculateDirtyRegion(changes: DataChangeEvent<T>[]): DirtyRegion {
    const dimensionValues = new Set<string>();
    let minStart: number | null = null;
    let maxEnd: number | null = null;
    let fullRecalculate = false;

    for (const change of changes) {
      switch (change.type) {
        case 'add':
        case 'delete':
          if (change.task) {
            this.collectDimensionValues(change.task, dimensionValues);
            this.expandTimeRange(change.task, (start, end) => {
              if (minStart === null || start < minStart) minStart = start;
              if (maxEnd === null || end > maxEnd) maxEnd = end;
            });
          }
          break;

        case 'update':
          if (change.task) {
            this.collectDimensionValues(change.task, dimensionValues);

            // 시간이나 dimension이 변경된 경우
            if (change.changedFields?.includes('start') ||
                change.changedFields?.includes('end') ||
                change.changedFields?.includes('dimensions')) {

              // 이전 값도 영향 범위에 포함
              if (change.previousValues?.dimensions) {
                this.collectDimensionValuesFromRecord(
                  change.previousValues.dimensions as Record<string, string | string[]>,
                  dimensionValues
                );
              }

              this.expandTimeRange(change.task, (start, end) => {
                if (minStart === null || start < minStart) minStart = start;
                if (maxEnd === null || end > maxEnd) maxEnd = end;
              });

              // 이전 시간 범위도 포함
              if (change.previousValues?.start) {
                const prevStart = (change.previousValues.start as Date).getTime();
                if (minStart === null || prevStart < minStart) minStart = prevStart;
              }
              if (change.previousValues?.end) {
                const prevEnd = (change.previousValues.end as Date).getTime();
                if (maxEnd === null || prevEnd > maxEnd) maxEnd = prevEnd;
              }
            } else {
              // 스타일만 변경 (레이아웃 재계산 불필요)
              this.expandTimeRange(change.task, (start, end) => {
                if (minStart === null || start < minStart) minStart = start;
                if (maxEnd === null || end > maxEnd) maxEnd = end;
              });
            }
          }
          break;

        case 'bulk':
          // 대량 변경은 전체 재계산
          fullRecalculate = true;
          if (change.tasks) {
            for (const task of change.tasks) {
              this.collectDimensionValues(task, dimensionValues);
            }
          }
          break;
      }
    }

    return {
      dimensionValues,
      timeRange: minStart !== null && maxEnd !== null
        ? { start: new Date(minStart), end: new Date(maxEnd) }
        : null,
      fullRecalculate,
    };
  }

  /**
   * Task에서 dimension 값 수집
   */
  private collectDimensionValues(task: Task<T>, set: Set<string>): void {
    this.collectDimensionValuesFromRecord(task.dimensions, set);
  }

  /**
   * Record에서 dimension 값 수집
   */
  private collectDimensionValuesFromRecord(
    dimensions: Record<string, string | string[]>,
    set: Set<string>,
  ): void {
    for (const value of Object.values(dimensions)) {
      if (Array.isArray(value)) {
        value.forEach(v => set.add(v));
      } else {
        set.add(value);
      }
    }
  }

  /**
   * 시간 범위 확장
   */
  private expandTimeRange(
    task: Task<T>,
    callback: (start: number, end: number) => void,
  ): void {
    callback(task.start.getTime(), task.end.getTime());
  }
}

// ============================================================================
// 레이아웃 캐시
// ============================================================================

/**
 * 레이아웃 캐시
 * Context별 레이아웃 결과를 캐싱합니다.
 */
export class LayoutCache<T = unknown> {
  private cache: Map<string, ContextLayoutResult<T>> = new Map();
  private version: number = 0;

  /**
   * 캐시된 레이아웃 가져오기
   */
  get(dimensionValue: string): ContextLayoutResult<T> | undefined {
    return this.cache.get(dimensionValue);
  }

  /**
   * 레이아웃 캐싱
   */
  set(dimensionValue: string, layout: ContextLayoutResult<T>): void {
    this.cache.set(dimensionValue, layout);
  }

  /**
   * 특정 dimension 값의 캐시 무효화
   */
  invalidate(dimensionValue: string): void {
    this.cache.delete(dimensionValue);
    this.version++;
  }

  /**
   * 여러 dimension 값의 캐시 무효화
   */
  invalidateMany(dimensionValues: Set<string>): void {
    for (const value of dimensionValues) {
      this.cache.delete(value);
    }
    this.version++;
  }

  /**
   * 전체 캐시 무효화
   */
  invalidateAll(): void {
    this.cache.clear();
    this.version++;
  }

  /**
   * 캐시 버전 (변경 추적용)
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * 캐시된 모든 dimension 값
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  /**
   * 캐시 크기
   */
  get size(): number {
    return this.cache.size;
  }
}
