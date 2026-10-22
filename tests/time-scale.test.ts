import { describe, expect, test } from 'vitest';
import { TimeScale } from '../src/core/TimeScale.js';
import { ViewportManager } from '../src/core/ViewportManager.js';
import { addUnit, ceilToUnit, floorToUnit, generateTimeMarkers, snapToUnit } from '../src/utilities/DateUtils.js';

const local = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi);

describe('DateUtils', () => {
  test('floorToUnit — weeks start on Monday, also from a Sunday', () => {
    // 2026-10-25 은 일요일, 2026-10-19 는 월요일
    expect(floorToUnit(local(2026, 10, 25, 15), 'week')).toEqual(local(2026, 10, 19));
    expect(floorToUnit(local(2026, 10, 19, 0), 'week')).toEqual(local(2026, 10, 19));
    expect(floorToUnit(local(2026, 10, 23, 14, 37), '30min')).toEqual(local(2026, 10, 23, 14, 30));
    expect(floorToUnit(local(2026, 10, 23, 14, 37), '6hour')).toEqual(local(2026, 10, 23, 12));
    expect(floorToUnit(local(2026, 10, 23, 14, 37), 'month')).toEqual(local(2026, 10, 1));
  });

  test('ceilToUnit keeps a boundary and moves anything else up', () => {
    expect(ceilToUnit(local(2026, 10, 1), 'month')).toEqual(local(2026, 10, 1));
    expect(ceilToUnit(local(2026, 10, 1, 0, 1), 'month')).toEqual(local(2026, 11, 1));
    expect(ceilToUnit(local(2026, 12, 31, 23), 'day')).toEqual(local(2027, 1, 1));
  });

  test('snapToUnit goes to the nearer boundary, the earlier one on a tie', () => {
    expect(snapToUnit(local(2026, 10, 23, 14, 29), 'hour')).toEqual(local(2026, 10, 23, 14));
    expect(snapToUnit(local(2026, 10, 23, 14, 31), 'hour')).toEqual(local(2026, 10, 23, 15));
    expect(snapToUnit(local(2026, 10, 23, 14, 30), 'hour')).toEqual(local(2026, 10, 23, 14));
  });

  test('generateTimeMarkers — month markers land on the 1st across a year end', () => {
    const markers = generateTimeMarkers({ start: local(2026, 11, 15), end: local(2027, 2, 2) }, 'month');
    expect(markers).toEqual([local(2026, 11, 1), local(2026, 12, 1), local(2027, 1, 1), local(2027, 2, 1)]);
    expect(addUnit(local(2026, 12, 1), 'month', 1)).toEqual(local(2027, 1, 1));
  });
});

describe('TimeScale', () => {
  test('dateToX and xToDate are inverses', () => {
    const scale = new TimeScale('hour', local(2026, 10, 23), 80);
    const date = local(2026, 10, 23, 5, 30);
    expect(scale.dateToX(date)).toBe(5.5 * 80);
    expect(scale.xToDate(scale.dateToX(date))).toEqual(date);
  });

  test('setZoom keeps the date under the focus point where it was, and clamps to the unit limits', () => {
    const scale = new TimeScale('day', local(2026, 10, 1), 120);
    const focusX = 300;
    const before = scale.xToDate(focusX);
    scale.setZoom(2, focusX);
    expect(scale.pixelsPerUnit).toBe(240);
    expect(scale.dateToX(before)).toBeCloseTo(focusX, 6);
    scale.setZoom(100);
    expect(scale.pixelsPerUnit).toBe(400); // day 의 상한
    scale.setZoom(0.01);
    expect(scale.pixelsPerUnit).toBe(40); // day 의 하한
  });

  test('zoomIn past the unit limit switches to the next finer unit; at the finest it stops', () => {
    const scale = new TimeScale('hour', local(2026, 10, 1), 300);
    expect(scale.zoomIn()).toBe(true);
    expect(scale.unit).toBe('30min');
    const finest = new TimeScale('10min', local(2026, 10, 1), 200);
    expect(finest.zoomIn()).toBe(false);
  });
});

describe('ViewportManager — zoom keeps the point under the cursor', () => {
  test('across a unit switch the focused date stays at the focus x', () => {
    const vm = new ViewportManager({ initialScale: 'hour', initialRange: { start: local(2026, 10, 23), end: local(2026, 10, 24) } });
    vm.setSize(1000, 400);
    const focusX = 420;
    const before = vm.xToDate(focusX).getTime();
    // 시간 단위 상한까지 줌인한 뒤 한 번 더 — 30분 단위로 바뀐다
    for (let i = 0; i < 20; i++) vm.zoomIn(focusX);
    const after = vm.xToDate(focusX).getTime();
    expect(Math.abs(after - before)).toBeLessThan(60_000);
  });
});
