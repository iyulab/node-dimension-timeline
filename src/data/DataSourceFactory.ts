/**
 * DataSourceFactory
 * DataSource 인스턴스 생성 팩토리
 */

import type { Task } from '../types/index.js';
import type { DataSource } from './DataSource.js';
import { ArrayDataSource } from './ArrayDataSource.js';

/**
 * DataSource 타입
 */
export type DataSourceType = 'array' | 'custom';

/**
 * DataSource 생성 옵션
 */
export interface DataSourceOptions<T = unknown> {
  /** DataSource 타입 */
  type: DataSourceType;
  /** 초기 데이터 (array 타입의 경우) */
  initialData?: Task<T>[];
  /** 커스텀 DataSource 인스턴스 (custom 타입의 경우) */
  customSource?: DataSource<T>;
}

/**
 * DataSourceFactory 클래스
 * 다양한 DataSource 구현체를 생성합니다.
 */
export class DataSourceFactory {
  /**
   * DataSource 생성
   */
  static create<T = unknown>(options: DataSourceOptions<T>): DataSource<T> {
    switch (options.type) {
      case 'array':
        return new ArrayDataSource<T>(options.initialData ?? []);

      case 'custom':
        if (!options.customSource) {
          throw new Error('Custom DataSource requires customSource option');
        }
        return options.customSource;

      default:
        throw new Error(`Unknown DataSource type: ${options.type}`);
    }
  }

  /**
   * ArrayDataSource 생성 (단축 메서드)
   */
  static array<T = unknown>(initialData?: Task<T>[]): ArrayDataSource<T> {
    return new ArrayDataSource<T>(initialData ?? []);
  }

  /**
   * 샘플 데이터 생성 (개발/테스트용)
   */
  static createSampleData<T = unknown>(options: {
    count: number;
    dimensions: Record<string, string[]>;
    startDate?: Date;
    endDate?: Date;
    minDurationHours?: number;
    maxDurationHours?: number;
  }): Task<T>[] {
    const {
      count,
      dimensions,
      startDate = new Date(),
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      minDurationHours = 1,
      maxDurationHours = 48,
    } = options;

    const tasks: Task<T>[] = [];
    const timeSpan = endDate.getTime() - startDate.getTime();
    const dimensionKeys = Object.keys(dimensions);

    const labels = [
      '회의', '개발', '테스트', '배포', '리뷰', '설계',
      '분석', '문서화', '데모', '점검', '유지보수', '교육',
    ];

    const statuses: Array<'pending' | 'in-progress' | 'completed' | 'cancelled'> = [
      'pending', 'in-progress', 'completed', 'cancelled',
    ];

    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    ];

    for (let i = 0; i < count; i++) {
      const taskStart = new Date(startDate.getTime() + Math.random() * timeSpan);
      const durationMs = (minDurationHours + Math.random() * (maxDurationHours - minDurationHours)) * 60 * 60 * 1000;
      const taskEnd = new Date(taskStart.getTime() + durationMs);

      const taskDimensions: Record<string, string> = {};
      for (const key of dimensionKeys) {
        const values = dimensions[key];
        taskDimensions[key] = values[Math.floor(Math.random() * values.length)];
      }

      tasks.push({
        id: `sample_${i + 1}`,
        start: taskStart,
        end: taskEnd,
        dimensions: taskDimensions,
        label: `${labels[Math.floor(Math.random() * labels.length)]} #${i + 1}`,
        color: colors[Math.floor(Math.random() * colors.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        progress: Math.floor(Math.random() * 101),
      });
    }

    return tasks;
  }
}
