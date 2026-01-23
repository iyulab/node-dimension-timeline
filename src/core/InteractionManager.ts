/**
 * InteractionManager
 * 키보드 네비게이션, 드래그 앤 드롭, 선택 관리
 */

import type { Task, DragState, DragMode, HitArea, TimeScaleUnit } from '../types/index.js';
import type { ViewportManager } from './ViewportManager.js';
import type { TimeScale } from './TimeScale.js';
import { snapToUnit } from '../utilities/DateUtils.js';

/**
 * 인터랙션 설정
 */
export interface InteractionConfig {
  /** Task 드래그 가능 */
  tasksDraggable: boolean;
  /** Task 리사이즈 가능 */
  tasksResizable: boolean;
  /** Cross-dimension 이동 가능 */
  crossDimensionMove: boolean;
  /** 키보드 네비게이션 활성화 */
  keyboardNavigation: boolean;
  /** 멀티 선택 활성화 */
  multiSelect: boolean;
  /** 스냅 활성화 */
  snapEnabled: boolean;
  /** 드래그 최소 이동 거리 (px) */
  dragThreshold: number;
}

const DEFAULT_CONFIG: InteractionConfig = {
  tasksDraggable: true,
  tasksResizable: true,
  crossDimensionMove: true,
  keyboardNavigation: true,
  multiSelect: false,
  snapEnabled: true,
  dragThreshold: 3,
};

/**
 * 선택 상태
 */
export interface SelectionState {
  /** 선택된 Task IDs */
  selectedIds: Set<string>;
  /** 포커스된 Task ID */
  focusedId: string | null;
  /** 앵커 Task ID (Shift 선택용) */
  anchorId: string | null;
}

/**
 * InteractionManager 클래스
 * 사용자 인터랙션을 관리합니다.
 */
export class InteractionManager<T = unknown> {
  private config: InteractionConfig;
  private selection: SelectionState;
  private dragState: DragState<T> | null = null;
  private isDragging: boolean = false;
  private dragStartPosition: { x: number; y: number } | null = null;

  constructor(config: Partial<InteractionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.selection = {
      selectedIds: new Set(),
      focusedId: null,
      anchorId: null,
    };
  }

  // =========================================================================
  // Selection
  // =========================================================================

  /**
   * Task 선택
   */
  select(taskId: string, modifier?: 'ctrl' | 'shift'): void {
    if (!this.config.multiSelect || !modifier) {
      // 단일 선택
      this.selection.selectedIds.clear();
      this.selection.selectedIds.add(taskId);
      this.selection.anchorId = taskId;
    } else if (modifier === 'ctrl') {
      // 토글 선택
      if (this.selection.selectedIds.has(taskId)) {
        this.selection.selectedIds.delete(taskId);
      } else {
        this.selection.selectedIds.add(taskId);
      }
    }
    // shift 선택은 외부에서 범위 계산 후 selectRange 호출

    this.selection.focusedId = taskId;
  }

  /**
   * 범위 선택
   */
  selectRange(taskIds: string[]): void {
    if (!this.config.multiSelect) {
      if (taskIds.length > 0) {
        this.select(taskIds[0]);
      }
      return;
    }

    this.selection.selectedIds = new Set(taskIds);
    if (taskIds.length > 0) {
      this.selection.focusedId = taskIds[taskIds.length - 1];
    }
  }

  /**
   * 모두 선택
   */
  selectAll(taskIds: string[]): void {
    if (!this.config.multiSelect) return;
    this.selection.selectedIds = new Set(taskIds);
  }

  /**
   * 선택 해제
   */
  clearSelection(): void {
    this.selection.selectedIds.clear();
    this.selection.focusedId = null;
    this.selection.anchorId = null;
  }

  /**
   * 선택 여부 확인
   */
  isSelected(taskId: string): boolean {
    return this.selection.selectedIds.has(taskId);
  }

  /**
   * 선택된 Task IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.selection.selectedIds);
  }

  /**
   * 포커스된 Task ID
   */
  getFocusedId(): string | null {
    return this.selection.focusedId;
  }

  // =========================================================================
  // Drag & Drop
  // =========================================================================

  /**
   * 마우스 다운 처리
   */
  handleMouseDown(
    task: Task<T>,
    area: HitArea,
    x: number,
    y: number,
    dimensionValue: string,
  ): boolean {
    // 드래그 가능 여부 확인
    if (area === 'body' && !this.config.tasksDraggable) return false;
    if ((area === 'resize-start' || area === 'resize-end') && !this.config.tasksResizable) return false;
    if (area === 'none') return false;

    this.dragStartPosition = { x, y };
    this.isDragging = false;

    // 잠정적 드래그 상태 저장
    const mode: DragMode = area === 'body' ? 'move' :
                          area === 'resize-start' ? 'resize-start' : 'resize-end';

    this.dragState = {
      task,
      mode,
      startX: x,
      startY: y,
      originalStart: task.start,
      originalEnd: task.end,
      originalDimensionValue: dimensionValue,
      snappedStart: task.start,
      snappedEnd: task.end,
      currentDimensionValue: dimensionValue,
    };

    return true;
  }

