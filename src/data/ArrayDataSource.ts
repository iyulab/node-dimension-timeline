/**
 * ArrayDataSource
 * 배열 기반 동기식 DataSource 구현
 */

import type { Task, TaskCreate, TaskUpdate, TimeRange } from '../types/index.js';
import type {
  DataSource,
  DataQueryOptions,
  DataQueryResult,
  DataChangeEvent,
  DataChangeCallback,
} from './DataSource.js';

/**
 * ID 생성 함수
 */
function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * ArrayDataSource 클래스
 * 메모리 내 배열로 Task 데이터를 관리합니다.
 */
export class ArrayDataSource<T = unknown> implements DataSource<T> {
  private tasks: Map<string, Task<T>> = new Map();
  private listeners: Set<DataChangeCallback<T>> = new Set();

  constructor(initialTasks: Task<T>[] = []) {
    for (const task of initialTasks) {
      this.tasks.set(task.id, { ...task });
    }
  }

  // =========================================================================
  // 조회
  // =========================================================================

  async query(options: DataQueryOptions = {}): Promise<DataQueryResult<T>> {
    const startTime = performance.now();

    let result = Array.from(this.tasks.values());

    // 시간 범위 필터
    if (options.timeRange) {
      const { start, end } = options.timeRange;
      result = result.filter(
        task => task.start.getTime() < end.getTime() && task.end.getTime() > start.getTime()
      );
    }

    // Dimension 필터
    if (options.dimensions) {
      for (const [key, values] of Object.entries(options.dimensions)) {
        const filterValues = Array.isArray(values) ? values : [values];
        result = result.filter(task => {
          const taskValue = task.dimensions[key];
          if (taskValue === undefined) return false;
          const taskValues = Array.isArray(taskValue) ? taskValue : [taskValue];
          return taskValues.some(v => filterValues.includes(v));
        });
      }
    }

    // 상태 필터
    if (options.status && options.status.length > 0) {
      result = result.filter(task => task.status && options.status!.includes(task.status));
    }

    // 검색어 필터
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      result = result.filter(
        task => task.label?.toLowerCase().includes(searchLower)
      );
    }

    // 전체 개수 (페이지네이션 전)
    const totalCount = result.length;

