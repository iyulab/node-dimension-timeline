/**
 * DefaultTemplate
 * 기본 Task 렌더링 템플릿
 */

import type { Task, LayoutedTask } from '../types/index.js';
import type { TaskTemplate, RenderContext, TaskStyleConfig, TaskStateStyle } from './TaskTemplate.js';
import { DEFAULT_STYLE_CONFIG } from './TaskTemplate.js';
import {
  fillRoundedRect,
  strokeRoundedRect,
  truncateText,
  drawProgressBar,
  withAlpha,
} from '../utilities/CanvasUtils.js';

/**
 * DefaultTemplate 클래스
 * 기본적인 Task 렌더링을 제공합니다.
 */
export class DefaultTemplate<T = unknown> implements TaskTemplate<T> {
  readonly name = 'default';
  private styleConfig: TaskStyleConfig;

  constructor(config?: Partial<TaskStyleConfig>) {
    this.styleConfig = { ...DEFAULT_STYLE_CONFIG, ...config };
  }

  render(
    layoutedTask: LayoutedTask<T>,
    context: RenderContext,
    state: { selected: boolean; hovered: boolean; dragging: boolean },
  ): void {
    const { ctx } = context;
    const { task, x, y, width, height } = layoutedTask;
    const config = this.styleConfig;

    // 최소 너비 체크
    if (width < 4) return;

    // 상태별 스타일 결정
    const baseStyle = this.getStateStyle(task.status);
    const style = this.applyStateOverrides(baseStyle, state);

    // Task 배경색 (task.color 우선)
    const bgColor = task.color ?? style.backgroundColor;

    // 투명도 적용
    const finalBgColor = style.opacity < 1
      ? withAlpha(bgColor, style.opacity)
      : bgColor;

    // 배경 그리기
    fillRoundedRect(ctx, x, y, width, height, config.borderRadius, finalBgColor);

    // 테두리 그리기
    if (style.borderWidth > 0) {
      strokeRoundedRect(
        ctx, x, y, width, height,
        config.borderRadius,
        style.borderColor,
        style.borderWidth
      );
    }

    // 선택됨 상태 표시
    if (state.selected) {
      strokeRoundedRect(
        ctx, x - 1, y - 1, width + 2, height + 2,
        config.borderRadius + 1,
        config.selected.borderColor ?? '#1D4ED8',
        config.selected.borderWidth ?? 2
      );
    }

    // 라벨 그리기 (충분한 너비가 있을 때만)
    if (width > config.padding * 2 + 20) {
      this.renderLabel(ctx, task, x, y, width, height, style, config);
    }

    // 프로그레스 바 그리기
    if (task.progress !== undefined && task.progress > 0 && width > 20) {
      this.renderProgressBar(ctx, task.progress, x, y, width, height, config);
    }

    // 리사이즈 핸들 (호버 또는 선택 시)
    if ((state.hovered || state.selected) && !state.dragging && width > 30) {
      this.renderResizeHandles(ctx, x, y, width, height, config);
    }
  }

  getColor(task: Task<T>): string {
    if (task.color) return task.color;
    const style = this.getStateStyle(task.status);
    return style.backgroundColor;
  }

  getLabel(task: Task<T>): string {
    return task.label ?? '';
  }

  getStyleConfig(): TaskStyleConfig {
    return { ...this.styleConfig };
  }

  setStyleConfig(config: Partial<TaskStyleConfig>): void {
    this.styleConfig = { ...this.styleConfig, ...config };
  }

  // =========================================================================
  // Private: 스타일 헬퍼
  // =========================================================================

  private getStateStyle(status?: string): TaskStateStyle {
    if (status && status in this.styleConfig.states) {
      return this.styleConfig.states[status as keyof typeof this.styleConfig.states];
    }
    return this.styleConfig.states.default;
  }

