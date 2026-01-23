/**
 * 시간 스케일 관리
 * 시간-픽셀 변환 및 스케일 전환 담당
 */

import type { TimeRange, TimeScaleUnit, TimeScaleConfig } from '../types/index.js';
import { unitToMs, floorToUnit, addUnit } from '../utilities/DateUtils.js';

/**
 * 스케일별 기본 설정
 */
const SCALE_DEFAULTS: Record<TimeScaleUnit, Omit<TimeScaleConfig, 'unit'>> = {
  '10min': { pixelsPerUnit: 60, minPixelsPerUnit: 20, maxPixelsPerUnit: 200 },
  'hour': { pixelsPerUnit: 80, minPixelsPerUnit: 30, maxPixelsPerUnit: 300 },
  'day': { pixelsPerUnit: 120, minPixelsPerUnit: 40, maxPixelsPerUnit: 400 },
  'week': { pixelsPerUnit: 200, minPixelsPerUnit: 80, maxPixelsPerUnit: 600 },
};

/**
 * 스케일 순서 (줌 인/아웃 시 전환용)
 */
const SCALE_ORDER: TimeScaleUnit[] = ['10min', 'hour', 'day', 'week'];

/**
 * TimeScale 클래스
 * 시간과 픽셀 좌표 간의 변환을 담당합니다.
 */
export class TimeScale {
  private _config: TimeScaleConfig;
  private _origin: Date; // 기준 시간 (x=0)

  constructor(
    unit: TimeScaleUnit = 'day',
    origin?: Date,
    pixelsPerUnit?: number,
  ) {
    const defaults = SCALE_DEFAULTS[unit];
    this._config = {
      unit,
      pixelsPerUnit: pixelsPerUnit ?? defaults.pixelsPerUnit,
      minPixelsPerUnit: defaults.minPixelsPerUnit,
      maxPixelsPerUnit: defaults.maxPixelsPerUnit,
    };
    this._origin = origin ?? floorToUnit(new Date(), unit);
  }

  // =========================================================================
  // Getters
  // =========================================================================

  /** 현재 스케일 단위 */
  get unit(): TimeScaleUnit {
    return this._config.unit;
  }

  /** 단위당 픽셀 수 */
  get pixelsPerUnit(): number {
    return this._config.pixelsPerUnit;
  }

  /** 기준 시간 */
  get origin(): Date {
    return new Date(this._origin);
  }

  /** 현재 스케일 설정 */
  get config(): Readonly<TimeScaleConfig> {
    return { ...this._config };
  }

  // =========================================================================
  // 시간 → 픽셀 변환
  // =========================================================================

  /**
   * 날짜를 X 좌표(픽셀)로 변환
   */
  dateToX(date: Date): number {
    const ms = date.getTime() - this._origin.getTime();
    const unitMs = unitToMs(this._config.unit);
    return (ms / unitMs) * this._config.pixelsPerUnit;
  }

  /**
   * 시간 범위를 픽셀 범위로 변환
   */
  rangeToPixels(range: TimeRange): { start: number; end: number; width: number } {
    const start = this.dateToX(range.start);
    const end = this.dateToX(range.end);
    return { start, end, width: end - start };
  }

  // =========================================================================
  // 픽셀 → 시간 변환
  // =========================================================================

  /**
   * X 좌표(픽셀)를 날짜로 변환
   */
  xToDate(x: number): Date {
    const unitMs = unitToMs(this._config.unit);
    const ms = (x / this._config.pixelsPerUnit) * unitMs;
    return new Date(this._origin.getTime() + ms);
  }

  /**
   * 픽셀 범위를 시간 범위로 변환
   */
  pixelsToRange(startX: number, endX: number): TimeRange {
    return {
      start: this.xToDate(startX),
      end: this.xToDate(endX),
    };
  }

  // =========================================================================
  // 스케일 조작
  // =========================================================================

  /**
   * 줌 레벨 설정 (1.0 = 기본)
   */
  setZoom(zoom: number, focusX?: number): void {
    const defaults = SCALE_DEFAULTS[this._config.unit];
    const newPixelsPerUnit = defaults.pixelsPerUnit * zoom;

    // 범위 제한
    const clamped = Math.max(
      this._config.minPixelsPerUnit,
      Math.min(this._config.maxPixelsPerUnit, newPixelsPerUnit),
    );

    // 포커스 지점 유지
    if (focusX !== undefined) {
      const focusDate = this.xToDate(focusX);
      this._config.pixelsPerUnit = clamped;
      const newFocusX = this.dateToX(focusDate);
      const offsetMs = ((focusX - newFocusX) / clamped) * unitToMs(this._config.unit);
      this._origin = new Date(this._origin.getTime() - offsetMs);
    } else {
      this._config.pixelsPerUnit = clamped;
    }
  }

  /**
   * 현재 줌 레벨 가져오기
   */
  getZoom(): number {
    const defaults = SCALE_DEFAULTS[this._config.unit];
    return this._config.pixelsPerUnit / defaults.pixelsPerUnit;
  }

