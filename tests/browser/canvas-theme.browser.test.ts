/// <reference types="@vitest/browser-playwright" />
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/DimensionTimeline.js';
import { ArrayDataSource } from '../../src/data/ArrayDataSource.js';
import type { TaskStatus } from '../../src/types/index.js';

/**
 * 캔버스에 칠하는 색은 앱 테마를 따른다 — 손잡이(`--timeline-*`) → `@iyulab/components` 토큰 → 지금 색 순서로 읽는다.
 * 캔버스는 CSS 를 상속하지 않아 «보이는 색» 은 계산된 스타일이 아니라 **칠해진 픽셀**로 잰다.
 */
type Timeline = HTMLElement & {
  updateComplete: Promise<unknown>;
  dataSource: unknown;
  dimensions: unknown;
  activeDimension: string;
  scrollToTask(id: string): void;
  refreshTheme(): void;
};

const root = document.documentElement;
const ROOT_VARS = ['--u-canvas-bg-color', '--u-success-color', '--u-danger-color', '--u-border-color-weak'];

afterEach(() => {
  document.body.replaceChildren();
  for (const name of ROOT_VARS) root.style.removeProperty(name);
});

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
const HOUR = 3600_000;

async function mount(style = '', task: { status?: TaskStatus; color?: string } = { status: 'completed' }): Promise<Timeline> {
  const el = document.createElement('d-dimension-timeline') as unknown as Timeline;
  el.setAttribute('style', `display:block; width:380px; height:300px; ${style}`);
  document.body.appendChild(el);
  const now = Date.now();
  el.dataSource = new ArrayDataSource([
    { id: 't1', start: new Date(now), end: new Date(now + 2 * HOUR), dimensions: { worker: 'A' }, label: '', ...task },
  ]);
  el.dimensions = [{ key: 'worker', label: 'Worker' }];
  el.activeDimension = 'worker';
  el.setAttribute('scale', 'hour');
  await el.updateComplete;
  await frame();
  el.scrollToTask('t1');
  await frame();
  await frame();
  return el;
}

function canvasOf(el: Timeline) {
  const host = el.shadowRoot!.querySelector('d-timeline-canvas') as HTMLElement & {
    scrollX: number;
    scrollY: number;
    getTaskById(id: string): { layoutedTask: { x: number; y: number; width: number; height: number }; absoluteY: number } | undefined;
  };
  return { host, inner: host.shadowRoot!.querySelector('canvas') as HTMLCanvasElement };
}

/** 캔버스의 CSS 좌표 한 점의 색 */
function pixel(inner: HTMLCanvasElement, x: number, y: number): [number, number, number] {
  const dpr = inner.width / inner.getBoundingClientRect().width;
  const d = inner.getContext('2d')!.getImageData(Math.round(x * dpr), Math.round(y * dpr), 1, 1).data;
  return [d[0], d[1], d[2]];
}

/** 빈 곳(맨 아래 오른쪽) — 바탕만 칠해진 자리 */
const background = (el: Timeline) => {
  const { inner } = canvasOf(el);
  const r = inner.getBoundingClientRect();
  return pixel(inner, r.width - 7, r.height - 7);
};

/** 막대의 왼쪽 아래 안쪽 — 글자 · 진행 막대가 닿지 않는 자리 */
const bar = (el: Timeline) => {
  const { host, inner } = canvasOf(el);
  const cached = host.getTaskById('t1')!;
  const lt = cached.layoutedTask;
  return pixel(inner, lt.x + 3 - (host.scrollX ?? 0), cached.absoluteY + lt.height - 3 - (host.scrollY ?? 0));
};

const near = (actual: number[], expected: number[], tolerance = 8) => {
  for (let i = 0; i < 3; i++) expect(Math.abs(actual[i] - expected[i]), `${actual} vs ${expected}`).toBeLessThanOrEqual(tolerance);
};

describe('캔버스 색 — 손잡이 → 토큰 → 지금 색', () => {
  it('NEGATIVE: 아무것도 걸지 않으면 지금 색이다(흰 바탕 · 완료 막대 초록)', async () => {
    const el = await mount();
    near(background(el), [255, 255, 255]);
    near(bar(el), [16, 185, 129]);
  });

  it('🔴손잡이가 바탕과 상태 막대를 바꾼다', async () => {
    const el = await mount('--timeline-canvas-bg: rgb(10, 20, 30); --timeline-task-completed-bg: rgb(1, 2, 3);');
    near(background(el), [10, 20, 30]);
    near(bar(el), [1, 2, 3]);
  });

  it('🔴손잡이가 없으면 @iyulab/components 토큰을 따른다', async () => {
    root.style.setProperty('--u-canvas-bg-color', 'rgb(40, 41, 42)');
    root.style.setProperty('--u-success-color', 'rgb(7, 8, 9)');
    const el = await mount();
    near(background(el), [40, 41, 42]);
    near(bar(el), [7, 8, 9]);
  });

  it('손잡이가 토큰보다 앞선다', async () => {
    root.style.setProperty('--u-canvas-bg-color', 'rgb(40, 41, 42)');
    const el = await mount('--timeline-canvas-bg: rgb(200, 100, 50);');
    near(background(el), [200, 100, 50]);
  });

  it('🔴테마 토큰이 바뀌면(문서 루트의 style) 다시 풀어 다시 그린다', async () => {
    const el = await mount();
    near(background(el), [255, 255, 255]);
    root.style.setProperty('--u-canvas-bg-color', 'rgb(20, 20, 24)');
    await frame();
    await frame();
    near(background(el), [20, 20, 24]);
  });

  it('조상에서 바꾼 변수는 refreshTheme() 이 알린다', async () => {
    const holder = document.createElement('div');
    document.body.appendChild(holder);
    const el = await mount();
    holder.appendChild(el);
    await frame();
    holder.style.setProperty('--timeline-canvas-bg', 'rgb(90, 80, 70)');
    el.refreshTheme();
    await frame();
    await frame();
    near(background(el), [90, 80, 70]);
  });

  it('task.color 에 색 표현을 쓸 수 있다', async () => {
    root.style.setProperty('--u-danger-color', 'rgb(180, 20, 30)');
    const el = await mount('', { color: 'var(--u-danger-color, rgb(1, 1, 1))' });
    near(bar(el), [180, 20, 30]);
  });
});
