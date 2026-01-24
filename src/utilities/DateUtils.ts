/**
 * 날짜/시간 유틸리티 함수
 */

import type { TimeScaleUnit, TimeRange } from '../types/index.js';

/**
 * 밀리초 상수
 */
export const MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000, // 평균 30일
} as const;

/**
 * 스케일 단위를 밀리초로 변환
 */
export function unitToMs(unit: TimeScaleUnit): number {
  switch (unit) {
    case '10min': return 10 * MS.MINUTE;
    case '30min': return 30 * MS.MINUTE;
    case 'hour': return MS.HOUR;
    case '6hour': return 6 * MS.HOUR;
    case '12hour': return 12 * MS.HOUR;
    case 'day': return MS.DAY;
    case 'week': return MS.WEEK;
    case 'month': return MS.MONTH;
  }
}

/**
 * 날짜를 주어진 스케일 단위의 시작으로 정렬
 */
export function floorToUnit(date: Date, unit: TimeScaleUnit): Date {
  const d = new Date(date);

  switch (unit) {
    case '10min':
      d.setMinutes(Math.floor(d.getMinutes() / 10) * 10, 0, 0);
      break;
    case '30min':
      d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0);
      break;
    case 'hour':
      d.setMinutes(0, 0, 0);
      break;
    case '6hour':
      d.setMinutes(0, 0, 0);
      d.setHours(Math.floor(d.getHours() / 6) * 6);
      break;
    case '12hour':
      d.setMinutes(0, 0, 0);
      d.setHours(Math.floor(d.getHours() / 12) * 12);
      break;
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'week':
      d.setHours(0, 0, 0, 0);
      // 주 시작을 월요일로 설정
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      break;
    case 'month':
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      break;
  }

  return d;
}

/**
 * 날짜를 주어진 스케일 단위의 끝으로 정렬
 */
export function ceilToUnit(date: Date, unit: TimeScaleUnit): Date {
  const floored = floorToUnit(date, unit);
  if (floored.getTime() === date.getTime()) {
    return date;
  }
  return addUnit(floored, unit, 1);
}

/**
 * 날짜에 단위 추가
 */
export function addUnit(date: Date, unit: TimeScaleUnit, count: number): Date {
  const d = new Date(date);

  switch (unit) {
    case '10min':
      d.setMinutes(d.getMinutes() + count * 10);
      break;
    case '30min':
      d.setMinutes(d.getMinutes() + count * 30);
      break;
    case 'hour':
      d.setHours(d.getHours() + count);
      break;
    case '6hour':
      d.setHours(d.getHours() + count * 6);
      break;
    case '12hour':
      d.setHours(d.getHours() + count * 12);
      break;
    case 'day':
      d.setDate(d.getDate() + count);
      break;
    case 'week':
      d.setDate(d.getDate() + count * 7);
      break;
    case 'month':
      d.setMonth(d.getMonth() + count);
      break;
  }

  return d;
}

/**
 * 두 날짜 사이의 단위 수 계산
 */
export function diffInUnits(start: Date, end: Date, unit: TimeScaleUnit): number {
  const ms = end.getTime() - start.getTime();
  return ms / unitToMs(unit);
}

/**
 * 날짜를 포맷팅
 */
export function formatDate(date: Date, unit: TimeScaleUnit): string {
  const pad = (n: number) => n.toString().padStart(2, '0');

  switch (unit) {
    case '10min':
    case '30min':
    case 'hour':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case '6hour':
    case '12hour':
      return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:00`;
    case 'day':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    case 'week':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    case 'month':
      return `${date.getFullYear()}/${date.getMonth() + 1}`;
  }
}

/**
 * 시간 범위 내 주요 날짜 마커 생성
 */
export function generateTimeMarkers(
  range: TimeRange,
  unit: TimeScaleUnit,
): Date[] {
  const markers: Date[] = [];
  let current = floorToUnit(range.start, unit);

  while (current.getTime() <= range.end.getTime()) {
    markers.push(current);
    current = addUnit(current, unit, 1);
  }

  return markers;
}

/**
 * 날짜를 가장 가까운 단위로 스냅
 */
export function snapToUnit(date: Date, unit: TimeScaleUnit): Date {
  const floored = floorToUnit(date, unit);
  const ceiled = ceilToUnit(date, unit);

  const floorDiff = date.getTime() - floored.getTime();
  const ceilDiff = ceiled.getTime() - date.getTime();

  return floorDiff <= ceilDiff ? floored : ceiled;
}

/**
 * 두 시간 범위가 겹치는지 확인
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

/**
 * 시간 범위의 교집합 계산
 */
export function rangeIntersection(a: TimeRange, b: TimeRange): TimeRange | null {
  if (!rangesOverlap(a, b)) return null;

  return {
    start: new Date(Math.max(a.start.getTime(), b.start.getTime())),
    end: new Date(Math.min(a.end.getTime(), b.end.getTime())),
  };
}

/**
 * 시간 범위 확장
 */
export function expandRange(range: TimeRange, factor: number): TimeRange {
  const duration = range.end.getTime() - range.start.getTime();
  const expansion = duration * (factor - 1) / 2;

  return {
    start: new Date(range.start.getTime() - expansion),
    end: new Date(range.end.getTime() + expansion),
  };
}

/**
 * 오늘 날짜 (시간 제외)
 */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 현재 시간
 */
export function now(): Date {
  return new Date();
}
