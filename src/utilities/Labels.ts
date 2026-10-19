/**
 * 내장 문구 기본값과 병합
 */

import type { TimelineLabels, TimeScaleUnit } from '../types/index.js';
import { formatDate } from './DateUtils.js';

const pad = (n: number) => n.toString().padStart(2, '0');
const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

/** 기본 시간축 눈금 문구(한국어) */
export function defaultAxisLabel(date: Date, unit: TimeScaleUnit, primary: boolean): string {
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
    case '10min':
    case '30min':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case 'hour':
      return `${date.getHours()}:00`;
    case '6hour':
      return `${pad(date.getHours())}:00`;
    case '12hour':
      return `${date.getHours() < 12 ? '오전' : '오후'} ${date.getHours() % 12 || 12}시`;
    case 'day':
      return `${date.getDate()} (${dayNames[date.getDay()]})`;
    case 'week':
      return `${date.getMonth() + 1}/${date.getDate()}주`;
    default:
      return formatDate(date, unit);
  }
}

/** 내장 문구 기본값(한국어) */
export const DEFAULT_TIMELINE_LABELS: TimelineLabels = {
  dimension: 'Dimension',
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
  axisLabel: defaultAxisLabel,
};

/** 앱이 넘긴 일부 문구를 기본값 위에 얹는다 — `scales` 는 단위별로 병합한다. */
export function resolveLabels(labels?: Partial<TimelineLabels>): TimelineLabels {
  return {
    ...DEFAULT_TIMELINE_LABELS,
    ...labels,
    scales: { ...DEFAULT_TIMELINE_LABELS.scales, ...labels?.scales },
  };
}
