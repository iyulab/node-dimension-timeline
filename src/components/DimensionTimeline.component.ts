/**
 * DimensionTimeline 메인 컴포넌트
 */

import { html, PropertyValues, nothing, LitElement, CSSResultGroup } from 'lit';
import { property, state, query } from 'lit/decorators.js';

import { styles } from './DimensionTimeline.styles.js';
import type {
  Task, Dimension, TimeScaleUnit, TimeRegion,
  DragState, HitArea,
} from '../types/index.js';
import type { DataSource } from '../data/DataSource.js';
import type { LayoutResult } from '../core/CollisionLayoutEngine.js';
import { ViewportManager } from '../core/ViewportManager.js';
import { CollisionLayoutEngine } from '../core/CollisionLayoutEngine.js';
import { IncrementalUpdater, LayoutCache } from '../core/IncrementalUpdater.js';
import { TimelineCanvas } from './timeline-canvas/TimelineCanvas.component.js';
import { TimeAxis } from './time-axis/TimeAxis.component.js';
import { DimensionSelector, type DimensionValueWithCount } from './dimension-selector/DimensionSelector.component.js';
import { ContextSlice } from './context-slice/ContextSlice.component.js';
import type { GridLine, RenderedTimeRegion, ContextColorInfo } from '../core/TaskRenderer.js';
import { snapToUnit } from '../utilities/DateUtils.js';

/**
 * DimensionTimeline 컴포넌트
 */
export class DimensionTimeline<T = unknown> extends LitElement {
  static styles: CSSResultGroup = styles;