  private applyStateOverrides(
    baseStyle: TaskStateStyle,
    state: { selected: boolean; hovered: boolean; dragging: boolean },
  ): TaskStateStyle {
    let result = { ...baseStyle };

    if (state.dragging) {
      result = { ...result, ...this.styleConfig.dragging };
    } else if (state.hovered) {
      result = { ...result, ...this.styleConfig.hovered };
    }

    if (state.selected) {
      result = { ...result, ...this.styleConfig.selected };
    }

    return result;
  }

  // =========================================================================
  // Private: 렌더링 헬퍼
  // =========================================================================

  private renderLabel(
    ctx: CanvasRenderingContext2D,
    task: Task<T>,
    x: number,
    y: number,
    width: number,
    height: number,
    style: TaskStateStyle,
    config: TaskStyleConfig,
  ): void {
    const label = this.getLabel(task);
    if (!label) return;

    ctx.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
    ctx.fillStyle = style.textColor;

    const maxWidth = width - config.padding * 2;
    const displayText = truncateText(ctx, label, maxWidth);

    if (displayText) {
      const metrics = ctx.measureText(displayText);
      const textX = x + config.padding;
      const textY = y + height / 2 + metrics.actualBoundingBoxAscent / 2;
      ctx.fillText(displayText, textX, textY);
    }
  }

  private renderProgressBar(
    ctx: CanvasRenderingContext2D,
    progress: number,
    x: number,
    y: number,
    width: number,
    height: number,
    config: TaskStyleConfig,
  ): void {
    const barY = y + height - config.progressBarHeight - 2;
    const barWidth = width - 4;

    drawProgressBar(
      ctx,
      x + 2,
      barY,
      barWidth,
      config.progressBarHeight,
      progress,
      config.progressBarBgColor,
      config.progressBarColor,
      1
    );
  }

  private renderResizeHandles(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    config: TaskStyleConfig,
  ): void {
    const handleWidth = config.resizeHandleWidth;
    const handleColor = config.resizeHandleColor;

    // 왼쪽 핸들
    ctx.fillStyle = handleColor;
    ctx.fillRect(x, y, handleWidth, height);

    // 오른쪽 핸들
    ctx.fillRect(x + width - handleWidth, y, handleWidth, height);
  }
}

/**
 * MinimalTemplate
 * 최소한의 렌더링만 수행하는 경량 템플릿
 */
export class MinimalTemplate<T = unknown> implements TaskTemplate<T> {
  readonly name = 'minimal';
  private styleConfig: TaskStyleConfig;

  constructor(config?: Partial<TaskStyleConfig>) {
    this.styleConfig = {
      ...DEFAULT_STYLE_CONFIG,
      borderRadius: 2,
      ...config,
    };
  }

  render(
    layoutedTask: LayoutedTask<T>,
    context: RenderContext,
    state: { selected: boolean; hovered: boolean; dragging: boolean },
  ): void {
    const { ctx } = context;
    const { task, x, y, width, height } = layoutedTask;

    if (width < 2) return;

    // 배경색
    const bgColor = task.color ?? this.styleConfig.states.default.backgroundColor;
    const opacity = state.dragging ? 0.6 : state.hovered ? 0.85 : 1;

    ctx.fillStyle = withAlpha(bgColor, opacity);
    fillRoundedRect(ctx, x, y, width, height, this.styleConfig.borderRadius, ctx.fillStyle as string);

    // 선택됨 표시
    if (state.selected) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      strokeRoundedRect(ctx, x, y, width, height, this.styleConfig.borderRadius, '#000000', 2);
    }
  }

  getColor(task: Task<T>): string {
    return task.color ?? this.styleConfig.states.default.backgroundColor;
  }

  getLabel(task: Task<T>): string {
    return task.label ?? '';
  }

  getStyleConfig(): TaskStyleConfig {
    return { ...this.styleConfig };
  }

  setStyleConfig(config: Partial<TaskStyleConfig>): void {
    this.styleConfig = { ...this.styleConfig, ...config };
  }
}
