/// <reference types="@vitest/browser-playwright" />
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import '../../src/components/DimensionTimeline.js';
import { ArrayDataSource } from '../../src/data/ArrayDataSource.js';

/**
 * **우리 요소는 소비자의 개발 콘솔에 Lit «갱신 뒤 갱신» 경고를 남기지 않는다 — 그리고 속성만으로 정해지는 값은 한 번만 그린다.**
 *
 * `updated()` 가 상태를 쓰면 갱신이 한 번 더 예약되고 Lit 개발 빌드는 요소 이름과 함께 경고를 낸다. 두 부류다:
 *   ⑴ 속성에서 도출되는 값(`d-time-axis` 의 눈금) — `willUpdate()` 에서 계산하면 낡은 눈금을 한 번 그리고 곧바로 다시 그리는 일이 없다.
 *   ⑵ 그린 뒤에야 알 수 있는 값(`d-dimension-timeline` 이 잰 캔버스 크기 · 비동기 로딩 표지) — 둘째 갱신이 본질이라 그 클래스가 경고를 끈다.
 * 브라우저 시험의 `console.warn` 은 러너 출력에 오지 않는다 — 스파이로 직접 단언한다.
 *
 * ⚠Lit 은 같은 경고를 페이지당 한 번만 낸다(`globalThis.litIssuedWarnings` 로 글을 중복 제거) — 시험마다 그 집합을 비운다.
 */
type Timeline = HTMLElement & {
  updateComplete: Promise<unknown>;
  dataSource: unknown; dimensions: unknown; activeDimension: string;
};
type Axis = HTMLElement & {
  updateComplete: Promise<unknown>;
  visibleRange: { start: Date; end: Date } | null;
  scale: string; pixelsPerUnit: number; scrollX: number; highlightToday: boolean;
  render: () => unknown;
};

beforeEach(() => { (globalThis as unknown as { litIssuedWarnings?: Set<string> }).litIssuedWarnings?.clear(); });
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
const litWarnings = (warn: { mock: { calls: unknown[][] } }) =>
  warn.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('scheduled an update')).map((m) => m.slice(0, 60));

describe('d-dimension-timeline — Lit 개발 모드 경고', () => {
  it('🔴빈 타임라인을 마운트해도 «갱신 뒤 갱신» 경고가 없다(안쪽 요소 포함)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('d-dimension-timeline') as unknown as Timeline;
    el.setAttribute('style', 'display:block; width:900px; height:420px;');
    document.body.appendChild(el);
    await el.updateComplete;
    await frame();
    await frame();
    expect(litWarnings(warn)).toEqual([]);
  });

  it('🔴데이터 소스와 활성 차원이 있는 일반 마운트(로딩 표지 · 레이아웃)도 경고가 없다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = document.createElement('d-dimension-timeline') as unknown as Timeline;
    el.setAttribute('style', 'display:block; width:900px; height:420px;');
    document.body.appendChild(el);
    el.dataSource = new ArrayDataSource([
      { id: 't1', start: new Date(Date.now() - 3600_000), end: new Date(Date.now() + 3600_000), dimensions: { project: 'A' }, label: 'one' },
    ]);
    el.dimensions = [{ key: 'project', label: 'Project' }];
    el.activeDimension = 'project';
    await el.updateComplete;
    await frame();
    await frame();
    expect(litWarnings(warn)).toEqual([]);
  });
});

describe('d-time-axis — 속성에서 도출되는 눈금', () => {
  const RANGE = { start: new Date('2026-03-01T00:00:00'), end: new Date('2026-03-08T00:00:00') };

  async function mountAxis(): Promise<Axis> {
    const el = document.createElement('d-time-axis') as unknown as Axis;
    el.setAttribute('style', 'display:block; width:900px; height:48px;');
    el.visibleRange = RANGE;
    el.scale = 'day';
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }
  const labelTexts = (el: Axis) => [...el.shadowRoot!.querySelectorAll('.secondary-labels .time-label')].map((n) => n.textContent!.trim());

  it('🔴마운트해도 경고가 없다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mountAxis();
    await frame();
    expect(litWarnings(warn)).toEqual([]);
  });

  it('🔴보이는 범위가 바뀌면 한 번만 그리고 눈금이 새 범위를 따른다(낡은 눈금을 한 번 그리지 않는다)', async () => {
    const el = await mountAxis();
    const before = labelTexts(el);
    expect(before.length).toBeGreaterThan(0);
    const render = vi.spyOn(el, 'render');
    el.visibleRange = { start: new Date('2026-04-01T00:00:00'), end: new Date('2026-04-08T00:00:00') };
    // `updateComplete` 는 그다음에 예약된 갱신을 기다리지 않는다(값이 false 일 뿐) — 한 프레임 더 기다려 총 횟수를 잰다.
    await el.updateComplete;
    await frame();
    await el.updateComplete;
    expect(render, '속성이 바뀐 갱신 하나로 끝난다').toHaveBeenCalledTimes(1);
    expect(labelTexts(el), '눈금이 새 범위로 바뀌었다').not.toEqual(before);
  });

  it('🔴처음에 꺼져 있던 오늘 하이라이트를 켜면 오늘이 나온다', async () => {
    const el = document.createElement('d-time-axis') as unknown as Axis;
    el.setAttribute('style', 'display:block; width:900px; height:48px;');
    el.highlightToday = false;
    el.visibleRange = { start: new Date(Date.now() - 3 * 86400_000), end: new Date(Date.now() + 3 * 86400_000) };
    el.scale = 'day';
    document.body.appendChild(el);
    await el.updateComplete;
    const today = () => el.shadowRoot!.querySelectorAll('.today-highlight').length;
    expect(today()).toBe(0);
    el.highlightToday = true;
    await el.updateComplete;
    await frame();
    expect(today(), '켜면 오늘 범위가 계산된다').toBe(1);
  });

  it('🔴axisLabel 을 바꾸면 눈금 문구가 바뀐다', async () => {
    const el = await mountAxis();
    const first = () => el.shadowRoot!.querySelector('.secondary-labels .time-label')!.textContent!.trim();
    const before = first();
    (el as unknown as { axisLabel: () => string }).axisLabel = () => 'LABEL-CHANGED';
    await el.updateComplete;
    await frame();
    expect(first(), '문구 함수가 바뀌면 눈금 문구가 따라온다').not.toBe(before);
  });

  it('오늘 하이라이트를 껐다 켜면 오늘 범위가 따라온다', async () => {
    const el = await mountAxis();
    const today = () => el.shadowRoot!.querySelectorAll('.today-highlight').length;
    el.visibleRange = { start: new Date(Date.now() - 3 * 86400_000), end: new Date(Date.now() + 3 * 86400_000) };
    await el.updateComplete;
    expect(today(), '범위 안에 오늘이 있다').toBe(1);
    el.highlightToday = false;
    await el.updateComplete;
    expect(today()).toBe(0);
    el.highlightToday = true;
    await el.updateComplete;
    expect(today(), '다시 켜면 오늘이 돌아온다').toBe(1);
  });
});
