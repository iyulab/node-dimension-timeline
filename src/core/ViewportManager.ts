/**
 * 뷰포트 관리
 * 줌, 팬, 스크롤 상태 관리
 */

import type { TimeRange, ViewportState, TimeScaleUnit } from '../types/index.js';
import { TimeScale } from './TimeScale.js';

/**
 * 뷰포트 변경 이벤트
 */
export interface ViewportChangeEvent {
  type: 'zoom' | 'pan' | 'scroll' | 'resize' | 'scale-change';
  viewport: ViewportState;
  scale: TimeScaleUnit;
}

/**
 * 뷰포트 변경 콜백
 */
export type ViewportChangeCallback = (event: ViewportChangeEvent) => void;

/**
 * ViewportManager 설정
 */
export interface ViewportManagerConfig {
  /** 초기 시간 범위 */
  initialRange?: TimeRange;
  /** 초기 스케일 단위 */
  initialScale?: TimeScaleUnit;
  /** 줌 활성화 */
  zoomable?: boolean;
  /** 팬 활성화 */
  pannable?: boolean;
  /** 휠 줌 감도 (기본: 0.1) */
  wheelZoomSensitivity?: number;
  /** 부드러운 줌/팬 애니메이션 */
  smoothAnimation?: boolean;
}

/**
 * ViewportManager 클래스
 * 타임라인의 뷰포트 상태를 관리합니다.
 */
export class ViewportManager {
  private scale: TimeScale;
  private listeners: Set<ViewportChangeCallback> = new Set();

  // 뷰포트 상태
  private _scrollX: number = 0;
  private _scrollY: number = 0;
  private _width: number = 0;
  private _height: number = 0;

  // Y축 줌 (세로 줌)
  private _zoomY: number = 1.0;
  private static readonly MIN_ZOOM_Y = 0.5;
  private static readonly MAX_ZOOM_Y = 2.0;

  // 설정
  private config: Required<ViewportManagerConfig>;

  // 팬 상태
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartScrollX: number = 0;
  private panStartScrollY: number = 0;

