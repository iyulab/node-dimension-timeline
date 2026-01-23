/**
 * HitTestManager
 * 마우스 히트 테스트 담당
 */

import type { Task, LayoutedTask, HitTestResult, HitArea } from '../types/index.js';
import type { ContextLayoutResult } from './CollisionLayoutEngine.js';
import { IntervalTree } from '../utilities/IntervalTree.js';

/**
 * 히트 테스트 옵션
 */
export interface HitTestOptions {
  /** 리사이즈 핸들 너비 */
  resizeHandleWidth: number;
  /** 히트 테스트 여유 공간 */
  hitPadding: number;
}

const DEFAULT_HIT_TEST_OPTIONS: HitTestOptions = {
  resizeHandleWidth: 8,
  hitPadding: 2,
};

/**
 * 캐시된 Task 정보
 */
export interface CachedTask<T = unknown> {
  layoutedTask: LayoutedTask<T>;
  dimensionValue: string;
  absoluteY: number;
}

/**
 * HitTestManager 클래스
 * 마우스 좌표에서 Task를 찾고 히트 영역을 판별합니다.
 */
export class HitTestManager<T = unknown> {
  private options: HitTestOptions;
  private xIntervalTree: IntervalTree<CachedTask<T>> = new IntervalTree();
  private taskMap: Map<string, CachedTask<T>> = new Map();

  constructor(options: Partial<HitTestOptions> = {}) {
    this.options = { ...DEFAULT_HIT_TEST_OPTIONS, ...options };
  }

  /**
   * 레이아웃 데이터로 인덱스 구축
   */
  buildIndex(
    contexts: ContextLayoutResult<T>[],
    contextPositions: Map<string, { y: number; height: number }>,
  ): void {
    this.xIntervalTree.clear();
    this.taskMap.clear();

    for (const context of contexts) {
      const position = contextPositions.get(context.dimensionValue);
      if (!position) continue;

      for (const layoutedTask of context.tasks) {
        const absoluteY = position.y + layoutedTask.y;

        const cached: CachedTask<T> = {
          layoutedTask,
          dimensionValue: context.dimensionValue,
          absoluteY,
        };

        this.taskMap.set(layoutedTask.task.id, cached);

        // X 좌표 기반 IntervalTree에 추가
        this.xIntervalTree.insert({
          start: layoutedTask.x,
          end: layoutedTask.x + layoutedTask.width,
          data: cached,
        });
      }
    }
  }

  /**
   * 히트 테스트 수행
   */
  hitTest(x: number, y: number, scrollY: number): HitTestResult<T> {
    const adjustedY = y + scrollY;

    // X 범위에 해당하는 Task들 조회
    const candidates = this.xIntervalTree.query({
      start: x - this.options.hitPadding,
      end: x + this.options.hitPadding,
    });

    // Y 좌표도 확인하여 실제 히트된 Task 찾기
    for (const candidate of candidates) {
      const cached = candidate.data;
      const { layoutedTask, dimensionValue, absoluteY } = cached;

      if (adjustedY >= absoluteY - this.options.hitPadding &&
          adjustedY <= absoluteY + layoutedTask.height + this.options.hitPadding) {
        // 히트됨 - 영역 판별
        const area = this.determineHitArea(x, layoutedTask);

        return {
          task: layoutedTask.task,
          area,
          dimensionValue,
        };
      }
    }

    // 히트된 Task 없음 - Dimension 영역 확인
    return {
      task: null,
      area: 'none',
      dimensionValue: this.findDimensionAtY(adjustedY),
    };
  }

  /**
   * 특정 영역 내 모든 Task 조회
   */
  queryRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    scrollY: number,
  ): Array<{ task: Task<T>; dimensionValue: string }> {
    const adjustedY = y + scrollY;
    const candidates = this.xIntervalTree.query({
      start: x,
      end: x + width,
    });

    const results: Array<{ task: Task<T>; dimensionValue: string }> = [];

    for (const candidate of candidates) {
      const cached = candidate.data;
      const { layoutedTask, dimensionValue, absoluteY } = cached;

      // Y 범위 확인
      if (absoluteY + layoutedTask.height > adjustedY &&
          absoluteY < adjustedY + height) {
        results.push({
          task: layoutedTask.task,
          dimensionValue,
        });
      }
    }

    return results;
  }

  /**
   * ID로 Task 정보 조회
   */
  getTaskById(id: string): CachedTask<T> | undefined {
    return this.taskMap.get(id);
  }

  /**
   * 특정 좌표에서 가장 가까운 Task
   */
  findNearestTask(
    x: number,
    y: number,
    scrollY: number,
    maxDistance: number = 50,
  ): { task: Task<T>; distance: number } | null {
    const adjustedY = y + scrollY;
    const allTasks = this.xIntervalTree.getAll();

    let nearest: { task: Task<T>; distance: number } | null = null;

    for (const item of allTasks) {
      const cached = item.data;
      const { layoutedTask, absoluteY } = cached;

      // Task 중심점
      const centerX = layoutedTask.x + layoutedTask.width / 2;
      const centerY = absoluteY + layoutedTask.height / 2;

      // 거리 계산
      const distance = Math.sqrt(
        Math.pow(x - centerX, 2) + Math.pow(adjustedY - centerY, 2)
      );

      if (distance <= maxDistance) {
        if (!nearest || distance < nearest.distance) {
          nearest = { task: layoutedTask.task, distance };
        }
      }
    }

    return nearest;
  }

  /**
   * 옵션 업데이트
   */
  setOptions(options: Partial<HitTestOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 인덱스 클리어
   */
  clear(): void {
    this.xIntervalTree.clear();
    this.taskMap.clear();
  }

  // =========================================================================
  // Private
  // =========================================================================

  /**
   * 히트 영역 판별
   */
  private determineHitArea(x: number, layoutedTask: LayoutedTask<T>): HitArea {
    const handleWidth = this.options.resizeHandleWidth;

    // 왼쪽 리사이즈 핸들
    if (x >= layoutedTask.x && x <= layoutedTask.x + handleWidth) {
      return 'resize-start';
    }

    // 오른쪽 리사이즈 핸들
    const rightEdge = layoutedTask.x + layoutedTask.width;
    if (x >= rightEdge - handleWidth && x <= rightEdge) {
      return 'resize-end';
    }

    // 본문
    return 'body';
  }

  /**
   * Y 좌표에 해당하는 Dimension 값 찾기
   * (contextPositions 캐싱 필요 시 확장)
   */
  private findDimensionAtY(_y: number): string | null {
    // 현재 구현에서는 contextPositions를 저장하지 않으므로 null 반환
    // 필요시 buildIndex에서 contextPositions도 저장하여 구현
    return null;
  }

  // =========================================================================
  // Context Position 확장 (선택적)
  // =========================================================================

  private contextPositions: Map<string, { y: number; height: number }> = new Map();

  /**
   * Context 위치 정보 저장 (확장)
   */
  setContextPositions(positions: Map<string, { y: number; height: number }>): void {
    this.contextPositions = new Map(positions);
  }

  /**
   * Y 좌표에 해당하는 Dimension 값 찾기 (확장 버전)
   */
  findDimensionValueAtY(y: number, scrollY: number): string | null {
    const adjustedY = y + scrollY;

    for (const [dimensionValue, position] of this.contextPositions) {
      if (adjustedY >= position.y && adjustedY < position.y + position.height) {
        return dimensionValue;
      }
    }

    return null;
  }
}