  /**
   * 스케일 단위 변경
   */
  setUnit(unit: TimeScaleUnit, preserveView: boolean = true): void {
    if (unit === this._config.unit) return;

    // 현재 보이는 중앙 시간 저장
    const centerDate = preserveView ? this._origin : undefined;

    const defaults = SCALE_DEFAULTS[unit];
    this._config = {
      unit,
      pixelsPerUnit: defaults.pixelsPerUnit,
      minPixelsPerUnit: defaults.minPixelsPerUnit,
      maxPixelsPerUnit: defaults.maxPixelsPerUnit,
    };

    // 기준점 재설정
    this._origin = centerDate
      ? floorToUnit(centerDate, unit)
      : floorToUnit(new Date(), unit);
  }

  /**
   * 줌 인 (더 세밀한 스케일로)
   */
  zoomIn(focusX?: number): boolean {
    const currentIndex = SCALE_ORDER.indexOf(this._config.unit);

    // 먼저 현재 스케일 내에서 줌
    const newZoom = this.getZoom() * 1.2;
    const maxZoom = this._config.maxPixelsPerUnit / SCALE_DEFAULTS[this._config.unit].pixelsPerUnit;

    if (newZoom <= maxZoom) {
      this.setZoom(newZoom, focusX);
      return true;
    }

    // 최대 줌에 도달했고 더 세밀한 스케일이 있으면 전환
    if (currentIndex > 0) {
      const centerDate = focusX !== undefined ? this.xToDate(focusX) : this._origin;
      this.setUnit(SCALE_ORDER[currentIndex - 1]);
      this._origin = floorToUnit(centerDate, this._config.unit);
      return true;
    }

    return false;
  }

  /**
   * 줌 아웃 (더 넓은 스케일로)
   */
  zoomOut(focusX?: number): boolean {
    const currentIndex = SCALE_ORDER.indexOf(this._config.unit);

    // 먼저 현재 스케일 내에서 줌
    const newZoom = this.getZoom() / 1.2;
    const minZoom = this._config.minPixelsPerUnit / SCALE_DEFAULTS[this._config.unit].pixelsPerUnit;

    if (newZoom >= minZoom) {
      this.setZoom(newZoom, focusX);
      return true;
    }

    // 최소 줌에 도달했고 더 넓은 스케일이 있으면 전환
    if (currentIndex < SCALE_ORDER.length - 1) {
      const centerDate = focusX !== undefined ? this.xToDate(focusX) : this._origin;
      this.setUnit(SCALE_ORDER[currentIndex + 1]);
      this._origin = floorToUnit(centerDate, this._config.unit);
      return true;
    }

    return false;
  }

  // =========================================================================
  // 팬 (스크롤)
  // =========================================================================

  /**
   * 기준점 이동 (팬)
   */
  pan(deltaX: number): void {
    const deltMs = (deltaX / this._config.pixelsPerUnit) * unitToMs(this._config.unit);
    this._origin = new Date(this._origin.getTime() - deltMs);
  }

  /**
   * 특정 날짜로 스크롤
   */
  scrollToDate(date: Date, offsetX: number = 0): void {
    const targetOrigin = new Date(date.getTime() - (offsetX / this._config.pixelsPerUnit) * unitToMs(this._config.unit));
    this._origin = targetOrigin;
  }

  // =========================================================================
  // 유틸리티
  // =========================================================================

  /**
   * 주어진 너비에 들어가는 시간 범위 계산
   */
  getVisibleRange(width: number, startX: number = 0): TimeRange {
    return {
      start: this.xToDate(startX),
      end: this.xToDate(startX + width),
    };
  }

  /**
   * 보이는 영역 내의 그리드 라인 위치 생성
   */
  generateGridLines(
    range: TimeRange,
    includeMinor: boolean = true,
  ): Array<{ x: number; date: Date; major: boolean }> {
    const lines: Array<{ x: number; date: Date; major: boolean }> = [];
    const start = floorToUnit(range.start, this._config.unit);

    // 주요 그리드 라인
    let current = start;
    while (current.getTime() <= range.end.getTime()) {
      lines.push({
        x: this.dateToX(current),
        date: new Date(current),
        major: true,
      });
      current = addUnit(current, this._config.unit, 1);
    }

    // 보조 그리드 라인 (더 세밀한 단위)
    if (includeMinor) {
      const minorUnit = this.getMinorUnit();
      if (minorUnit) {
        current = floorToUnit(range.start, minorUnit);
        while (current.getTime() <= range.end.getTime()) {
          // 주요 라인과 겹치지 않는 경우만 추가
          const isOnMajor = lines.some(l => l.date.getTime() === current.getTime());
          if (!isOnMajor) {
            lines.push({
              x: this.dateToX(current),
              date: new Date(current),
              major: false,
            });
          }
          current = addUnit(current, minorUnit, 1);
        }
      }
    }

    return lines.sort((a, b) => a.x - b.x);
  }

  /**
   * 보조 그리드 단위 가져오기
   */
  private getMinorUnit(): TimeScaleUnit | null {
    const currentIndex = SCALE_ORDER.indexOf(this._config.unit);
    return currentIndex > 0 ? SCALE_ORDER[currentIndex - 1] : null;
  }

  /**
   * 복제
   */
  clone(): TimeScale {
    const clone = new TimeScale(this._config.unit, this._origin, this._config.pixelsPerUnit);
    return clone;
  }
}
