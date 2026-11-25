/// <reference types="@vitest/browser-playwright" />
import { describe, it, expect, afterEach, vi } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/components/DimensionTimeline.js';
import { ArrayDataSource } from '../../src/data/ArrayDataSource.js';

/**
 * 그려진 것이 화면에 닿는다 — 확대/축소 단추의 아이콘 · 시간축 위 칸의 글자 · 왼쪽 줄과 캔버스 맥락의 일치 ·
 * 2D 문맥이 없는 환경 · 코드 호출은 선택 이벤트를 내지 않는다.
 */
type Timeline = HTMLElement & {
  updateComplete: Promise<unknown>;
  dataSource: unknown;
  dimensions: unknown;
  activeDimension: string;
  scale: string;
  locale: string;
  selectTask(id: string | null): void;
  scrollToTask(id: string): void;
  selectedTaskId: string | null;
};

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
const HOUR = 3600_000;

interface MountOptions {
  width?: number;
  scale?: string;
  locale?: string;
  tasks?: Array<{ id: string; dims: Record<string, string | undefined> }>;
  values?: Array<{ key: string; label: string }>;
}

async function mount(options: MountOptions = {}): Promise<Timeline> {
  const el = document.createElement('d-dimension-timeline') as unknown as Timeline;
  el.setAttribute('style', `display:block; width:${options.width ?? 380}px; height:300px;`);
  if (options.scale) el.setAttribute('scale', options.scale);
  if (options.locale) el.locale = options.locale;
  document.body.appendChild(el);
  const now = Date.now();
  el.dataSource = new ArrayDataSource(
    (options.tasks ?? [{ id: 't1', dims: { worker: 'A' } }]).map((t, i) => ({
      id: t.id,
      start: new Date(now + i * HOUR),
      end: new Date(now + (i + 2) * HOUR),
      dimensions: t.dims as never,
      label: t.id,
    })),
  );
  el.dimensions = [{ key: 'worker', label: 'Worker', values: options.values }];
  el.activeDimension = 'worker';
  await el.updateComplete;
  await frame();
  await frame();
  return el;
}

