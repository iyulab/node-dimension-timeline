/**
 * CollisionLayoutEngine
 * Task 충돌 감지 및 자동 개행 레이아웃 엔진
 * Interval Partitioning (Greedy) 알고리즘 기반
 */

import type { Task, LayoutedTask, TimeRange } from '../types/index.js';
import { TimeScale } from './TimeScale.js';

/**
 * Context별 레이아웃 결과
 */
export interface ContextLayoutResult<T = unknown> {
  /** Dimension 값 */
  dimensionValue: string;
  /** 레이아웃된 Task 목록 */
  tasks: LayoutedTask<T>[];
  /** 사용된 행 수 */
  rowCount: number;
  /** 전체 높이 (픽셀) */
  height: number;
}

/**
 * 전체 레이아웃 결과
 */
export interface LayoutResult<T = unknown> {
  /** Context별 레이아웃 */
  contexts: ContextLayoutResult<T>[];
  /** 전체 높이 (픽셀) */
  totalHeight: number;
  /** 레이아웃 계산 시간 (ms) */
  layoutTime: number;
}

/**
 * 레이아웃 옵션
 */
export interface LayoutOptions {
  /** Task 높이 */
  taskHeight: number;
  /** Task 간 수직 간격 */
  taskGap: number;
  /** 최소 Task 너비 (너무 좁은 Task 방지) */
  minTaskWidth: number;
  /** Task 간 수평 간격 (충돌 감지용) */
  horizontalPadding: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  taskHeight: 32,
  taskGap: 4,
  minTaskWidth: 20,
  horizontalPadding: 2,
};

/**
 * CollisionLayoutEngine 클래스
 * Task들의 시간 겹침을 감지하고 자동으로 행을 할당합니다.
 */
export class CollisionLayoutEngine {
  private options: LayoutOptions;

  constructor(options: Partial<LayoutOptions> = {}) {
    this.options = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  }

  /**
   * Task 목록을 레이아웃
   * @param zoomY Y축 줌 레벨 (기본 1.0)
   */
  layout<T = unknown>(
    tasks: Task<T>[],
    dimensionKey: string,
    timeScale: TimeScale,
    visibleRange?: TimeRange,
    zoomY: number = 1.0,
  ): LayoutResult<T> {
    const startTime = performance.now();

    // 줌이 적용된 높이/간격
    const scaledTaskHeight = this.options.taskHeight * zoomY;
    const scaledTaskGap = this.options.taskGap * zoomY;

    // Dimension 값별로 그룹화
    const grouped = this.groupByDimension(tasks, dimensionKey);

    // 각 그룹별로 레이아웃 계산
    const contexts: ContextLayoutResult<T>[] = [];
    let currentY = 0;

    for (const [dimensionValue, groupTasks] of grouped) {
      // 보이는 범위 필터링 (선택적 최적화)
      const filteredTasks = visibleRange
        ? groupTasks.filter(t =>
            t.start.getTime() < visibleRange.end.getTime() &&
            t.end.getTime() > visibleRange.start.getTime()
          )
        : groupTasks;

      // 행 할당
      const rowAssignments = this.assignRows(filteredTasks, timeScale);
      const rowCount = Math.max(1, ...Array.from(rowAssignments.values()).map(r => r + 1));

      // LayoutedTask 생성
      const layoutedTasks: LayoutedTask<T>[] = [];

      for (const task of filteredTasks) {
        const row = rowAssignments.get(task.id) ?? 0;
        const { start: x, width } = timeScale.rangeToPixels({
          start: task.start,
          end: task.end,
        });

        layoutedTasks.push({
          task,
          x,
          y: row * (scaledTaskHeight + scaledTaskGap),
          width: Math.max(this.options.minTaskWidth, width),
          height: scaledTaskHeight,
          row,
        });
      }

      const height = rowCount * (scaledTaskHeight + scaledTaskGap) - scaledTaskGap;

      contexts.push({
        dimensionValue,
        tasks: layoutedTasks,
        rowCount,
        height: Math.max(scaledTaskHeight, height),
      });

      currentY += height + scaledTaskGap;
    }

    return {
      contexts,
      totalHeight: currentY - scaledTaskGap,
      layoutTime: performance.now() - startTime,
    };
  }