  constructor(config: ViewportManagerConfig = {}) {
    this.config = {
      initialRange: config.initialRange ?? {
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      initialScale: config.initialScale ?? 'day',
      zoomable: config.zoomable ?? true,
      pannable: config.pannable ?? true,
      wheelZoomSensitivity: config.wheelZoomSensitivity ?? 0.1,
      smoothAnimation: config.smoothAnimation ?? true,
    };

    this.scale = new TimeScale(this.config.initialScale, this.config.initialRange.start);
  }

  // =========================================================================
  // Getters
  // =========================================================================

  /** 현재 뷰포트 상태 */
  get state(): ViewportState {
    return {
      visibleRange: this.getVisibleRange(),
      scrollX: this._scrollX,
      scrollY: this._scrollY,
      zoom: this.scale.getZoom(),
    };
  }

  /** 현재 스케일 단위 */
  get scaleUnit(): TimeScaleUnit {
    return this.scale.unit;
  }

  /** TimeScale 인스턴스 */
  get timeScale(): TimeScale {
    return this.scale;
  }

  /** 뷰포트 너비 */
  get width(): number {
    return this._width;
  }

  /** 뷰포트 높이 */
  get height(): number {
    return this._height;
  }

  /** 스크롤 X */
  get scrollX(): number {
    return this._scrollX;
  }

  /** 스크롤 Y */
  get scrollY(): number {
    return this._scrollY;
  }

  /** Y축 줌 레벨 */
  get zoomY(): number {
    return this._zoomY;
  }

  // =========================================================================
  // 초기화 및 크기 조절
  // =========================================================================

  /**
   * 뷰포트 크기 설정
   */
  setSize(width: number, height: number): void {
    if (this._width === width && this._height === height) return;

    this._width = width;
    this._height = height;
    this.emit('resize');
  }

  // =========================================================================
  // 시간-픽셀 변환
  // =========================================================================

  /**
   * 날짜를 X 좌표로 변환
   */
  dateToX(date: Date): number {
    return this.scale.dateToX(date) - this._scrollX;
  }

  /**
   * X 좌표를 날짜로 변환
   */
  xToDate(x: number): Date {
    return this.scale.xToDate(x + this._scrollX);
  }

  /**
   * 보이는 시간 범위 가져오기
   */
  getVisibleRange(): TimeRange {
    return this.scale.getVisibleRange(this._width, this._scrollX);
  }

  // =========================================================================
  // 스크롤
  // =========================================================================

  /**
   * 스크롤 위치 설정
   */
  setScroll(x: number, y: number): void {
    const changed = this._scrollX !== x || this._scrollY !== y;
    this._scrollX = x;
    this._scrollY = y;
    if (changed) {
      this.emit('scroll');
    }
  }

  /**
   * 스크롤 이동
   */
  scrollBy(deltaX: number, deltaY: number): void {
    this.setScroll(this._scrollX + deltaX, this._scrollY + deltaY);
  }

  /**
   * 특정 날짜로 스크롤
   */
  scrollToDate(date: Date, position: 'start' | 'center' | 'end' = 'center'): void {
    let offsetX = 0;

    switch (position) {
      case 'start':
        offsetX = 0;
        break;
      case 'center':
        offsetX = this._width / 2;
        break;
      case 'end':
        offsetX = this._width;
        break;
    }

    const targetX = this.scale.dateToX(date) - offsetX;
    this._scrollX = targetX;
    this.emit('scroll');
  }

  // =========================================================================
  // 줌
  // =========================================================================

  /**
   * 줌 레벨 설정
   */
  setZoom(zoom: number, focusX?: number): void {
    if (!this.config.zoomable) return;

    const absoluteFocusX = focusX !== undefined ? focusX + this._scrollX : undefined;
    this.scale.setZoom(zoom, absoluteFocusX);

    // 포커스 지점 유지를 위해 스크롤 조정
    if (focusX !== undefined) {
      const newAbsoluteX = this.scale.dateToX(this.scale.xToDate(absoluteFocusX!));
      this._scrollX = newAbsoluteX - focusX;
    }

    this.emit('zoom');
  }

  /**
   * 줌 인
   */
  zoomIn(focusX?: number): boolean {
    if (!this.config.zoomable) return false;

    const focusDate = focusX !== undefined ? this.xToDate(focusX) : undefined;
    const result = this.scale.zoomIn(focusX !== undefined ? focusX + this._scrollX : undefined);

    if (result && focusX !== undefined && focusDate) {
      const newAbsoluteX = this.scale.dateToX(focusDate);
      this._scrollX = newAbsoluteX - focusX;
    }

    this.emit('zoom');
    return result;
  }

  /**
   * 줌 아웃
   */
  zoomOut(focusX?: number): boolean {
    if (!this.config.zoomable) return false;

    const focusDate = focusX !== undefined ? this.xToDate(focusX) : undefined;
    const result = this.scale.zoomOut(focusX !== undefined ? focusX + this._scrollX : undefined);

    if (result && focusX !== undefined && focusDate) {
      const newAbsoluteX = this.scale.dateToX(focusDate);
      this._scrollX = newAbsoluteX - focusX;
    }

    this.emit('zoom');
    return result;
  }

  /**
   * 휠 줌 처리 (가로+세로 동시 줌)
   */
  handleWheelZoom(deltaY: number, focusX: number, focusY?: number): void {
    if (!this.config.zoomable) return;

    // Y축 줌 처리
    const zoomFactor = deltaY < 0 ? 1.2 : 1 / 1.2;
    const oldZoomY = this._zoomY;
    this._zoomY = Math.max(
      ViewportManager.MIN_ZOOM_Y,
      Math.min(ViewportManager.MAX_ZOOM_Y, this._zoomY * zoomFactor)
    );

    // Y 포커스 지점 유지를 위해 스크롤 조정
    if (focusY !== undefined && oldZoomY !== this._zoomY) {
      const adjustedY = focusY + this._scrollY;
      const newScrollY = adjustedY * (this._zoomY / oldZoomY) - focusY;
      this._scrollY = Math.max(0, newScrollY);
    }

    // X축 줌 처리
    if (deltaY < 0) {
      this.zoomIn(focusX);
    } else {
      this.zoomOut(focusX);
    }
  }

  /**
   * Y축 줌 레벨 설정
   */
  setZoomY(zoomY: number): void {
    this._zoomY = Math.max(
      ViewportManager.MIN_ZOOM_Y,
      Math.min(ViewportManager.MAX_ZOOM_Y, zoomY)
    );
    this.emit('zoom');
  }

  // =========================================================================
  // 팬 (드래그 스크롤)
  // =========================================================================

  /**
   * 팬 시작
   */
  startPan(x: number, y: number): void {
    if (!this.config.pannable) return;

    this.isPanning = true;
    this.panStartX = x;
    this.panStartY = y;
    this.panStartScrollX = this._scrollX;
    this.panStartScrollY = this._scrollY;
  }

  /**
   * 팬 이동
   */
  updatePan(x: number, y: number): void {
    if (!this.isPanning) return;

    const deltaX = this.panStartX - x;
    const deltaY = this.panStartY - y;

    this._scrollX = this.panStartScrollX + deltaX;
    this._scrollY = this.panStartScrollY + deltaY;

    this.emit('pan');
  }

  /**
   * 팬 종료
   */
  endPan(): void {
    this.isPanning = false;
  }

  /**
   * 팬 중인지 확인
   */
  get panning(): boolean {
    return this.isPanning;
  }

  // =========================================================================
  // 스케일 변경
  // =========================================================================

  /**
   * 스케일 단위 설정
   */
  setScale(unit: TimeScaleUnit): void {
    if (unit === this.scale.unit) return;

    const centerDate = this.xToDate(this._width / 2);
    this.scale.setUnit(unit, true);
    this.scrollToDate(centerDate, 'center');

    this.emit('scale-change');
  }

  // =========================================================================
  // 그리드 라인
  // =========================================================================

  /**
   * 현재 보이는 영역의 그리드 라인 가져오기
   */
  getGridLines(includeMinor: boolean = true): Array<{ x: number; date: Date; major: boolean }> {
    const range = this.getVisibleRange();
    const lines = this.scale.generateGridLines(range, includeMinor);

    // 뷰포트 좌표로 변환
    return lines.map(line => ({
      ...line,
      x: line.x - this._scrollX,
    }));
  }

  // =========================================================================
  // 이벤트
  // =========================================================================

  /**
   * 변경 리스너 등록
   */
  subscribe(callback: ViewportChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 이벤트 발생
   */
  private emit(type: ViewportChangeEvent['type']): void {
    const event: ViewportChangeEvent = {
      type,
      viewport: this.state,
      scale: this.scale.unit,
    };

    this.listeners.forEach(callback => callback(event));
  }

  // =========================================================================
  // 유틸리티
  // =========================================================================

  /**
   * 시간 범위가 보이는 영역에 있는지 확인
   */
  isRangeVisible(range: TimeRange): boolean {
    const visible = this.getVisibleRange();
    return range.start.getTime() < visible.end.getTime() &&
           range.end.getTime() > visible.start.getTime();
  }

  /**
   * 현재 상태 복제
   */
  clone(): ViewportManager {
    const clone = new ViewportManager(this.config);
    clone._scrollX = this._scrollX;
    clone._scrollY = this._scrollY;
    clone._width = this._width;
    clone._height = this._height;
    return clone;
  }
}
