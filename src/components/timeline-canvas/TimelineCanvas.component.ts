/**
 * TimelineCanvas 컴포넌트
 * Task 렌더링을 위한 Canvas 컴포넌트
 */

import { html, PropertyValues, LitElement, CSSResultGroup } from 'lit';
import { property, state, query } from 'lit/decorators.js';

import { styles } from './TimelineCanvas.styles.js';
import type { HitTestResult, HitArea } from '../../types/index.js';
import type { ContextLayoutResult } from '../../core/CollisionLayoutEngine.js';
import type { GridLine, RenderedTimeRegion, ContextColorInfo } from '../../core/TaskRenderer.js';
import { TaskRenderer } from '../../core/TaskRenderer.js';
import { HitTestManager } from '../../core/HitTestManager.js';

/**
 * TimelineCanvas 컴포넌트
 */
export class TimelineCanvas<T = unknown> extends LitElement {
  static styles: CSSResultGroup = styles;

  static define(name: string) {
    if (!customElements.get(name)) {
      customElements.define(name, this);
    }
  }

  protected emit(name: string, value?: unknown, options?: CustomEventInit): boolean {
    const event = new CustomEvent(name, {
      bubbles: true,
      composed: true,
      cancelable: options?.cancelable ?? false,
      detail: value,
      ...options,
    });
    return this.dispatchEvent(event);
  }

  // =========================================================================
  // Properties
  // =========================================================================

  /** Context 레이아웃 데이터 */
  @property({ attribute: false })
  contexts: ContextLayoutResult<T>[] = [];

  /** Context 위치 정보 */
  @property({ attribute: false })
  contextPositions: Map<string, { y: number; height: number }> = new Map();

  /** 그리드 라인 */
  @property({ attribute: false })
  gridLines: GridLine[] = [];

  /** 현재 시간 X 좌표 */
  @property({ type: Number, attribute: 'now-x' })
  nowX: number | null = null;

  /** X 스크롤 오프셋 */
  @property({ type: Number, attribute: 'scroll-x' })
  scrollX: number = 0;

  /** Y 스크롤 오프셋 */
  @property({ type: Number, attribute: 'scroll-y' })
  scrollY: number = 0;

  /** 선택된 Task ID */
  @property({ type: String, attribute: 'selected-task-id' })
  selectedTaskId: string | null = null;

  /** 템플릿 이름 */
  @property({ type: String })
  template: string = 'default';

  /** 그리드 라인 표시 */
  @property({ type: Boolean, attribute: 'show-grid-lines' })
  showGridLines: boolean = true;

  /** 현재 시간 마커 표시 */
  @property({ type: Boolean, attribute: 'show-now-marker' })
  showNowMarker: boolean = true;

  /** 로딩 상태 */
  @property({ type: Boolean, reflect: true })
  loading: boolean = false;

  /** 타임 영역 목록 */
  @property({ attribute: false })
  timeRegions: RenderedTimeRegion[] = [];

  /** Context 색상 정보 */
  @property({ attribute: false })
  contextColors: ContextColorInfo[] = [];

  /** 짝수행 배경색 사용 */
  @property({ type: Boolean, attribute: 'use-alternating-row-colors' })
  useAlternatingRowColors: boolean = true;

  /** 선택된 Task의 Dimension 값 (row 배경 강조용) */
  @property({ type: String, attribute: 'selected-dimension-value' })
  selectedDimensionValue: string | null = null;

  // =========================================================================
  // State
  // =========================================================================

  @state() private hoveredTaskId: string | null = null;
  @state() private draggingTaskId: string | null = null;
  @state() private draggingPosition: { x: number; y: number; width: number; height: number } | null = null;

  // =========================================================================
  // Private
  // =========================================================================

  @query('canvas') private canvas!: HTMLCanvasElement;

  private renderer: TaskRenderer | null = null;
  private hitTestManager: HitTestManager<T> = new HitTestManager();
  private resizeObserver: ResizeObserver | null = null;

  private width: number = 0;
  private height: number = 0;

  // =========================================================================
  // Lifecycle
  // =========================================================================