  /**
   * 마우스 이동 처리
   */
  handleMouseMove(
    x: number,
    y: number,
    timeScale: TimeScale,
    scale: TimeScaleUnit,
    findDimensionAtY?: (y: number) => string | null,
  ): DragState<T> | null {
    if (!this.dragState || !this.dragStartPosition) return null;

    // 드래그 시작 임계값 확인
    if (!this.isDragging) {
      const dx = Math.abs(x - this.dragStartPosition.x);
      const dy = Math.abs(y - this.dragStartPosition.y);

      if (dx < this.config.dragThreshold && dy < this.config.dragThreshold) {
        return null;
      }

      this.isDragging = true;
    }

    // 시간 변환
    const deltaX = x - this.dragState.startX;
    const msPerUnit = this.getMsPerUnit(scale);
    const deltaMs = (deltaX / timeScale.pixelsPerUnit) * msPerUnit;

    let newStart = this.dragState.originalStart;
    let newEnd = this.dragState.originalEnd;

    if (this.dragState.mode === 'move') {
      newStart = new Date(this.dragState.originalStart.getTime() + deltaMs);
      newEnd = new Date(this.dragState.originalEnd.getTime() + deltaMs);
    } else if (this.dragState.mode === 'resize-start') {
      newStart = new Date(this.dragState.originalStart.getTime() + deltaMs);
      // 최소 기간 보장
      if (newStart.getTime() >= newEnd.getTime() - 60000) {
        newStart = new Date(newEnd.getTime() - 60000);
      }
    } else if (this.dragState.mode === 'resize-end') {
      newEnd = new Date(this.dragState.originalEnd.getTime() + deltaMs);
      if (newEnd.getTime() <= newStart.getTime() + 60000) {
        newEnd = new Date(newStart.getTime() + 60000);
      }
    }

    // 스냅
    if (this.config.snapEnabled) {
      this.dragState.snappedStart = snapToUnit(newStart, scale);
      this.dragState.snappedEnd = snapToUnit(newEnd, scale);
    } else {
      this.dragState.snappedStart = newStart;
      this.dragState.snappedEnd = newEnd;
    }

    // Cross-dimension 이동
    if (this.config.crossDimensionMove && this.dragState.mode === 'move' && findDimensionAtY) {
      const newDimension = findDimensionAtY(y);
      if (newDimension) {
        this.dragState.currentDimensionValue = newDimension;
      }
    }

    return { ...this.dragState };
  }

  /**
   * 마우스 업 처리
   */
  handleMouseUp(): { state: DragState<T> | null; completed: boolean } {
    const state = this.dragState;
    const completed = this.isDragging;

    this.dragState = null;
    this.isDragging = false;
    this.dragStartPosition = null;

    return { state, completed };
  }

  /**
   * 드래그 취소
   */
  cancelDrag(): void {
    this.dragState = null;
    this.isDragging = false;
    this.dragStartPosition = null;
  }

  /**
   * 드래그 중인지 확인
   */
  isDraggingActive(): boolean {
    return this.isDragging;
  }

  /**
   * 현재 드래그 상태
   */
  getDragState(): DragState<T> | null {
    return this.dragState ? { ...this.dragState } : null;
  }

  // =========================================================================
  // Keyboard Navigation
  // =========================================================================

  /**
   * 키보드 이벤트 처리
   */
  handleKeyDown(
    e: KeyboardEvent,
    tasks: Task<T>[],
    viewportManager: ViewportManager,
  ): {
    handled: boolean;
    action?: 'select' | 'move' | 'delete' | 'navigate';
    taskId?: string;
    direction?: 'left' | 'right' | 'up' | 'down';
  } {
    if (!this.config.keyboardNavigation) {
      return { handled: false };
    }

    const focusedId = this.selection.focusedId;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
        if (focusedId) {
          return {
            handled: true,
            action: 'move',
            taskId: focusedId,
            direction: e.key === 'ArrowLeft' ? 'left' : 'right',
          };
        }
        // 뷰포트 팬
        const panAmount = e.shiftKey ? 100 : 50;
        viewportManager.scrollBy(e.key === 'ArrowLeft' ? -panAmount : panAmount, 0);
        return { handled: true, action: 'navigate' };

      case 'ArrowUp':
      case 'ArrowDown':
        // 다음/이전 Task 선택
        if (tasks.length > 0) {
          const currentIndex = focusedId
            ? tasks.findIndex(t => t.id === focusedId)
            : -1;

          let newIndex: number;
          if (e.key === 'ArrowUp') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : tasks.length - 1;
          } else {
            newIndex = currentIndex < tasks.length - 1 ? currentIndex + 1 : 0;
          }

          const newTask = tasks[newIndex];
          this.select(newTask.id, e.shiftKey ? 'shift' : e.ctrlKey ? 'ctrl' : undefined);

          return {
            handled: true,
            action: 'select',
            taskId: newTask.id,
          };
        }
        return { handled: false };

      case 'Home':
        // 첫 번째 Task 선택
        if (tasks.length > 0) {
          this.select(tasks[0].id);
          return { handled: true, action: 'select', taskId: tasks[0].id };
        }
        return { handled: false };

      case 'End':
        // 마지막 Task 선택
        if (tasks.length > 0) {
          const lastTask = tasks[tasks.length - 1];
          this.select(lastTask.id);
          return { handled: true, action: 'select', taskId: lastTask.id };
        }
        return { handled: false };

      case 'Delete':
      case 'Backspace':
        if (focusedId) {
          return { handled: true, action: 'delete', taskId: focusedId };
        }
        return { handled: false };

      case 'Escape':
        if (this.isDragging) {
          this.cancelDrag();
          return { handled: true };
        }
        this.clearSelection();
        return { handled: true };

      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.selectAll(tasks.map(t => t.id));
          return { handled: true, action: 'select' };
        }
        return { handled: false };

      default:
        return { handled: false };
    }
  }

  // =========================================================================
  // Configuration
  // =========================================================================

  /**
   * 설정 업데이트
   */
  setConfig(config: Partial<InteractionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 현재 설정 가져오기
   */
  getConfig(): Readonly<InteractionConfig> {
    return { ...this.config };
  }

  // =========================================================================
  // Private
  // =========================================================================

  private getMsPerUnit(unit: TimeScaleUnit): number {
    switch (unit) {
      case '10min': return 10 * 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