  static define(name: string) {
    if (!customElements.get(name)) {
      // 종속 컴포넌트 등록
      TimelineCanvas.define('d-timeline-canvas');
      TimeAxis.define('d-time-axis');
      DimensionSelector.define('d-dimension-selector');
      ContextSlice.define('d-context-slice');
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

  /** DataSource */
  @property({ attribute: false })
  dataSource: DataSource<T> | null = null;

  /** Dimension 목록 */
  @property({ attribute: false })
  dimensions: Dimension[] = [];

  /** 활성 Dimension */
  @property({ type: String, attribute: 'active-dimension' })
  activeDimension: string = '';

  /** 스케일 단위 */
  @property({ type: String })
  scale: TimeScaleUnit = 'day';

  /** 줌 가능 */
  @property({ type: Boolean })
  zoomable: boolean = true;

  /** 팬 가능 */
  @property({ type: Boolean })
  pannable: boolean = true;

  /** Task 드래그 가능 */
  @property({ type: Boolean, attribute: 'tasks-draggable' })
  tasksDraggable: boolean = true;

  /** Task 리사이즈 가능 */
  @property({ type: Boolean, attribute: 'tasks-resizable' })
  tasksResizable: boolean = true;

  /** Cross-dimension 이동 가능 */
  @property({ type: Boolean, attribute: 'cross-dimension-move' })
  crossDimensionMove: boolean = true;

  /** 이동/리사이즈 비활성화 줌 레벨 임계치 (이 값 이하면 선택만 가능) */
  @property({ type: Number, attribute: 'disable-edit-zoom-threshold' })
  disableEditZoomThreshold: number = 0.6;

  /** 이동/리사이즈 허용 최대 스케일 단위 (이 스케일 이상 zoom-out 시 선택만 가능) */
  @property({ type: String, attribute: 'max-edit-scale' })
  maxEditScale: string = 'hour';

  /** 템플릿 */
  @property({ type: String })
  template: string = 'default';

  /** Task 높이 */
  @property({ type: Number, attribute: 'task-height' })
  taskHeight: number = 32;

  /** Task 간격 */
  @property({ type: Number, attribute: 'task-gap' })
  taskGap: number = 4;

  /** 로딩 상태 */
  @property({ type: Boolean, reflect: true })
  loading: boolean = false;

  /** 타임 영역 목록 (공휴일, 근무시간대 등) */
  @property({ attribute: false })
  timeRegions: TimeRegion[] = [];

  /** 실시간 현재시간 마커 업데이트 간격 (ms, 0이면 비활성화) */
  @property({ type: Number, attribute: 'realtime-interval' })
  realtimeInterval: number = 60000; // 기본 1분

  // =========================================================================
  // State
  // =========================================================================

  @state() private tasks: Task<T>[] = [];
  @state() private layoutResult: LayoutResult<T> | null = null;
  @state() private contextPositions: Map<string, { y: number; height: number }> = new Map();
  @state() private dimensionValues: DimensionValueWithCount[] = [];
  @state() private selectedTaskId: string | null = null;
  @state() private selectedDimensionValue: string | null = null;
  @state() private gridLines: GridLine[] = [];
  @state() private nowX: number | null = null;
  @state() private renderedTimeRegions: RenderedTimeRegion[] = [];
  @state() private contextColors: ContextColorInfo[] = [];
  @state() private dimensionDropdownOpen: boolean = false;

  // =========================================================================
  // Private
  // =========================================================================

  @query('d-timeline-canvas') private canvasEl!: TimelineCanvas<T>;

  private viewportManager: ViewportManager = new ViewportManager();
  private layoutEngine: CollisionLayoutEngine = new CollisionLayoutEngine();
  private incrementalUpdater: IncrementalUpdater<T> = new IncrementalUpdater();
  private layoutCache: LayoutCache<T> = new LayoutCache();

  private dataSourceUnsubscribe: (() => void) | null = null;
  private viewportUnsubscribe: (() => void) | null = null;
  private realtimeTimer: number | null = null;

  private dragState: DragState<T> | null = null;
  private collapsedContexts: Set<string> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private _taskClickedInThisGesture: boolean = false;

  // =========================================================================
  // Lifecycle
  // =========================================================================

  connectedCallback(): void {
    super.connectedCallback();

    // 뷰포트 변경 구독
    this.viewportUnsubscribe = this.viewportManager.subscribe(event => {
      this.handleViewportChange(event);
    });

    // 증분 업데이트 구독
    this.incrementalUpdater.onUpdate(async region => {
      // DataSource에서 최신 데이터 가져오기
      if (this.dataSource) {
        const result = await this.dataSource.query();
        this.tasks = result.tasks;
      }

      if (region.fullRecalculate) {
        this.recalculateLayout();
      } else {
        this.layoutCache.invalidateMany(region.dimensionValues);
        this.recalculateLayout();
      }
    });

    // 키보드 이벤트
    this.addEventListener('keydown', this.handleKeyDown);

    // 휠 이벤트
    this.addEventListener('wheel', this.handleWheel, { passive: false });

    // Window mouseup (드래그 중 canvas 영역 밖에서 마우스를 놓는 경우 처리)
    window.addEventListener('mouseup', this.handleWindowMouseUp);

    // 실시간 타이머 시작
    this.startRealtimeTimer();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();

    this.dataSourceUnsubscribe?.();
    this.viewportUnsubscribe?.();
    this.stopRealtimeTimer();
    this.resizeObserver?.disconnect();

    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('mouseup', this.handleWindowMouseUp);
  }

  /**
   * 실시간 타이머 시작
   */
  private startRealtimeTimer(): void {
    this.stopRealtimeTimer();
    if (this.realtimeInterval > 0) {
      this.realtimeTimer = window.setInterval(() => {
        this.updateNowMarker();
      }, this.realtimeInterval);
    }
  }

  /**
   * 실시간 타이머 중지
   */
  private stopRealtimeTimer(): void {
    if (this.realtimeTimer !== null) {
      clearInterval(this.realtimeTimer);
      this.realtimeTimer = null;
    }
  }

  /**
   * 현재 시간 마커 업데이트
   */
  private updateNowMarker(): void {
    this.nowX = this.viewportManager.dateToX(new Date());
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);

    // 초기 크기 설정
    this.updateViewportSize();

    // ResizeObserver 설정
    this.resizeObserver = new ResizeObserver(() => {
      this.updateViewportSize();
    });
    this.resizeObserver.observe(this);

    // 크기 설정 후 레이아웃 재계산
    if (this.tasks.length > 0) {
      this.recalculateLayout();
    }
  }

  /**
   * 뷰포트 크기 업데이트
   */
  private updateViewportSize(): void {
    const rect = this.getBoundingClientRect();
    const width = rect.width - 200; // dimension selector 제외
    const height = rect.height - 48; // time axis 제외

    if (width > 0 && height > 0) {
      this.viewportManager.setSize(width, height);
      this.handleViewportChange({
        type: 'resize',
        viewport: this.viewportManager.state,
        scale: this.scale,
      });
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // DataSource 변경
    if (changedProperties.has('dataSource')) {
      this.setupDataSource();
    }

    // 활성 Dimension 변경
    if (changedProperties.has('activeDimension') && this.activeDimension) {
      this.loadData();
    }

    // 스케일 변경
    if (changedProperties.has('scale')) {
      this.viewportManager.setScale(this.scale);
    }

    // 레이아웃 옵션 변경
    if (changedProperties.has('taskHeight') || changedProperties.has('taskGap')) {
      this.layoutEngine.setOptions({
        taskHeight: this.taskHeight,
        taskGap: this.taskGap,
      });
      this.recalculateLayout();
    }

    // 타임 영역 변경
    if (changedProperties.has('timeRegions')) {
      this.updateRenderedTimeRegions();
    }

    // 실시간 타이머 간격 변경
    if (changedProperties.has('realtimeInterval')) {
      this.startRealtimeTimer();
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  render() {
    const scaleLabels: Record<TimeScaleUnit, string> = {
      '10min': '10분',
      '30min': '30분',
      'hour': '시간',
      '6hour': '6시간',
      '12hour': '12시간',
      'day': '일',
      'week': '주',
      'month': '월',
    };

    const activeDim = this.dimensions.find(d => d.key === this.activeDimension);

    return html`
      <div class="timeline-container">
        <!-- 좌상단 코너: Dimension 선택 드롭다운 -->
        <div class="corner-header">
          <div class="dimension-dropdown">
            <button class="dropdown-trigger" @click=${this.toggleDimensionDropdown}>
              <span class="dropdown-label">Dimension</span>
              <span class="dropdown-value">${activeDim?.label ?? '선택'}</span>
              <svg class="dropdown-icon" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 4l4 4 4-4H2z"/>
              </svg>
            </button>
            ${this.dimensionDropdownOpen ? html`
              <div class="dropdown-menu">
                ${this.dimensions.map(dim => html`
                  <div
                    class="dropdown-item ${dim.key === this.activeDimension ? 'selected' : ''}"
                    @click=${() => this.handleCornerDimensionSelect(dim.key)}
                  >
                    ${dim.icon ? html`<span class="item-icon">${dim.icon}</span>` : nothing}
                    <span class="item-label">${dim.label}</span>
                    ${dim.key === this.activeDimension ? html`
                      <svg class="check-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11.5 4L5.5 10 2.5 7"/>
                      </svg>
                    ` : nothing}
                  </div>
                `)}
              </div>
            ` : nothing}
          </div>
          <slot name="corner-header"></slot>
        </div>

        <!-- 시간축 -->
        <div class="time-axis-area">
          <d-time-axis
            .scale=${this.scale}
            .visibleRange=${this.viewportManager.getVisibleRange()}
            .pixelsPerUnit=${this.viewportManager.timeScale.pixelsPerUnit}
            .scrollX=${this.viewportManager.scrollX}
            .nowX=${this.nowX}
          ></d-time-axis>
        </div>

        <!-- Dimension 선택기 -->
        <div class="dimension-area">
          <d-dimension-selector
            .dimensions=${this.dimensions}
            .activeDimension=${this.activeDimension}
            .dimensionValues=${this.dimensionValues}
            .contextPositions=${this.contextPositions}
            .scrollY=${this.viewportManager.scrollY}
            .zoomY=${this.viewportManager.zoomY}
            .contextColors=${this.getContextColorsMap()}
            .selectedDimensionValue=${this.selectedDimensionValue}
            ?sync-mode=${this.contextPositions.size > 0}
            @dimension-change=${this.handleDimensionChange}
            @dimension-value-click=${this.handleDimensionValueClick}
          ></d-dimension-selector>
        </div>

        <!-- 메인 영역 -->
        <div class="main-area">
          <div class="canvas-area"
            @mousedown=${this.handleCanvasMouseDown}
            @mousemove=${this.handleCanvasMouseMove}
            @mouseup=${this.handleCanvasMouseUp}
          >
            <d-timeline-canvas
              .contexts=${this.layoutResult?.contexts ?? []}
              .contextPositions=${this.contextPositions}
              .gridLines=${this.gridLines}
              .nowX=${this.nowX}
              .scrollX=${this.viewportManager.scrollX}
              .scrollY=${this.viewportManager.scrollY}
              .selectedTaskId=${this.selectedTaskId}
              .selectedDimensionValue=${this.selectedDimensionValue}
              .template=${this.template}
              .timeRegions=${this.renderedTimeRegions}
              .contextColors=${this.contextColors}
              @timeline-task-mousedown=${this.handleTaskMouseDown}
              @timeline-task-dblclick=${this.handleTaskDoubleClick}
              @timeline-canvas-dblclick=${this.handleCanvasDoubleClick}
            ></d-timeline-canvas>
          </div>

          <!-- 줌 컨트롤 -->
          ${this.zoomable ? html`
            <div class="zoom-controls">
              <button class="zoom-button" @click=${this.handleZoomIn} title="확대">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3v10M3 8h10"/>
                </svg>
              </button>
              <button class="zoom-button" @click=${this.handleZoomOut} title="축소">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 8h10"/>
                </svg>
              </button>
            </div>
          ` : nothing}

          <!-- 스케일 인디케이터 -->
          <div class="scale-indicator">${scaleLabels[this.scale]}</div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Data Management
  // =========================================================================

  private setupDataSource(): void {
    this.dataSourceUnsubscribe?.();

    if (this.dataSource) {
      this.dataSourceUnsubscribe = this.dataSource.subscribe(event => {
        this.incrementalUpdater.notifyChange(event);
      });
      this.loadData();
    }
  }

  private async loadData(): Promise<void> {
    if (!this.dataSource || !this.activeDimension) return;

    this.loading = true;

    try {
      const result = await this.dataSource.query();
      this.tasks = result.tasks;

      // Dimension 값별 카운트 계산
      this.dimensionValues = this.calculateDimensionValues();

      // 레이아웃 계산
      this.recalculateLayout();
    } finally {
      this.loading = false;
    }
  }

  private calculateDimensionValues(): DimensionValueWithCount[] {
    const countMap = new Map<string, number>();

    for (const task of this.tasks) {
      const value = task.dimensions[this.activeDimension];
      if (value !== undefined) {
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          countMap.set(v, (countMap.get(v) ?? 0) + 1);
        }
      }
    }

    // Dimension 정의에서 값 정보 가져오기
    const dimension = this.dimensions.find(d => d.key === this.activeDimension);
    const definedValues = dimension?.values ?? [];

    const result: DimensionValueWithCount[] = [];

    // 정의된 값 먼저 추가
    for (const def of definedValues) {
      result.push({
        ...def,
        count: countMap.get(def.key) ?? 0,
      });
      countMap.delete(def.key);
    }

    // 나머지 값 추가
    for (const [key, count] of countMap) {
      result.push({
        key,
        label: key,
        count,
      });
    }

    // 정의된 값 순서를 유지 (dimensions.values 순서 + 나머지)
    return result;
  }

  // =========================================================================
  // Layout
  // =========================================================================

  private recalculateLayout(): void {
    if (this.tasks.length === 0 || !this.activeDimension) {
      this.layoutResult = null;
      this.contextPositions.clear();
      this.contextColors = [];
      return;
    }

    // NOTE: visibleRange를 전달하지 않아 모든 Task를 레이아웃
    // 렌더링 시 뷰포트 필터링이 적용됨
    this.layoutResult = this.layoutEngine.layout(
      this.tasks,
      this.activeDimension,
      this.viewportManager.timeScale,
      undefined, // visibleRange
      this.viewportManager.zoomY, // Y축 줌 레벨
    );

    // Context 위치 계산 및 색상 정보
    let currentY = 0;
    this.contextPositions.clear();
    this.contextColors = [];

    const dimension = this.dimensions.find(d => d.key === this.activeDimension);
    const definedValues = dimension?.values ?? [];
    const zoomY = this.viewportManager.zoomY;
    const scaledHeaderHeight = 32 * zoomY; // 헤더 높이도 줌 적용

    for (let i = 0; i < this.layoutResult.contexts.length; i++) {
      const context = this.layoutResult.contexts[i];
      const collapsed = this.collapsedContexts.has(context.dimensionValue);
      const height = collapsed ? scaledHeaderHeight : context.height + scaledHeaderHeight;

      this.contextPositions.set(context.dimensionValue, {
        y: currentY,
        height,
      });

      // Context 색상 정보 추가
      const definedValue = definedValues.find(v => v.key === context.dimensionValue);
      this.contextColors.push({
        dimensionValue: context.dimensionValue,
        color: definedValue?.color,
        index: i,
      });

      currentY += height;
    }

    // 콘텐츠 높이를 ViewportManager에 설정 (경계 체크용)
    this.viewportManager.setContentBounds(currentY);

    // 그리드 라인 업데이트
    this.updateGridLines();

    // 타임 영역 업데이트
    this.updateRenderedTimeRegions();

    // 현재 시간 위치
    this.nowX = this.viewportManager.dateToX(new Date());
  }

  /**
   * 렌더링용 타임 영역 업데이트
   */
  private updateRenderedTimeRegions(): void {
    const visibleRange = this.viewportManager.getVisibleRange();
    this.renderedTimeRegions = [];

    for (const region of this.timeRegions) {
      // 보이는 범위와 겹치는지 확인
      if (region.end.getTime() < visibleRange.start.getTime() ||
          region.start.getTime() > visibleRange.end.getTime()) {
        continue;
      }

      const x = this.viewportManager.dateToX(region.start);
      const endX = this.viewportManager.dateToX(region.end);
      const width = endX - x;

      if (width > 0) {
        this.renderedTimeRegions.push({
          region,
          x,
          width,
        });
      }
    }
  }

  private updateGridLines(): void {
    this.gridLines = this.viewportManager.getGridLines();
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private handleViewportChange(event: any): void {
    this.updateGridLines();
    this.updateRenderedTimeRegions();
    this.nowX = this.viewportManager.dateToX(new Date());

    // boundary-reached 이벤트 전파
    if (event.type === 'boundary-reached' && event.boundaryDirection) {
      this.emit('timeline-boundary-reached', {
        direction: event.boundaryDirection,
        currentStart: this.viewportManager.getVisibleRange().start,
        currentEnd: this.viewportManager.getVisibleRange().end,
      });
    }

    this.requestUpdate();
  }

  private handleDimensionChange(e: CustomEvent): void {
    const { dimension } = e.detail;
    this.changeDimension(dimension);
  }

  private toggleDimensionDropdown(e: Event): void {
    e.stopPropagation();
    this.dimensionDropdownOpen = !this.dimensionDropdownOpen;

    if (this.dimensionDropdownOpen) {
      // 외부 클릭으로 드롭다운 닫기
      const handler = (ev: MouseEvent) => {
        if (!this.contains(ev.target as Node) ||
            !(ev.target as Element).closest('.dimension-dropdown')) {
          this.dimensionDropdownOpen = false;
          document.removeEventListener('click', handler);
        }
      };
      setTimeout(() => document.addEventListener('click', handler), 0);
    }
  }

  private handleCornerDimensionSelect(key: string): void {
    this.dimensionDropdownOpen = false;
    this.changeDimension(key);
  }

  private changeDimension(dimension: string): void {
    if (dimension === this.activeDimension) return;

    const previousDimension = this.activeDimension;
    this.activeDimension = dimension;
    this.layoutCache.invalidateAll();

    this.emit('timeline-dimension-change', {
      previousDimension,
      newDimension: dimension,
    });
  }

  private handleDimensionValueClick(e: CustomEvent): void {
    const { dimension, value, label } = e.detail;
    this.emit('timeline-dimension-value-click', { dimension, value, label });
  }

  private handleTaskMouseDown(e: CustomEvent): void {
    const { task, area, dimensionValue, x, y, originalEvent } = e.detail;

    if (originalEvent.button !== 0) return; // 좌클릭만

    // task 클릭 플래그 (mouseup에서 빈 영역 선택 해제 방지)
    this._taskClickedInThisGesture = true;

    // 선택
    this.selectTask(task.id);

    // 줌 레벨이 임계치 이하면 선택만 가능 (이동/리사이즈 비활성화)
    const currentZoomY = this.viewportManager.zoomY;
    if (currentZoomY <= this.disableEditZoomThreshold) {
      return; // 선택만 하고 드래그 시작 안 함
    }

    // 스케일이 maxEditScale보다 zoom-out 되었으면 선택만 가능
    const scaleOrder = ['10min', '30min', 'hour', '6hour', '12hour', 'day', 'week', 'month'];
    const currentIdx = scaleOrder.indexOf(this.viewportManager.scaleUnit);
    const maxIdx = scaleOrder.indexOf(this.maxEditScale);
    if (currentIdx > maxIdx) {
      return; // 선택만 하고 드래그 시작 안 함
    }

    // 실적이 있는 태스크는 편집 불가 (pending만 조작 가능)
    if (task.status && task.status !== 'pending') {
      return; // 선택만 하고 드래그 시작 안 함
    }

    // 드래그 시작
    if ((area === 'body' && this.tasksDraggable) ||
        ((area === 'resize-start' || area === 'resize-end') && this.tasksResizable)) {

      this.startDrag(task, area, x, y, dimensionValue);
    }
  }

  private handleTaskDoubleClick(e: CustomEvent): void {
    this.emit('timeline-task-dblclick', e.detail);
  }

  private handleCanvasDoubleClick(e: CustomEvent): void {
    const { x, dimensionValue } = e.detail;
    const date = this.viewportManager.xToDate(x);

    this.emit('timeline-canvas-dblclick', {
      x,
      y: e.detail.y,
      date,
      dimensionValue,
    });
  }

  private handleCanvasMouseDown(e: MouseEvent): void {
    // 팬 시작
    if (this.pannable && !this.dragState) {
      this.viewportManager.startPan(e.clientX, e.clientY);
    }
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    if (this.dragState) {
      this.updateDrag(e.clientX, e.clientY);
    } else if (this.viewportManager.panning) {
      this.viewportManager.updatePan(e.clientX, e.clientY);
      this.requestUpdate();
    }
  }

  private handleCanvasMouseUp(_e: MouseEvent): void {
    if (this.dragState) {
      this.endDrag(false);
    }
    this.viewportManager.endPan();
  }

  private handleWindowMouseUp = (_e: MouseEvent): void => {
    // 드래그 중 canvas 영역 밖에서 마우스를 놓는 경우 처리
    if (this.dragState) {
      this.endDrag(false);
    }
    this.viewportManager.endPan();

    // Overscroll Bounce 시작
    this.viewportManager.startOverscrollBounce();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.dragState) {
      this.endDrag(true);
    }

    if (e.key === 'Delete' && this.selectedTaskId) {
      this.emit('timeline-task-delete-request', { taskId: this.selectedTaskId });
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = this.getBoundingClientRect();

    if (this.zoomable && e.ctrlKey) {
      // Ctrl+휠: 가로+세로 줌
      const x = e.clientX - rect.left - 200; // dimension selector 너비 제외
      const y = e.clientY - rect.top - 48; // time axis 높이 제외
      this.viewportManager.handleWheelZoom(e.deltaY, x, y);
      this.scale = this.viewportManager.scaleUnit;
      this.recalculateLayout();
    } else if (e.shiftKey) {
      // Shift+휠: 좌우 스크롤
      this.viewportManager.scrollBy(e.deltaY, 0);
    } else {
      // 일반 휠: 상하 스크롤
      this.viewportManager.scrollBy(0, e.deltaY);
    }

    // 스크롤 경계 체크
    this.viewportManager.applyScrollBounds();
    this.requestUpdate();
  };

  private handleZoomIn(): void {
    this.viewportManager.zoomIn();
    this.scale = this.viewportManager.scaleUnit;
  }

  private handleZoomOut(): void {
    this.viewportManager.zoomOut();
    this.scale = this.viewportManager.scaleUnit;
  }

  // =========================================================================
  // Drag & Drop
  // =========================================================================

  private startDrag(task: Task<T>, area: HitArea, x: number, y: number, dimensionValue: string): void {
    const mode = area === 'body' ? 'move' :
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

    this.emit('timeline-drag-start', {
      task,
      mode,
      x,
      y,
    });
  }

  private updateDrag(clientX: number, clientY: number): void {
    if (!this.dragState) return;

    const rect = this.getBoundingClientRect();
    const x = clientX - rect.left - 200;
    const _y = clientY - rect.top - 48;

    const deltaX = x - this.dragState.startX;
    const deltaMs = (deltaX / this.viewportManager.timeScale.pixelsPerUnit) *
                    this.getMsPerUnit(this.scale);

    let newStart = this.dragState.originalStart;
    let newEnd = this.dragState.originalEnd;

    if (this.dragState.mode === 'move') {
      newStart = new Date(this.dragState.originalStart.getTime() + deltaMs);
      newEnd = new Date(this.dragState.originalEnd.getTime() + deltaMs);
    } else if (this.dragState.mode === 'resize-start') {
      newStart = new Date(this.dragState.originalStart.getTime() + deltaMs);
      if (newStart.getTime() >= newEnd.getTime()) {
        newStart = new Date(newEnd.getTime() - 60000); // 최소 1분
      }
    } else if (this.dragState.mode === 'resize-end') {
      newEnd = new Date(this.dragState.originalEnd.getTime() + deltaMs);
      if (newEnd.getTime() <= newStart.getTime()) {
        newEnd = new Date(newStart.getTime() + 60000);
      }
    }

    // 스냅 (줌 레벨에 맞는 단위로)
    const snapUnit = this.viewportManager.timeScale.getSnapUnit();
    this.dragState.snappedStart = snapToUnit(newStart, snapUnit);
    this.dragState.snappedEnd = snapToUnit(newEnd, snapUnit);

    // Canvas 업데이트
    if (this.canvasEl) {
      // 드래그 중인 Task의 뷰포트 좌표 계산
      const dragStartX = this.viewportManager.dateToX(this.dragState.snappedStart);
      const dragEndX = this.viewportManager.dateToX(this.dragState.snappedEnd);
      const dragWidth = dragEndX - dragStartX;

      const cached = this.canvasEl.getTaskById(this.dragState.task.id);
      const dragY = cached ? cached.absoluteY - this.viewportManager.scrollY : _y;

      this.canvasEl.setDragging(this.dragState.task.id, {
        x: dragStartX,
        y: dragY,
        width: Math.max(20, dragWidth), // 최소 너비 보장
        height: cached?.layoutedTask.height ?? this.taskHeight,
      });
    }

    this.emit('timeline-drag', {
      task: this.dragState.task,
      mode: this.dragState.mode,
      x,
      y: _y,
      snappedStart: this.dragState.snappedStart,
      snappedEnd: this.dragState.snappedEnd,
      currentDimensionValue: this.dragState.currentDimensionValue,
    });
  }

  private endDrag(cancelled: boolean): void {
    if (!this.dragState) return;

    const { task, mode, snappedStart, snappedEnd, originalStart, originalEnd,
            originalDimensionValue, currentDimensionValue } = this.dragState;

    if (this.canvasEl) {
      this.canvasEl.setDragging(null, null);
    }

    if (!cancelled) {
      if (mode === 'move') {
        const notCancelled = this.emit('timeline-task-move', {
          task,
          originalStart,
          originalEnd,
          newStart: snappedStart,
          newEnd: snappedEnd,
          originalDimensionValue,
          newDimensionValue: currentDimensionValue,
        }, { cancelable: true });

        if (notCancelled) {
          // 이벤트가 취소되지 않았으면 DataSource 업데이트
          this.dataSource?.update(task.id, {
            start: snappedStart,
            end: snappedEnd,
          });
        }
      } else {
        const notCancelled = this.emit('timeline-task-resize', {
          task,
          originalStart,
          originalEnd,
          newStart: snappedStart,
          newEnd: snappedEnd,
          edge: mode === 'resize-start' ? 'start' : 'end',
        }, { cancelable: true });

        if (notCancelled) {
          this.dataSource?.update(task.id, {
            start: snappedStart,
            end: snappedEnd,
          });
        }
      }
    }

    this.emit('timeline-drag-end', {
      task,
      mode,
      cancelled,
    });

    this.dragState = null;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /** Task 선택 */
  selectTask(taskId: string | null): void {
    const previousTask = this.selectedTaskId
      ? this.tasks.find(t => t.id === this.selectedTaskId) ?? null
      : null;
    const task = taskId ? this.tasks.find(t => t.id === taskId) ?? null : null;

    this.selectedTaskId = taskId;

    // 선택된 Task의 dimensionValue 추적 (row 배경 강조용)
    if (task) {
      const cached = this.canvasEl?.getTaskById(taskId!);
      this.selectedDimensionValue = cached?.dimensionValue ?? null;
      this.emit('timeline-task-select', {
        task,
        previousTask,
        dimensionValue: cached?.dimensionValue ?? '',
      });
    } else {
      this.selectedDimensionValue = null;
    }
  }

  /** 날짜로 스크롤 */
  scrollToDate(date: Date, position: 'start' | 'center' | 'end' = 'center'): void {
    this.viewportManager.scrollToDate(date, position);
    this.requestUpdate();
  }

  /** Task로 스크롤 */
  scrollToTask(taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      this.scrollToDate(task.start, 'center');
      this.selectTask(taskId);
    }
  }

  /** Dimension 값 위치로 스크롤 */
  scrollToDimensionValue(dimensionValue: string): void {
    const position = this.contextPositions.get(dimensionValue);
    if (position) {
      this.viewportManager.setScroll(this.viewportManager.scrollX, position.y);
      this.selectedDimensionValue = dimensionValue;
      this.requestUpdate();
    }
  }

  /** 스케일 설정 */
  setScale(scale: TimeScaleUnit): void {
    this.scale = scale;
    this.viewportManager.setScale(scale);
  }

  /** 활성 Dimension 설정 */
  setActiveDimension(dimension: string): void {
    this.activeDimension = dimension;
  }

  /** 데이터 새로고침 */
  async refresh(): Promise<void> {
    await this.loadData();
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private getMsPerUnit(unit: TimeScaleUnit): number {
    switch (unit) {
      case '10min': return 10 * 60 * 1000;
      case '30min': return 30 * 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case '6hour': return 6 * 60 * 60 * 1000;
      case '12hour': return 12 * 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Context 색상 정보를 Map으로 변환 (DimensionSelector용)
   */
  private getContextColorsMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const info of this.contextColors) {
      if (info.color) {
        map.set(info.dimensionValue, info.color);
      }
    }
    return map;
  }
}
