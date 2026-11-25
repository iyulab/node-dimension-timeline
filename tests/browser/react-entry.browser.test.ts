/// <reference types="@vitest/browser-playwright" />
import { describe, it, afterEach, expect } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DimensionTimelineReact } from '../../src/react';
import { ArrayDataSource } from '../../src/data/ArrayDataSource.js';
import type { DimensionTimeline } from '../../src/components/DimensionTimeline.js';
import type { TimelineTaskSelectDetail } from '../../src/events/TimelineEvents.js';

/**
 * `@iyulab/dimension-timeline/react` — 객체 · 불리언 속성은 JSX 속성으로 요소의 속성(property)에 들어가고, 이벤트는
 * `onXxx` 로 받으며 detail 의 형이 묶인다.
 */
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLElement | null = null;
let root: Root | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => { root!.unmount(); });
    root = null;
  }
  container?.remove();
  container = null;
});

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

describe('DimensionTimelineReact', () => {
  it('속성은 요소의 속성으로 들어가고(불리언 false 포함), 이벤트는 onTaskSelect 로 받는다', async () => {
    const now = Date.now();
    const dataSource = new ArrayDataSource([
      { id: 't1', start: new Date(now), end: new Date(now + 7200_000), dimensions: { worker: 'A' }, label: 'one' },
    ]);
    const selected: TimelineTaskSelectDetail[] = [];

    container = document.createElement('div');
    container.style.cssText = 'width:900px;height:300px';
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        React.createElement(DimensionTimelineReact, {
          style: { display: 'block', width: '900px', height: '300px' },
          dataSource,
          dimensions: [{ key: 'worker', label: 'Worker' }],
          activeDimension: 'worker',
          scale: 'hour',
          tasksDraggable: false,
          // `detail` 의 형이 묶여 있다 — `e.detail.task.id` 가 컴파일된다
          onTaskSelect: (e) => { selected.push(e.detail); },
        }),
      );
    });
    const el = container.querySelector('d-dimension-timeline') as DimensionTimeline & HTMLElement;
    expect(el).toBeTruthy();
    await el.updateComplete;
    await frame();
    await frame();

    expect(el.dataSource).toBe(dataSource);
    expect(el.activeDimension).toBe('worker');
    expect(el.tasksDraggable, '불리언 false 는 속성으로 들어가 기본값(true)을 덮는다').toBe(false);

    el.scrollToTask('t1');
    await frame();
    await frame();
    const canvasHost = el.shadowRoot!.querySelector('d-timeline-canvas') as HTMLElement & {
      scrollX: number;
      scrollY: number;
      getTaskById(id: string): { layoutedTask: { x: number; y: number; width: number; height: number }; absoluteY: number } | undefined;
    };
    const inner = canvasHost.shadowRoot!.querySelector('canvas') as HTMLCanvasElement;
    const cached = canvasHost.getTaskById('t1');
    expect(cached).toBeTruthy();
    const r = inner.getBoundingClientRect();
    const lt = cached!.layoutedTask;
    inner.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      composed: true,
      button: 0,
      clientX: r.left + lt.x + lt.width / 2 - (canvasHost.scrollX ?? 0),
      clientY: r.top + cached!.absoluteY + lt.height / 2 - (canvasHost.scrollY ?? 0),
    }));
    expect(selected.map((d) => d.task.id)).toEqual(['t1']);
  });
});