  connectedCallback(): void {
    super.connectedCallback();

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.handleResize(width, height);
      }
    });

    this.resizeObserver.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);

    if (this.canvas) {
      this.renderer = new TaskRenderer(this.canvas, this.template);
      this.requestRender();
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has('template') && this.renderer) {
      this.renderer.setTemplate(this.template);
    }

    if (changedProperties.has('contexts') || changedProperties.has('contextPositions')) {
      this.hitTestManager.buildIndex(this.contexts, this.contextPositions);
      this.hitTestManager.setContextPositions(this.contextPositions);
    }

    // 데이터 변경 시 리렌더링
    const renderTriggers = [
      'contexts', 'contextPositions', 'gridLines', 'nowX', 'scrollX', 'scrollY',
      'selectedTaskId', 'selectedDimensionValue', 'showGridLines', 'showNowMarker',
      'timeRegions', 'contextColors', 'useAlternatingRowColors',
    ];

    if (renderTriggers.some(key => changedProperties.has(key))) {
      this.requestRender();
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  render() {
    return html`
      <div class="canvas-container">
        <canvas
          @mousedown=${this.handleMouseDown}
          @mousemove=${this.handleMouseMove}
          @mouseleave=${this.handleMouseLeave}
          @dblclick=${this.handleDoubleClick}
        ></canvas>
      </div>
      <div class="loading-overlay">
        <slot name="loading">Loading...</slot>
      </div>
    `;
  }

  // =========================================================================
  // Canvas Rendering
  // =========================================================================

  private renderFrame: number = 0;

  /**
   * 렌더링 요청 (RAF 스로틀링)
   */
  requestRender(): void {
    if (this.renderFrame) return;

    this.renderFrame = requestAnimationFrame(() => {
      this.renderFrame = 0;
      this.doRender();
    });
  }

  /**
   * 실제 렌더링 수행
   */
  private doRender(): void {
    if (!this.renderer) return;

    this.renderer.render(
      this.contexts,
      this.contextPositions,
      this.gridLines,
      this.nowX,
      this.scrollX,
      this.scrollY,
      {
        selectedTaskId: this.selectedTaskId,
        hoveredTaskId: this.hoveredTaskId,
        draggingTaskId: this.draggingTaskId,
        draggingPosition: this.draggingPosition,
        templateName: this.template,
        showGridLines: this.showGridLines,
        showNowMarker: this.showNowMarker,
        timeRegions: this.timeRegions,
        contextColors: this.contextColors,
        useAlternatingRowColors: this.useAlternatingRowColors,
        selectedDimensionValue: this.selectedDimensionValue,
        showContextDividers: true,
      }
    );
  }

  /**
   * 강제 리렌더링
   */
  forceRender(): void {
    this.doRender();
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private handleResize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;

    this.width = width;
    this.height = height;

    if (this.renderer) {
      this.renderer.setSize(width, height);
      this.requestRender();
    }

    this.emit('timeline-canvas-resize', { width, height });
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitResult = this.hitTestManager.hitTest(x, y, this.scrollX, this.scrollY);

    if (hitResult.task) {
      this.emit('timeline-task-mousedown', {
        task: hitResult.task,
        area: hitResult.area,
        dimensionValue: hitResult.dimensionValue,
        x,
        y,
        originalEvent: e,
      });
    } else {
      this.emit('timeline-canvas-mousedown', {
        x,
        y,
        dimensionValue: hitResult.dimensionValue,
        originalEvent: e,
      });
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitResult = this.hitTestManager.hitTest(x, y, this.scrollX, this.scrollY);

    // 호버 상태 업데이트
    const newHoveredId = hitResult.task?.id ?? null;
    if (newHoveredId !== this.hoveredTaskId) {
      this.hoveredTaskId = newHoveredId;
      this.requestRender();

      // 커서 업데이트
      this.updateCursor(hitResult.area);

      // 이벤트 발생
      if (newHoveredId) {
        this.emit('timeline-task-hover', {
          task: hitResult.task,
          dimensionValue: hitResult.dimensionValue,
        });
      }
    }

    this.emit('timeline-canvas-mousemove', {
      x,
      y,
      task: hitResult.task,
      area: hitResult.area,
      dimensionValue: hitResult.dimensionValue,
      originalEvent: e,
    });
  }

  private handleMouseLeave(_e: MouseEvent): void {
    if (this.hoveredTaskId) {
      this.hoveredTaskId = null;
      this.requestRender();
    }
    this.updateCursor('none');
  }

  private handleDoubleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitResult = this.hitTestManager.hitTest(x, y, this.scrollX, this.scrollY);

    if (hitResult.task) {
      this.emit('timeline-task-dblclick', {
        task: hitResult.task,
        dimensionValue: hitResult.dimensionValue,
        x,
        y,
        originalEvent: e,
      });
    } else {
      this.emit('timeline-canvas-dblclick', {
        x,
        y,
        dimensionValue: hitResult.dimensionValue,
        originalEvent: e,
      });
    }
  }

  private updateCursor(area: HitArea): void {
    switch (area) {
      case 'resize-start':
      case 'resize-end':
        this.style.cursor = 'ew-resize';
        break;
      case 'body':
        this.style.cursor = 'pointer';
        break;
      default:
        this.style.cursor = '';
    }
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * 히트 테스트 수행
   */
  hitTest(x: number, y: number): HitTestResult<T> {
    return this.hitTestManager.hitTest(x, y, this.scrollX, this.scrollY);
  }

  /**
   * ID로 Task 정보 조회
   */
  getTaskById(id: string) {
    return this.hitTestManager.getTaskById(id);
  }

  /**
   * 드래그 상태 설정
   */
  setDragging(
    taskId: string | null,
    position: { x: number; y: number; width: number; height: number } | null,
  ): void {
    this.draggingTaskId = taskId;
    this.draggingPosition = position;

    if (taskId) {
      this.setAttribute('dragging', '');
    } else {
      this.removeAttribute('dragging');
    }

    this.requestRender();
  }

  /**
   * 선택 상태 설정
   */
  setSelected(taskId: string | null): void {
    this.selectedTaskId = taskId;
    this.requestRender();
  }

  /**
   * Canvas 크기 가져오기
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
