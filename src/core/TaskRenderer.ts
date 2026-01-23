/**
 * TaskRenderer
 * Task Canvas 렌더링 담당
 */

import type { LayoutedTask, TimeRegion } from '../types/index.js';
import type { ContextLayoutResult } from './CollisionLayoutEngine.js';
import type { TaskTemplate, RenderContext } from '../templates/TaskTemplate.js';
import { getTemplate } from '../templates/TemplateRegistry.js';
import { setupHighDpiCanvas, clearCanvas, getDevicePixelRatio } from '../utilities/CanvasUtils.js';

/**
 * 렌더링된 타임 영역 정보
 */
export interface RenderedTimeRegion {
  region: TimeRegion;
  x: number;
  width: number;
}

/**
 * Context 색상 정보
 */
export interface ContextColorInfo {
  dimensionValue: string;
  color?: string;
  index: number;
}

/**
 * 렌더링 옵션
 */
export interface RenderOptions {
  /** 선택된 Task ID */
  selectedTaskId?: string | null;
  /** 호버된 Task ID */
  hoveredTaskId?: string | null;
  /** 드래그 중인 Task ID */
  draggingTaskId?: string | null;
  /** 드래그 중인 Task의 임시 위치와 크기 */
  draggingPosition?: { x: number; y: number; width: number; height: number } | null;
  /** 템플릿 이름 */
  templateName?: string;
  /** 그리드 라인 표시 */
  showGridLines?: boolean;
  /** 현재 시간 마커 표시 */
  showNowMarker?: boolean;
  /** 타임 영역 목록 */
  timeRegions?: RenderedTimeRegion[];
  /** Context 색상 정보 */
  contextColors?: ContextColorInfo[];
  /** 짝수행 배경색 사용 */
  useAlternatingRowColors?: boolean;
  /** 선택된 Task의 Dimension 값 (row 배경 강조용) */
  selectedDimensionValue?: string | null;
  /** Context 구분선 표시 */
  showContextDividers?: boolean;
}

/**
 * 그리드 라인 정보
 */
export interface GridLine {
  x: number;
  date: Date;
  major: boolean;
}

/**
 * TaskRenderer 클래스
 * Canvas에 Task를 렌더링합니다.
 */