async function shot(): Promise<{ data: Uint8ClampedArray; width: number; scale: number }> {
  const raw = (await page.screenshot({ save: false, base64: true } as never)) as unknown as { base64: string } | string;
  const base64 = typeof raw === 'string' ? raw : raw.base64;
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = `data:image/png;base64,${base64}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, img.width, img.height).data, width: img.width, scale: img.width / window.innerWidth };
}

const rowLabels = (el: Timeline) => {
  const selector = el.shadowRoot!.querySelector('d-dimension-selector')!;
  return [...selector.shadowRoot!.querySelectorAll('.dimension-value-item')].map((row) => ({
    label: row.querySelector('.value-label')!.textContent!.trim(),
    count: row.querySelector('.value-count')!.textContent!.trim(),
    synced: row.classList.contains('synced'),
    top: Math.round(row.getBoundingClientRect().top),
  }));
};

describe('확대/축소 단추 — 아이콘이 그려진다', () => {
  it('🔴두 단추 안의 아이콘이 배경과 다른 픽셀을 칠한다', async () => {
    const el = await mount();
    const buttons = [...el.shadowRoot!.querySelectorAll('.zoom-button')];
    expect(buttons).toHaveLength(2);
    const s = await shot();
    for (const button of buttons) {
      const r = button.querySelector('svg')!.getBoundingClientRect();
      expect(r.right, '단추가 화면 안에 있어야 잴 수 있다').toBeLessThanOrEqual(window.innerWidth);
      const at = (x: number, y: number) => {
        const i = (Math.round(y * s.scale) * s.width + Math.round(x * s.scale)) * 4;
        return [s.data[i], s.data[i + 1], s.data[i + 2]];
      };
      const bg = at(r.left + 0.5, r.top + 0.5);
      let painted = 0;
      for (let y = Math.floor(r.top); y < Math.ceil(r.bottom); y++) {
        for (let x = Math.floor(r.left); x < Math.ceil(r.right); x++) {
          const p = at(x, y);
          if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 120) painted++;
        }
      }
      expect(painted, `${button.getAttribute('aria-label')} 아이콘의 칠해진 픽셀`).toBeGreaterThan(6);
    }
  });
});

describe('시간축 위 칸 — 칸이 화면보다 넓어도 글자가 보이는 쪽에 선다', () => {
  it('🔴hour 로 하루를 볼 때 위 칸의 상자가 시간축 안에 있다', async () => {
    const el = await mount({ scale: 'hour', width: 900 });
    const axis = el.shadowRoot!.querySelector('d-time-axis')!;
    const area = axis.shadowRoot!.querySelector('.primary-labels')!.getBoundingClientRect();
    const labels = [...axis.shadowRoot!.querySelectorAll('.time-label.primary')];
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      const r = label.getBoundingClientRect();
      expect(r.left, label.textContent!.trim()).toBeGreaterThanOrEqual(area.left - 0.5);
      expect(r.right, label.textContent!.trim()).toBeLessThanOrEqual(area.right + 0.5);
    }
    // 하루 칸은 2,880px 라 화면 전체를 덮는다 — 그 칸의 글자 상자가 화면에 실제로 남는다
    const widest = Math.max(...labels.map((l) => l.getBoundingClientRect().width));
    expect(widest).toBeGreaterThan(area.width * 0.5);
  });
});

describe('왼쪽 줄 = 캔버스 맥락', () => {
  const values = [
    { key: 'unused', label: 'Defined, no tasks' },
    { key: 'A', label: 'Alice' },
  ];

  it('🔴작업이 없는 정의 값은 줄을 만들지 않는다 — 줄 이름이 겹치지 않는다', async () => {
    const el = await mount({
      values,
      tasks: [
        { id: 't1', dims: { worker: 'A' } },
        { id: 't2', dims: { worker: 'B' } },
      ],
    });
    const rows = rowLabels(el);
    expect(rows.map((r) => r.label)).toEqual(['Alice', 'B']);
    expect(rows.every((r) => r.synced), '모든 줄이 캔버스 맥락의 자리를 갖는다').toBe(true);
    expect(new Set(rows.map((r) => r.top)).size, '줄마다 자리가 다르다').toBe(rows.length);
  });

  it('값이 없는 작업은 «미지정» 줄을 가지며 이름은 labels · locale 로 바뀐다', async () => {
    const tasks = [
      { id: 't1', dims: { worker: 'A' } },
      { id: 't2', dims: {} },
    ];
    const en = await mount({ values, tasks });
    expect(rowLabels(en).map((r) => r.label)).toEqual(['Alice', 'Unassigned']);
    expect(rowLabels(en).every((r) => r.synced)).toBe(true);
    document.body.replaceChildren();

    const ko = await mount({ values, tasks, locale: 'ko' });
    expect(rowLabels(ko).map((r) => r.label)).toEqual(['Alice', '미지정']);
    document.body.replaceChildren();

    const custom = await mount({ values, tasks });
    (custom as unknown as { labels: unknown }).labels = { unassigned: 'No worker' };
    await custom.updateComplete;
    await frame();
    expect(rowLabels(custom).map((r) => r.label)).toEqual(['Alice', 'No worker']);
  });

  it('작업이 하나도 없으면 정의된 값이 목록으로 남는다', async () => {
    const el = await mount({ values, tasks: [] });
    expect(rowLabels(el).map((r) => r.label)).toEqual(['Defined, no tasks', 'Alice']);
  });

  it('줄의 개수는 그 줄의 작업 수다', async () => {
    const el = await mount({
      values,
      tasks: [
        { id: 't1', dims: { worker: 'A' } },
        { id: 't2', dims: { worker: 'A' } },
        { id: 't3', dims: {} },
      ],
    });
    expect(rowLabels(el).map((r) => [r.label, r.count])).toEqual([['Alice', '2'], ['Unassigned', '1']]);
  });
});

describe('2D 문맥이 없는 환경', () => {
  it('🔴문맥이 null 이어도 마운트가 오류 없이 끝난다', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => errors.push(e.error ?? e.message);
    window.addEventListener('error', onError);
    try {
      const el = await mount();
      await frame();
      expect(el.shadowRoot!.querySelector('d-timeline-canvas')).toBeTruthy();
    } finally {
      window.removeEventListener('error', onError);
    }
    expect(errors).toEqual([]);
  });
});

describe('선택 이벤트는 사용자 상호작용만 낸다', () => {
  it('🔴selectTask · scrollToTask 는 timeline-task-select 를 내지 않고, scrollToTask 는 선택을 바꾸지 않는다', async () => {
    const el = await mount();
    const seen: unknown[] = [];
    el.addEventListener('timeline-task-select', (e) => seen.push((e as CustomEvent).detail));
    el.selectTask('t1');
    expect(el.selectedTaskId).toBe('t1');
    el.selectTask(null);
    el.scrollToTask('t1');
    await frame();
    expect(el.selectedTaskId, 'scrollToTask 는 보이게 옮길 뿐').toBeNull();
    expect(seen).toEqual([]);
  });

  it('🔴실제 마우스다운으로 작업을 고르면 이벤트가 한 번 나간다', async () => {
    const el = await mount({ width: 900 });
    el.scale = 'hour';
    await el.updateComplete;
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
    expect(cached, '작업이 캔버스 캐시에 있어야 한다').toBeTruthy();
    const r = inner.getBoundingClientRect();
    const lt = cached!.layoutedTask;
    const seen: unknown[] = [];
    el.addEventListener('timeline-task-select', (e) => seen.push((e as CustomEvent).detail));
    inner.dispatchEvent(new MouseEvent('mousedown', {
      bubbles: true,
      composed: true,
      button: 0,
      clientX: r.left + lt.x + lt.width / 2 - (canvasHost.scrollX ?? 0),
      clientY: r.top + cached!.absoluteY + lt.height / 2 - (canvasHost.scrollY ?? 0),
    }));
    expect(seen).toHaveLength(1);
    expect(el.selectedTaskId).toBe('t1');
  });
});