    // 정렬
    if (options.sortBy) {
      const direction = options.sortDirection === 'desc' ? -1 : 1;
      result.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (options.sortBy) {
          case 'start':
            aVal = a.start.getTime();
            bVal = b.start.getTime();
            break;
          case 'end':
            aVal = a.end.getTime();
            bVal = b.end.getTime();
            break;
          case 'label':
            aVal = a.label ?? '';
            bVal = b.label ?? '';
            break;
          case 'status':
            aVal = a.status ?? '';
            bVal = b.status ?? '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return -direction;
        if (aVal > bVal) return direction;
        return 0;
      });
    }

    // 페이지네이션
    if (options.offset !== undefined || options.limit !== undefined) {
      const offset = options.offset ?? 0;
      const limit = options.limit ?? result.length;
      result = result.slice(offset, offset + limit);
    }

    return {
      tasks: result.map(t => ({ ...t })),
      totalCount,
      queryTime: performance.now() - startTime,
    };
  }

  async getById(id: string): Promise<Task<T> | null> {
    const task = this.tasks.get(id);
    return task ? { ...task } : null;
  }

  async getByIds(ids: string[]): Promise<Task<T>[]> {
    return ids
      .map(id => this.tasks.get(id))
      .filter((t): t is Task<T> => t !== undefined)
      .map(t => ({ ...t }));
  }

  async getInRange(
    range: TimeRange,
    dimensionKey?: string,
    dimensionValue?: string,
  ): Promise<Task<T>[]> {
    let result = Array.from(this.tasks.values()).filter(
      task => task.start.getTime() < range.end.getTime() && task.end.getTime() > range.start.getTime()
    );

    if (dimensionKey && dimensionValue) {
      result = result.filter(task => {
        const value = task.dimensions[dimensionKey];
        if (value === undefined) return false;
        const values = Array.isArray(value) ? value : [value];
        return values.includes(dimensionValue);
      });
    }

    return result.map(t => ({ ...t }));
  }

  // =========================================================================
  // 생성/수정/삭제
  // =========================================================================

  async add(taskData: TaskCreate<T>): Promise<Task<T>> {
    const task: Task<T> = {
      ...taskData,
      id: generateId(),
    };

    this.tasks.set(task.id, task);
    this.emit({ type: 'add', task: { ...task } });

    return { ...task };
  }

  async addBulk(tasksData: TaskCreate<T>[]): Promise<Task<T>[]> {
    const tasks: Task<T>[] = tasksData.map(data => ({
      ...data,
      id: generateId(),
    }));

    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }

    this.emit({ type: 'bulk', tasks: tasks.map(t => ({ ...t })) });

    return tasks.map(t => ({ ...t }));
  }

  async update(id: string, changes: TaskUpdate<T>): Promise<Task<T>> {
    const existing = this.tasks.get(id);
    if (!existing) {
      throw new Error(`Task not found: ${id}`);
    }

    const previousValues: Partial<Task<T>> = {};
    const changedFields: Array<keyof Task<T>> = [];

    for (const [key, value] of Object.entries(changes)) {
      const k = key as keyof Task<T>;
      if (existing[k] !== value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (previousValues as any)[k] = existing[k];
        changedFields.push(k);
      }
    }

    const updated: Task<T> = { ...existing, ...changes };
    this.tasks.set(id, updated);

    this.emit({
      type: 'update',
      task: { ...updated },
      changedFields,
      previousValues,
    });

    return { ...updated };
  }

  async delete(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    this.tasks.delete(id);
    this.emit({ type: 'delete', task: { ...task } });
  }

  async deleteBulk(ids: string[]): Promise<void> {
    const deleted: Task<T>[] = [];

    for (const id of ids) {
      const task = this.tasks.get(id);
      if (task) {
        deleted.push({ ...task });
        this.tasks.delete(id);
      }
    }

    if (deleted.length > 0) {
      this.emit({ type: 'bulk', tasks: deleted });
    }
  }

  // =========================================================================
  // 이벤트 구독
  // =========================================================================

  subscribe(callback: DataChangeCallback<T>): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: DataChangeEvent<T>): void {
    this.listeners.forEach(callback => callback(event));
  }

  // =========================================================================
  // 유틸리티
  // =========================================================================

  async getDimensionValues(dimensionKey: string): Promise<string[]> {
    const values = new Set<string>();

    for (const task of this.tasks.values()) {
      const value = task.dimensions[dimensionKey];
      if (value !== undefined) {
        const vals = Array.isArray(value) ? value : [value];
        vals.forEach(v => values.add(v));
      }
    }

    return Array.from(values).sort();
  }

  async count(): Promise<number> {
    return this.tasks.size;
  }

  async getTimeRange(): Promise<TimeRange | null> {
    if (this.tasks.size === 0) return null;

    let minStart = Infinity;
    let maxEnd = -Infinity;

    for (const task of this.tasks.values()) {
      minStart = Math.min(minStart, task.start.getTime());
      maxEnd = Math.max(maxEnd, task.end.getTime());
    }

    return {
      start: new Date(minStart),
      end: new Date(maxEnd),
    };
  }

  dispose(): void {
    this.tasks.clear();
    this.listeners.clear();
  }

  // =========================================================================
  // 추가 편의 메서드
  // =========================================================================

  /**
   * 모든 Task 가져오기
   */
  getAll(): Task<T>[] {
    return Array.from(this.tasks.values()).map(t => ({ ...t }));
  }

  /**
   * 데이터 전체 교체
   */
  async setAll(tasks: Task<T>[]): Promise<void> {
    this.tasks.clear();
    for (const task of tasks) {
      this.tasks.set(task.id, { ...task });
    }
    this.emit({ type: 'bulk', tasks: tasks.map(t => ({ ...t })) });
  }

  /**
   * 데이터 초기화
   */
  async clear(): Promise<void> {
    const deleted = Array.from(this.tasks.values());
    this.tasks.clear();
    if (deleted.length > 0) {
      this.emit({ type: 'bulk', tasks: deleted });
    }
  }
}
