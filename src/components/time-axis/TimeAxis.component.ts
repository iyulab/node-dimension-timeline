/**
 * TimeAxis 컴포넌트
 * 시간축 헤더 렌더링
 */

import { html, PropertyValues, nothing, LitElement, CSSResultGroup } from 'lit';
import { property, state } from 'lit/decorators.js';

import { styles } from './TimeAxis.styles.js';
import type { TimeScaleUnit, TimeRange } from '../../types/index.js';
import { formatDate, floorToUnit, addUnit, today } from '../../utilities/DateUtils.js';

/**
 * 시간 라벨 정보
 */
interface TimeLabel {
  date: Date;
  x: number;
  width: number;
  text: string;
  major: boolean;
}

/**
 * TimeAxis 컴포넌트
 */
export class TimeAxis extends LitElement {
  static styles: CSSResultGroup = styles;

  static define(name: string) {
    if (!customElements.get(name)) {
      customElements.define(name, this);
    }
  }

  // =========================================================================
  // Properties
  // =========================================================================

  /** 현재 스케일 단위 */
  @property({ type: String })
  scale: TimeScaleUnit = 'day';

  /** 보이는 시간 범위 */
  @property({ attribute: false })
  visibleRange: TimeRange | null = null;

  /** 단위당 픽셀 수 */
  @property({ type: Number, attribute: 'pixels-per-unit' })
  pixelsPerUnit: number = 120;

  /** 스크롤 X 오프셋 */
  @property({ type: Number, attribute: 'scroll-x' })
  scrollX: number = 0;

  /** 현재 시간 표시 */
  @property({ type: Boolean, attribute: 'show-now' })
  showNow: boolean = true;

  /** 오늘 하이라이트 */
  @property({ type: Boolean, attribute: 'highlight-today' })
  highlightToday: boolean = true;

  /** 높이 */
  @property({ type: Number })
  height: number = 48;

  /** 현재 시간 X 좌표 (외부에서 전달) */
  @property({ type: Number, attribute: 'now-x' })
  nowX: number | null = null;

  // =========================================================================
  // State
  // =========================================================================

  @state() private primaryLabels: TimeLabel[] = [];
  @state() private secondaryLabels: TimeLabel[] = [];
  @state() private todayRange: { x: number; width: number } | null = null;

  // =========================================================================
  // Lifecycle
  // =========================================================================

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    const updateTriggers = ['scale', 'visibleRange', 'pixelsPerUnit', 'scrollX', 'nowX'];
    if (updateTriggers.some(key => changedProperties.has(key))) {
      this.updateLabels();
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  render() {
    return html`
      <div class="time-axis-container" style="height: ${this.height}px">
        <!-- 상단 (Primary) 라벨 -->
        <div class="primary-labels">
          ${this.primaryLabels.map(label => html`
            <div
              class="time-label primary"
              style="left: ${label.x}px; width: ${label.width}px"
            >
              ${label.text}
            </div>
          `)}
        </div>

        <!-- 하단 (Secondary) 라벨 -->
        <div class="secondary-labels">
          ${this.secondaryLabels.map(label => html`
            <div
              class="time-label ${label.major ? 'major' : 'minor'}"
              style="left: ${label.x}px; width: ${label.width}px"
            >
              ${label.text}
            </div>
          `)}

          <!-- 오늘 하이라이트 -->
          ${this.highlightToday && this.todayRange ? html`
            <div
              class="today-highlight"
              style="left: ${this.todayRange.x}px; width: ${this.todayRange.width}px"
            ></div>
          ` : nothing}
        </div>

        <!-- 현재 시간 표시 -->
        ${this.showNow && this.nowX !== null ? html`
          <div class="now-indicator" style="left: ${this.nowX}px"></div>
        ` : nothing}
      </div>
    `;
  }

  // =========================================================================
  // Private
  // =========================================================================

  private updateLabels(): void {
    if (!this.visibleRange) {
      this.primaryLabels = [];
      this.secondaryLabels = [];
      this.todayRange = null;
      return;
    }

    const { primaryUnit, secondaryUnit } = this.getUnitsForScale(this.scale);

    // Primary 라벨 생성
    this.primaryLabels = this.generateLabels(primaryUnit, true);

    // Secondary 라벨 생성
    this.secondaryLabels = this.generateLabels(secondaryUnit, false);

    // nowX는 외부에서 전달받으므로 여기서 계산하지 않음

    // 오늘 범위
    if (this.highlightToday && (this.scale === 'day' || this.scale === 'week')) {
      const todayStart = today();
      const todayEnd = addUnit(todayStart, 'day', 1);
      const x = this.dateToX(todayStart);
      const width = this.dateToX(todayEnd) - x;
      this.todayRange = { x, width };
    } else {
      this.todayRange = null;
    }
  }

  private generateLabels(unit: TimeScaleUnit, primary: boolean): TimeLabel[] {
    if (!this.visibleRange) return [];

    const labels: TimeLabel[] = [];
    let current = floorToUnit(this.visibleRange.start, unit);

    while (current.getTime() <= this.visibleRange.end.getTime()) {
      const next = addUnit(current, unit, 1);
      const x = this.dateToX(current);
      const width = this.dateToX(next) - x;

      if (x + width > 0 && x < this.clientWidth + 100) {
        labels.push({
          date: current,
          x,
          width,
          text: this.formatLabel(current, unit, primary),
          major: primary,
        });
      }

      current = next;
    }

    return labels;
  }

  private getUnitsForScale(scale: TimeScaleUnit): {
    primaryUnit: TimeScaleUnit;
    secondaryUnit: TimeScaleUnit;
  } {
    switch (scale) {
      case '10min':
        return { primaryUnit: 'hour', secondaryUnit: '10min' };
      case 'hour':
        return { primaryUnit: 'day', secondaryUnit: 'hour' };
      case 'day':
        return { primaryUnit: 'week', secondaryUnit: 'day' };
      case 'week':
        return { primaryUnit: 'week', secondaryUnit: 'day' };
      default:
        return { primaryUnit: 'week', secondaryUnit: 'day' };
    }
  }

  private formatLabel(date: Date, unit: TimeScaleUnit, primary: boolean): string {
    if (primary) {
      switch (unit) {
        case 'hour':
          return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}시`;
        case 'day':
          return `${date.getMonth() + 1}월 ${date.getDate()}일`;
        case 'week':
          return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
        default:
          return formatDate(date, unit);
      }
    } else {
      switch (unit) {
        case '10min':
          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        case 'hour':
          return `${date.getHours()}:00`;
        case 'day':
          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
          return `${date.getDate()} (${dayNames[date.getDay()]})`;
        default:
          return formatDate(date, unit);
      }
    }
  }

  private dateToX(date: Date): number {
    if (!this.visibleRange) return 0;

    const msPerUnit = this.getMsPerUnit(this.scale);
    const originMs = this.visibleRange.start.getTime();
    const dateMs = date.getTime();

    return ((dateMs - originMs) / msPerUnit) * this.pixelsPerUnit - this.scrollX;
  }

  private getMsPerUnit(unit: TimeScaleUnit): number {
    switch (unit) {
      case '10min': return 10 * 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
