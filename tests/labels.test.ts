import { describe, expect, test } from 'vitest';
import {
  DEFAULT_TIMELINE_LABELS,
  defaultAxisLabel,
  registerTimelineLabels,
  resolveLabels,
} from '../src/utilities/Labels.js';

// 2026-10-23 (금) 14:05 — 로컬 시각으로 만든다(눈금 문구는 로컬 시각을 읽는다).
const at = new Date(2026, 9, 23, 14, 5);

describe('resolveLabels', () => {
  test('without a locale the defaults are English', () => {
    const labels = resolveLabels();
    expect(labels.select).toBe('Select');
    expect(labels.zoomIn).toBe('Zoom in');
    expect(labels.scales.day).toBe('Day');
    expect(labels.axisLabel).toBe(defaultAxisLabel);
  });

  test('the built-in Korean text is chosen by language, and a region tag falls back to it', () => {
    for (const locale of ['ko', 'ko-KR', 'KO']) {
      const labels = resolveLabels(undefined, locale);
      expect(labels.select).toBe('선택');
      expect(labels.scales['12hour']).toBe('12시간');
    }
  });

  test('keys the locale does not give keep the English default', () => {
    expect(resolveLabels(undefined, 'ko').dimension).toBe(DEFAULT_TIMELINE_LABELS.dimension);
  });

  test('labels from the app win over the locale, and scales merge per unit', () => {
    const labels = resolveLabels({ zoomIn: 'Plus', scales: { day: 'D' } as never }, 'ko');
    expect(labels.zoomIn).toBe('Plus');
    expect(labels.zoomOut).toBe('축소');
    expect(labels.scales.day).toBe('D');
    expect(labels.scales.week).toBe('주');
  });

  test('NEGATIVE: an unregistered locale gets the English defaults', () => {
    expect(resolveLabels(undefined, 'xx').select).toBe('Select');
    expect(resolveLabels(undefined, '').select).toBe('Select');
  });

  test('registerTimelineLabels adds a language, case-insensitively', () => {
    registerTimelineLabels('ZZ-test', { select: 'Pick' });
    expect(resolveLabels(undefined, 'zz-TEST').select).toBe('Pick');
    expect(resolveLabels(undefined, 'zz-test').zoomIn).toBe('Zoom in');
  });

  test('NEGATIVE: resolving does not change the shared defaults', () => {
    resolveLabels({ select: 'Changed', scales: { day: 'X' } as never }, 'ko');
    expect(DEFAULT_TIMELINE_LABELS.select).toBe('Select');
    expect(DEFAULT_TIMELINE_LABELS.scales.day).toBe('Day');
  });
});

describe('axis labels', () => {
  test('English', () => {
    const en = resolveLabels().axisLabel;
    expect(en(at, 'day', true)).toBe('Oct 23');
    expect(en(at, 'month', true)).toBe('Oct 2026');
    expect(en(at, 'hour', true)).toBe('10/23 14:00');
    expect(en(at, '12hour', false)).toBe('2 PM');
    expect(en(at, 'day', false)).toBe('23 (Fri)');
    expect(en(at, '10min', false)).toBe('14:05');
  });

  test('Korean', () => {
    const ko = resolveLabels(undefined, 'ko').axisLabel;
    expect(ko(at, 'day', true)).toBe('10월 23일');
    expect(ko(at, 'month', true)).toBe('2026년 10월');
    expect(ko(at, 'hour', true)).toBe('10/23 14시');
    expect(ko(at, '12hour', false)).toBe('오후 2시');
    expect(ko(at, 'day', false)).toBe('23 (금)');
    expect(ko(at, 'week', false)).toBe('10/23주');
    // 한국어 표가 주지 않는 단위는 영어 눈금과 같다(숫자뿐)
    expect(ko(at, '10min', false)).toBe('14:05');
  });

  test('midnight and noon on the 12-hour scale', () => {
    const en = resolveLabels().axisLabel;
    expect(en(new Date(2026, 0, 1, 0), '12hour', false)).toBe('12 AM');
    expect(en(new Date(2026, 0, 1, 12), '12hour', false)).toBe('12 PM');
  });
});