export class TaskRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private template: TaskTemplate;

  // 스타일 설정
  private gridLineColor = 'rgba(0, 0, 0, 0.08)';
  private gridLineMajorColor = 'rgba(0, 0, 0, 0.15)';
  private nowMarkerColor = '#EF4444';
  private backgroundColor = '#FFFFFF';
  private alternatingRowColor = 'rgba(0, 0, 0, 0.02)';
  private timeRegionDefaultColor = 'rgba(100, 100, 100, 0.1)';
  private selectedRowColor = 'rgba(59, 130, 246, 0.08)'; // 연한 파란색
  private contextDividerColor = 'rgba(0, 0, 0, 0.1)'; // Context 구분선 색상

  constructor(canvas: HTMLCanvasElement, templateName: string = 'default') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.template = getTemplate(templateName);
  }

  /**
   * Canvas 크기 설정
   */
  setSize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;

    this.width = width;
    this.height = height;
    this.ctx = setupHighDpiCanvas(this.canvas, width, height);
  }

  /**
   * 템플릿 변경
   */
  setTemplate(name: string): void {
    this.template = getTemplate(name);
  }

  /**
   * 전체 렌더링
   */
  render(
    contexts: ContextLayoutResult[],
    contextPositions: Map<string, { y: number; height: number }>,
    gridLines: GridLine[],
    nowX: number | null,
    scrollX: number,
    scrollY: number,
    options: RenderOptions = {},
  ): void {
    // Canvas 클리어
    this.clear();

    const renderContext: RenderContext = {
      ctx: this.ctx,
      dpr: getDevicePixelRatio(),
      zoom: 1,
      now: new Date(),
    };

    // 배경
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Context 배경 (짝수행 색상 또는 Dimension 색상)
    this.renderContextBackgrounds(contexts, contextPositions, scrollY, options);

    // 타임 영역 렌더링 (그리드 뒤, Task 뒤)
    if (options.timeRegions && options.timeRegions.length > 0) {
      this.renderTimeRegions(options.timeRegions);
    }

    // 그리드 라인
    if (options.showGridLines !== false) {
      this.renderGridLines(gridLines);
    }

    // Context별 Task 렌더링
    for (const context of contexts) {
      const position = contextPositions.get(context.dimensionValue);
      if (!position) continue;

      const contextY = position.y - scrollY;

      // 뷰포트 밖이면 스킵
      if (contextY + position.height < 0 || contextY > this.height) continue;

      // 클리핑 영역 설정
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(0, Math.max(0, contextY), this.width, position.height);
      this.ctx.clip();

      // Task 렌더링
      for (const layoutedTask of context.tasks) {
        // 뷰포트 좌표로 X 변환
        const viewportX = layoutedTask.x - scrollX;

        // 뷰포트 밖 Task 스킵
        if (viewportX + layoutedTask.width < 0 || viewportX > this.width) continue;

        const taskY = contextY + layoutedTask.y;
        if (taskY + layoutedTask.height < 0 || taskY > this.height) continue;

        // 드래그 중인 Task는 나중에 렌더링
        if (layoutedTask.task.id === options.draggingTaskId) continue;

        const state = {
          selected: layoutedTask.task.id === options.selectedTaskId,
          hovered: layoutedTask.task.id === options.hoveredTaskId,
          dragging: false,
        };

        // 뷰포트 좌표로 변환
        const viewportTask: LayoutedTask = {
          ...layoutedTask,
          x: viewportX,
          y: taskY,
        };

        this.template.render(viewportTask, renderContext, state);
      }

      this.ctx.restore();
    }

    // 현재 시간 마커
    if (options.showNowMarker !== false && nowX !== null && nowX >= 0 && nowX <= this.width) {
      this.renderNowMarker(nowX);
    }

    // 드래그 중인 Task (최상위에 렌더링)
    if (options.draggingTaskId && options.draggingPosition) {
      this.renderDraggingTask(contexts, options, renderContext);
    }
  }

  /**
   * 부분 렌더링 (특정 영역만)
   */
  renderRegion(
    contexts: ContextLayoutResult[],
    contextPositions: Map<string, { y: number; height: number }>,
    region: { x: number; y: number; width: number; height: number },
    gridLines: GridLine[],
    scrollY: number,
    options: RenderOptions = {},
  ): void {
    const renderContext: RenderContext = {
      ctx: this.ctx,
      dpr: getDevicePixelRatio(),
      zoom: 1,
      now: new Date(),
    };

    // 영역 클리어
    this.ctx.clearRect(region.x, region.y, region.width, region.height);
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(region.x, region.y, region.width, region.height);

    // 클리핑 적용
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(region.x, region.y, region.width, region.height);
    this.ctx.clip();

    // 그리드 라인 (영역 내)
    if (options.showGridLines !== false) {
      const visibleGridLines = gridLines.filter(
        line => line.x >= region.x && line.x <= region.x + region.width
      );
      this.renderGridLines(visibleGridLines);
    }

    // Task 렌더링 (영역과 겹치는 것만)
    for (const context of contexts) {
      const position = contextPositions.get(context.dimensionValue);
      if (!position) continue;

      const contextY = position.y - scrollY;

      // 영역과 겹치지 않으면 스킵
      if (contextY + position.height < region.y || contextY > region.y + region.height) continue;

      for (const layoutedTask of context.tasks) {
        const taskY = contextY + layoutedTask.y;

        // 영역과 겹치지 않으면 스킵
        if (layoutedTask.x + layoutedTask.width < region.x ||
            layoutedTask.x > region.x + region.width ||
            taskY + layoutedTask.height < region.y ||
            taskY > region.y + region.height) {
          continue;
        }

        if (layoutedTask.task.id === options.draggingTaskId) continue;

        const state = {
          selected: layoutedTask.task.id === options.selectedTaskId,
          hovered: layoutedTask.task.id === options.hoveredTaskId,
          dragging: false,
        };

        const viewportTask: LayoutedTask = {
          ...layoutedTask,
          y: taskY,
        };

        this.template.render(viewportTask, renderContext, state);
      }
    }

    this.ctx.restore();
  }

  /**
   * Canvas 클리어
   */
  clear(): void {
    clearCanvas(this.ctx);
  }

  // =========================================================================
  // Private
  // =========================================================================

  /**
   * Context 배경 렌더링 (짝수행 색상 또는 Dimension 색상)
   */
  private renderContextBackgrounds(
    contexts: ContextLayoutResult[],
    contextPositions: Map<string, { y: number; height: number }>,
    scrollY: number,
    options: RenderOptions,
  ): void {
    const contextColors = options.contextColors ?? [];
    const useAlternating = options.useAlternatingRowColors !== false;
    const showDividers = options.showContextDividers !== false;
    const selectedDimensionValue = options.selectedDimensionValue;

    for (let i = 0; i < contexts.length; i++) {
      const context = contexts[i];
      const position = contextPositions.get(context.dimensionValue);
      if (!position) continue;

      const contextY = position.y - scrollY;

      // 뷰포트 밖이면 스킵
      if (contextY + position.height < 0 || contextY > this.height) continue;

      // 선택된 row 배경 강조
      if (selectedDimensionValue && context.dimensionValue === selectedDimensionValue) {
        this.ctx.fillStyle = this.selectedRowColor;
        this.ctx.fillRect(0, contextY, this.width, position.height);
      } else {
        // 색상 결정: Dimension 색상 우선, 없으면 짝수행 색상
        const colorInfo = contextColors.find(c => c.dimensionValue === context.dimensionValue);

        if (colorInfo?.color) {
          // Dimension 색상 사용 (투명도 적용)
          this.ctx.fillStyle = this.applyAlpha(colorInfo.color, 0.15);
          this.ctx.fillRect(0, contextY, this.width, position.height);
        } else if (useAlternating && i % 2 === 1) {
          // 짝수행(0-indexed에서 홀수) 색상
          this.ctx.fillStyle = this.alternatingRowColor;
          this.ctx.fillRect(0, contextY, this.width, position.height);
        }
      }

      // Context 구분선 (상단/하단)
      if (showDividers) {
        this.ctx.strokeStyle = this.contextDividerColor;
        this.ctx.lineWidth = 1;

        // 상단 구분선
        this.ctx.beginPath();
        this.ctx.moveTo(0, Math.floor(contextY) + 0.5);
        this.ctx.lineTo(this.width, Math.floor(contextY) + 0.5);
        this.ctx.stroke();

        // 하단 구분선 (마지막 context만)
        if (i === contexts.length - 1) {
          this.ctx.beginPath();
          this.ctx.moveTo(0, Math.floor(contextY + position.height) - 0.5);
          this.ctx.lineTo(this.width, Math.floor(contextY + position.height) - 0.5);
          this.ctx.stroke();
        }
      }
    }
  }

  /**
   * 타임 영역 렌더링
   */
  private renderTimeRegions(regions: RenderedTimeRegion[]): void {
    for (const { region, x, width } of regions) {
      const color = region.color ?? this.timeRegionDefaultColor;
      const opacity = region.opacity ?? 0.15;

      // 배경 색상
      this.ctx.fillStyle = this.applyAlpha(color, opacity);
      this.ctx.fillRect(x, 0, width, this.height);

      // 라벨 표시 (상단)
      if (region.label) {
        this.ctx.save();
        this.ctx.font = '11px system-ui, sans-serif';
        this.ctx.fillStyle = this.applyAlpha(color, 0.8);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        const labelX = x + width / 2;
        const labelText = region.label;
        const textWidth = this.ctx.measureText(labelText).width;

        // 라벨이 영역보다 작을 때만 표시
        if (textWidth < width - 4) {
          this.ctx.fillText(labelText, labelX, 4);
        }
        this.ctx.restore();
      }
    }
  }

  private renderGridLines(gridLines: GridLine[]): void {
    this.ctx.lineWidth = 1;

    for (const line of gridLines) {
      this.ctx.strokeStyle = line.major ? this.gridLineMajorColor : this.gridLineColor;
      this.ctx.beginPath();
      this.ctx.moveTo(Math.floor(line.x) + 0.5, 0);
      this.ctx.lineTo(Math.floor(line.x) + 0.5, this.height);
      this.ctx.stroke();
    }
  }

  private renderNowMarker(x: number): void {
    this.ctx.strokeStyle = this.nowMarkerColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.height);
    this.ctx.stroke();

    // 상단 삼각형
    this.ctx.fillStyle = this.nowMarkerColor;
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x - 6, 0);
    this.ctx.lineTo(x, 10);
    this.ctx.lineTo(x + 6, 0);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderDraggingTask(
    contexts: ContextLayoutResult[],
    options: RenderOptions,
    renderContext: RenderContext,
  ): void {
    // 드래그 중인 Task 찾기
    let draggingTask: LayoutedTask | null = null;

    for (const context of contexts) {
      const found = context.tasks.find(t => t.task.id === options.draggingTaskId);
      if (found) {
        draggingTask = found;
        break;
      }
    }

    if (!draggingTask || !options.draggingPosition) return;

    // 드래그 중인 Task의 현재 위치와 크기 사용
    const viewportTask: LayoutedTask = {
      ...draggingTask,
      x: options.draggingPosition.x,
      y: options.draggingPosition.y,
      width: options.draggingPosition.width ?? draggingTask.width,
      height: options.draggingPosition.height ?? draggingTask.height,
    };

    // 반투명 효과로 드래그 중임을 표시
    this.ctx.save();
    this.ctx.globalAlpha = 0.7;

    this.template.render(viewportTask, renderContext, {
      selected: true,
      hovered: false,
      dragging: true,
    });

    this.ctx.restore();
  }

  /**
   * 색상에 alpha 적용 (hex, rgb, hsl 지원)
   */
  private applyAlpha(color: string, alpha: number): string {
    // 이미 rgba/hsla 형식이면 그대로 반환
    if (color.startsWith('rgba') || color.startsWith('hsla')) {
      return color;
    }
    // rgb() -> rgba()
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    // hsl() -> hsla()
    if (color.startsWith('hsl(')) {
      return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
    }

    // hex 형식
    let hex = color.replace('#', '');

    // 3자리 hex를 6자리로 확장
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // =========================================================================
  // 스타일 설정
  // =========================================================================

  setGridLineColor(color: string, majorColor?: string): void {
    this.gridLineColor = color;
    if (majorColor) this.gridLineMajorColor = majorColor;
  }

  setNowMarkerColor(color: string): void {
    this.nowMarkerColor = color;
  }

  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  setAlternatingRowColor(color: string): void {
    this.alternatingRowColor = color;
  }

  setTimeRegionDefaultColor(color: string): void {
    this.timeRegionDefaultColor = color;
  }

  setSelectedRowColor(color: string): void {
    this.selectedRowColor = color;
  }

  setContextDividerColor(color: string): void {
    this.contextDividerColor = color;
  }
}
