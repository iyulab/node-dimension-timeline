/// <reference types="@vitest/browser-playwright" />
import { describe, it, expect, afterEach } from 'vitest';
import darkSheet from '@iyulab/components/styles/dark.css?raw';
import '../../src/components/DimensionTimeline.js';
import { ArrayDataSource } from '../../src/data/ArrayDataSource.js';
import type { TaskStatus } from '../../src/types/index.js';

/**
 * 막대 위 글자는 읽혀야 한다 — 상태마다 «그려진» 글자색과 막대색의 대비를 칠해진 픽셀로 잰다(WCAG 1.4.3, 4.5:1).
 * 토큰 값의 산술이 아니라 픽셀인 이유: 상태의 불투명도와 호버가 바탕과 섞여 최종 색을 바꾼다.
 */
type Timeline = HTMLElement & {
  updateComplete: Promise<unknown>;
  dataSource: unknown;
  dimensions: unknown;
  activeDimension: string;
  scrollToTask(id: string): void;
};

const HOUR = 3600_000;
const STATES: (TaskStatus | undefined)[] = [undefined, 'pending', 'in-progress', 'completed', 'cancelled'];
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('theme');
  document.getElementById('dark-sheet')?.remove();
});

async function mount(status: TaskStatus | undefined) {
  const el = document.createElement('d-dimension-timeline') as unknown as Timeline;
  el.setAttribute('style', 'display:block; width:380px; height:300px;');
  document.body.appendChild(el);
  const now = Date.now();
  el.dataSource = new ArrayDataSource([
    { id: 't1', start: new Date(now), end: new Date(now + 3 * HOUR), dimensions: { worker: 'A' }, label: 'MMMMMMMM', status },
  ]);
  el.dimensions = [{ key: 'worker', label: 'Worker' }];
  el.activeDimension = 'worker';
  el.setAttribute('scale', 'hour');
  await el.updateComplete;
  await frame();
  el.scrollToTask('t1');
  await frame();
  await frame();
  const host = el.shadowRoot!.querySelector('d-timeline-canvas') as HTMLElement & {
    scrollX: number;
    scrollY: number;
    getTaskById(id: string): { layoutedTask: { x: number; y: number; width: number; height: number }; absoluteY: number } | undefined;
  };
  const canvas = host.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
  const cached = host.getTaskById('t1')!;
  const box = {
    x: cached.layoutedTask.x - (host.scrollX ?? 0),
    y: cached.absoluteY - (host.scrollY ?? 0),
    width: cached.layoutedTask.width,
    height: cached.layoutedTask.height,
  };
  return { canvas, box };
}

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * 막대의 채움색과 글자 획의 색(채움과 가장 먼 픽셀).
 * 채움은 글자 위쪽의 안쪽 한 점에서 읽는다 — 양 끝의 크기 조절 손잡이(호버)와 아래의 진행 막대를 피한다.
 */
function measure(canvas: HTMLCanvasElement, box: { x: number; y: number; width: number; height: number }) {
  const dpr = canvas.width / canvas.getBoundingClientRect().width;
  const ctx = canvas.getContext('2d')!;
  const read = (x: number, y: number, w: number, h: number) =>
    ctx.getImageData(Math.round(x * dpr), Math.round(y * dpr), Math.round(w * dpr), Math.round(h * dpr)).data;
  const fill = Array.from(read(box.x + 16, box.y + 3, 1, 1).slice(0, 3));
  const data = read(box.x + 8, box.y + 5, Math.min(box.width - 16, 80), box.height - 10);
  let text = fill;
  for (let i = 0; i < data.length; i += 4) {
    const pixel = [data[i], data[i + 1], data[i + 2]];
    if (contrast(pixel, fill) > contrast(text, fill)) text = pixel;
  }
  return { fill, text, ratio: contrast(text, fill) };
}

function hover(canvas: HTMLCanvasElement, box: { x: number; y: number; width: number; height: number }) {
  const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + box.x + box.width / 2, clientY: r.top + box.y + box.height / 2 }));
}

describe('막대 글자 대비 — 토큰 시트 없음', () => {
  for (const status of STATES) {
    it(`🔴${status ?? '기본'} 막대의 글자는 4.5:1 이상으로 그려진다`, async () => {
      const { canvas, box } = await mount(status);
      const m = measure(canvas, box);
      expect(m.ratio, `fill ${m.fill} · text ${m.text}`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${status ?? '기본'} 막대는 호버 중에도 4.5:1 이상이다`, async () => {
      const { canvas, box } = await mount(status);
      hover(canvas, box);
      await frame();
      await frame();
      const m = measure(canvas, box);
      expect(m.ratio, `fill ${m.fill} · text ${m.text}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('막대 글자 대비 — components 다크 시트', () => {
  for (const status of STATES) {
    it(`🔴${status ?? '기본'} 막대의 글자는 4.5:1 이상으로 그려진다`, async () => {
      const style = document.createElement('style');
      style.id = 'dark-sheet';
      style.textContent = darkSheet;
      document.head.appendChild(style);
      document.documentElement.setAttribute('theme', 'dark');
      const { canvas, box } = await mount(status);
      const m = measure(canvas, box);
      expect(m.ratio, `fill ${m.fill} · text ${m.text}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
