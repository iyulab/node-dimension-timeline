/// <reference types="@vitest/browser-playwright" />
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/DimensionTimeline.js';
import { ArrayDataSource } from '../../src/data/ArrayDataSource.js';

/**
 * 소비자는 한 번의 더블클릭에 `timeline-canvas-dblclick` 을 **한 번** 받는다. 부품(캔버스)이 합성(composed)으로 낸 이벤트와
 * 호스트가 날짜를 더해 다시 내는 이벤트가 같은 이름이라, 부품의 것이 섀도 경계를 넘어 그대로 새면 호스트에 건 리스너가 두 번 불리고
 * 둘째는 `date` 가 없는 원본이다.
 */
type Timeline = HTMLElement & { updateComplete: Promise<unknown>; dataSource: unknown; dimensions: unknown; activeDimension: string };

afterEach(() => { document.body.replaceChildren(); });

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

async function mount(): Promise<Timeline> {
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
  return el;
}

describe('더블클릭 이벤트는 한 번만 닿는다', () => {
  it('빈 캔버스 더블클릭 → 호스트의 timeline-canvas-dblclick 은 한 번이고 date 가 있다', async () => {
    const el = await mount();
    const canvasHost = el.shadowRoot!.querySelector('d-timeline-canvas') as HTMLElement;
    const inner = canvasHost.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    const r = inner.getBoundingClientRect();
    const seen: Array<{ hasDate: boolean }> = [];
    el.addEventListener('timeline-canvas-dblclick', (e) => {
      seen.push({ hasDate: (e as CustomEvent).detail?.date instanceof Date });
    });
    // 맨 아래 가장자리 근처 — 일이 없는 빈 곳
    inner.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true, clientX: r.left + 20, clientY: r.bottom - 6 }));
    expect(seen, JSON.stringify(seen)).toEqual([{ hasDate: true }]);
  });
});

describe('작업 위의 포인터와 부품 이벤트 경계', () => {
  async function taskCenter(el: Timeline) {
    (el as unknown as { setScale(s: string): void }).setScale('hour');
    (el as unknown as { scrollToTask(id: string): void }).scrollToTask('t1');
    await frame();
    await frame();
    const canvasHost = el.shadowRoot!.querySelector('d-timeline-canvas') as HTMLElement & {
      scrollX: number; scrollY: number; getTaskById(id: string): { layoutedTask: { x: number; y: number; width: number; height: number }; absoluteY: number } | undefined;
    };
    const inner = canvasHost.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    const cached = canvasHost.getTaskById('t1');
    expect(cached, '작업이 캔버스 캐시에 있어야 한다').toBeTruthy();
    const r = inner.getBoundingClientRect();
    const lt = cached!.layoutedTask;
    return {
      inner,
      clientX: r.left + lt.x + lt.width / 2 - (canvasHost.scrollX ?? 0),
      clientY: r.top + cached!.absoluteY + lt.height / 2 - (canvasHost.scrollY ?? 0),
    };
  }

  it('작업 더블클릭 → 호스트의 timeline-task-dblclick 은 한 번이다', async () => {
    const el = await mount();
    const { inner, clientX, clientY } = await taskCenter(el);
    let count = 0;
    el.addEventListener('timeline-task-dblclick', () => { count++; });
    document.addEventListener('timeline-task-dblclick', () => { count += 100; }, { once: true });
    inner.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, composed: true, clientX, clientY }));
    expect(count, `호스트 ${count % 100}회 · 문서까지 ${count >= 100 ? '닿음' : '안 닿음'}`).toBe(101);
  });

  it('작업 위로 포인터가 들어오면 호스트에 timeline-task-hover 가 닿는다(호스트가 다시 내지 않는 공개 이벤트)', async () => {
    const el = await mount();
    const { inner, clientX, clientY } = await taskCenter(el);
    const seen: string[] = [];
    el.addEventListener('timeline-task-hover', (e) => { seen.push((e as CustomEvent).detail?.task?.id); });
    inner.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, composed: true, clientX, clientY }));
    expect(seen).toEqual(['t1']);
  });

  it('부품의 이름 없는 이벤트(dimension-change · context-toggle …)와 timeline-canvas-mousemove 는 호스트 밖으로 새지 않는다', async () => {
    const el = await mount();
    const { inner, clientX, clientY } = await taskCenter(el);
    const leaked: string[] = [];
    for (const n of ['dimension-change', 'dimension-value-click', 'dimension-filter', 'context-toggle', 'context-drop',
      'timeline-canvas-mousemove', 'timeline-task-mousedown', 'timeline-canvas-mousedown', 'timeline-canvas-resize']) {
      document.addEventListener(n, () => leaked.push(n));
    }
    inner.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, composed: true, clientX, clientY }));
    inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, clientX, clientY }));
    expect(leaked).toEqual([]);
  });
});