  /**
   * 단일 Context 레이아웃 (최적화)
   */
  layoutContext<T = unknown>(
    tasks: Task<T>[],
    timeScale: TimeScale,
  ): ContextLayoutResult<T> {
    const rowAssignments = this.assignRows(tasks, timeScale);
    const rowCount = Math.max(1, ...Array.from(rowAssignments.values()).map(r => r + 1));

    const layoutedTasks: LayoutedTask<T>[] = [];

    for (const task of tasks) {
      const row = rowAssignments.get(task.id) ?? 0;
      const { start: x, width } = timeScale.rangeToPixels({
        start: task.start,
        end: task.end,
      });

      layoutedTasks.push({
        task,
        x,
        y: row * (this.options.taskHeight + this.options.taskGap),
        width: Math.max(this.options.minTaskWidth, width),
        height: this.options.taskHeight,
        row,
      });
    }

    const height = rowCount * (this.options.taskHeight + this.options.taskGap) - this.options.taskGap;

    return {
      dimensionValue: '',
      tasks: layoutedTasks,
      rowCount,
      height: Math.max(this.options.taskHeight, height),
    };
  }

  /**
   * Dimension 값별 그룹화
   */
  private groupByDimension<T>(
    tasks: Task<T>[],
    dimensionKey: string,
  ): Map<string, Task<T>[]> {
    const grouped = new Map<string, Task<T>[]>();

    for (const task of tasks) {
      const value = task.dimensions[dimensionKey];
      const values = value === undefined ? ['(none)']
        : Array.isArray(value) ? value : [value];

      for (const v of values) {
        if (!grouped.has(v)) {
          grouped.set(v, []);
        }
        grouped.get(v)!.push(task);
      }
    }

    // 값 기준 정렬 (_unassigned_/(none)은 맨 뒤)
    return new Map([...grouped.entries()].sort((a, b) => {
      const isSpecial = (k: string) => !k || k.startsWith('_unassigned') || k === '(none)';
      const aS = isSpecial(a[0]) ? 1 : 0;
      const bS = isSpecial(b[0]) ? 1 : 0;
      if (aS !== bS) return aS - bS;
      return (a[0] ?? '').localeCompare(b[0] ?? '');
    }));
  }

  /**
   * 행 할당 (Interval Partitioning - Greedy)
   * O(n log n) 시간복잡도
   */
  private assignRows<T>(
    tasks: Task<T>[],
    timeScale: TimeScale,
  ): Map<string, number> {
    const assignments = new Map<string, number>();

    if (tasks.length === 0) return assignments;

    // 시작 시간 기준 정렬
    const sorted = [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());

    // 각 행의 종료 시간 추적
    const rowEndTimes: number[] = [];

    for (const task of sorted) {
      const startX = timeScale.dateToX(task.start);
      const naturalEndX = timeScale.dateToX(task.end);
      const naturalWidth = naturalEndX - startX;

      // minTaskWidth를 고려한 실제 종료 X 계산
      const actualWidth = Math.max(this.options.minTaskWidth, naturalWidth);
      // 겹침 판정은 실제 task 범위 기준 (padding 없이)
      const endX = startX + actualWidth;

      // 사용 가능한 행 찾기 (가장 빨리 끝나는 행)
      let assignedRow = -1;

      for (let row = 0; row < rowEndTimes.length; row++) {
        if (rowEndTimes[row] <= startX) {
          assignedRow = row;
          break;
        }
      }

      // 사용 가능한 행이 없으면 새 행 추가
      if (assignedRow === -1) {
        assignedRow = rowEndTimes.length;
        rowEndTimes.push(0);
      }

      // 행 할당 및 종료 시간 업데이트
      assignments.set(task.id, assignedRow);
      rowEndTimes[assignedRow] = endX;
    }

    return assignments;
  }

  /**
   * 충돌 검사 (두 Task가 겹치는지)
   */
  checkCollision<T>(
    taskA: Task<T>,
    taskB: Task<T>,
    timeScale: TimeScale,
  ): boolean {
    const padding = this.options.horizontalPadding;

    const aStart = timeScale.dateToX(taskA.start) - padding;
    const aEnd = timeScale.dateToX(taskA.end) + padding;
    const bStart = timeScale.dateToX(taskB.start) - padding;
    const bEnd = timeScale.dateToX(taskB.end) + padding;

    return aStart < bEnd && aEnd > bStart;
  }

  /**
   * 특정 위치에서 충돌하는 Task 찾기
   */
  findCollisionsAt<T>(
    tasks: LayoutedTask<T>[],
    x: number,
    y: number,
    row: number,
  ): LayoutedTask<T>[] {
    return tasks.filter(t =>
      t.row === row &&
      x >= t.x &&
      x <= t.x + t.width &&
      y >= t.y &&
      y <= t.y + t.height
    );
  }

  /**
   * 옵션 업데이트
   */
  setOptions(options: Partial<LayoutOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 현재 옵션 가져오기
   */
  getOptions(): Readonly<LayoutOptions> {
    return { ...this.options };
  }
}
