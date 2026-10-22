/**
 * 내장 문구 — 영어 기본값 + 로캘별 등록부
 *
 * 기본값은 영어다(이 리포의 로캘 표준). 한국어 문구는 아래 `registerTimelineLabels('ko', …)` 로 함께
 * 실린다. 앱은 `locale` 속성(없으면 가장 가까운 `lang`)으로 고르고, `labels` 로 키 단위로 덮는다.
 */

import type { TimelineLabels, TimeScaleUnit } from '../types/index.js';
import { formatDate } from './DateUtils.js';

const pad = (n: number) => n.toString().padStart(2, '0');

const enMonthDay = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const enMonthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' });
const enWeekday = new Intl.DateTimeFormat('en', { weekday: 'short' });

/** 기본 시간축 눈금 문구(영어) */
export function defaultAxisLabel(date: Date, unit: TimeScaleUnit, primary: boolean): string {
  if (primary) {
    switch (unit) {
      case 'hour':
        return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:00`;
      case 'day':
        return enMonthDay.format(date);
      case 'week':
      case 'month':
        return enMonthYear.format(date);
      default:
        return formatDate(date, unit);
    }
  }
  switch (unit) {
    case '10min':
    case '30min':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case 'hour':
      return `${date.getHours()}:00`;
    case '6hour':
      return `${pad(date.getHours())}:00`;
    case '12hour':
      return `${date.getHours() % 12 || 12} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
    case 'day':
      return `${date.getDate()} (${enWeekday.format(date)})`;
    case 'week':
      return `${date.getMonth() + 1}/${date.getDate()}`;
    default:
      return formatDate(date, unit);
  }
}

/** 내장 문구 기본값(영어) */
export const DEFAULT_TIMELINE_LABELS: TimelineLabels = {
  dimension: 'Dimension',
  select: 'Select',
  search: 'Search',
  searchPlaceholder: 'Search...',
  empty: 'No values',
  noResults: 'No results',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  scales: {
    '10min': '10 min',
    '30min': '30 min',
    'hour': 'Hour',
    '6hour': '6 hours',
    '12hour': '12 hours',
    'day': 'Day',
    'week': 'Week',
    'month': 'Month',
  },
  axisLabel: defaultAxisLabel,
};

const registry = new Map<string, Partial<TimelineLabels>>();

/**
 * 로캘의 내장 문구를 등록한다 — 키 단위로 영어 기본값 위에 얹힌다(`scales` 는 단위별로).
 * 같은 로캘을 다시 등록하면 앞의 것을 대신한다. 로캘 태그는 대소문자를 가리지 않는다.
 */
export function registerTimelineLabels(locale: string, labels: Partial<TimelineLabels>): void {
  registry.set(locale.toLowerCase(), labels);
}

/** 로캘 태그에 맞는 등록 문구 — 정확한 태그(`ko-KR`) → 언어(`ko`) 순. 없으면 `undefined`. */
function registered(locale?: string): Partial<TimelineLabels> | undefined {
  if (!locale) return undefined;
  const tag = locale.toLowerCase();
  return registry.get(tag) ?? registry.get(tag.split('-')[0]);
}

const merge = (base: TimelineLabels, over?: Partial<TimelineLabels>): TimelineLabels => ({
  ...base,
  ...over,
  scales: { ...base.scales, ...over?.scales },
});

/**
 * 영어 기본값 → `locale` 의 등록 문구 → 앱이 넘긴 일부 문구 순으로 얹는다 — `scales` 는 단위별로 병합한다.
 */
export function resolveLabels(labels?: Partial<TimelineLabels>, locale?: string): TimelineLabels {
  return merge(merge(DEFAULT_TIMELINE_LABELS, registered(locale)), labels);
}

// ── 한국어 ────────────────────────────────────────────────────────────────
// 표 전체를 등록 호출 안에 둔다 — 로캘 표준 검사가 `register…('ko', …)` 의 인자 범위를 번역으로 본다.

registerTimelineLabels('ko', {
  select: '선택',
  search: '검색',
  searchPlaceholder: '검색...',
  empty: '값이 없습니다',
  noResults: '검색 결과가 없습니다',
  zoomIn: '확대',
  zoomOut: '축소',
  scales: {
    '10min': '10분',
    '30min': '30분',
    'hour': '시간',
    '6hour': '6시간',
    '12hour': '12시간',
    'day': '일',
    'week': '주',
    'month': '월',
  },
  axisLabel(date: Date, unit: TimeScaleUnit, primary: boolean): string {
    if (primary) {
      switch (unit) {
        case 'hour':
          return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}시`;
        case 'day':
          return `${date.getMonth() + 1}월 ${date.getDate()}일`;
        case 'week':
        case 'month':
          return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
        default:
          return formatDate(date, unit);
      }
    }
    switch (unit) {
      case '12hour':
        return `${date.getHours() < 12 ? '오전' : '오후'} ${date.getHours() % 12 || 12}시`;
      case 'day':
        return `${date.getDate()} (${'일월화수목금토'[date.getDay()]})`;
      case 'week':
        return `${date.getMonth() + 1}/${date.getDate()}주`;
      default:
        return defaultAxisLabel(date, unit, primary);
    }
  },
});
