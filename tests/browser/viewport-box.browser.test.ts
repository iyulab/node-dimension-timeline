/// <reference types="@vitest/browser-playwright" />
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/DimensionTimeline.js';

/**
 * **뷰포트 크기는 작업이 그려지는 영역(`.canvas-area`)의 상자다 — 축 높이 · 선택기 폭을 숫자로 가정하지 않는다.**
 *
 * 종전에는 호스트 상자에서 200(선택기 폭)과 48(축 높이)을 뺐다. 두 값은 `--dimension-selector-width` ·
 * `--time-axis-height` 로 바꿀 수 있고 컨테이너 테두리도 있어, 바꾼 화면에서는 뷰포트와 포인터 좌표가 그만큼 어긋났다.
 */
type Timeline = HTMLElement & {
  updateComplete: Promise<unknown>;
  viewportManager: { width: number; height: number };
};

afterEach(() => document.body.replaceChildren());

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

async function mount(style: string) {
  const el = document.createElement('d-dimension-timeline') as unknown as Timeline;
  el.setAttribute('style', `display:block; width:900px; height:420px; ${style}`);
  document.body.appendChild(el);
  await el.updateComplete;
  await frame();
  await frame();
  return el;
}

const area = (el: Timeline) => el.shadowRoot!.querySelector('.canvas-area')!.getBoundingClientRect();

describe('뷰포트 상자', () => {
  it('🔴축 높이 · 선택기 폭을 바꾸면 뷰포트가 그린 영역을 따른다', async () => {
    const el = await mount('--time-axis-height: 80px; --dimension-selector-width: 260px;');
    const r = area(el);
    expect(Math.round(r.height)).toBeLessThan(420 - 80 + 1);
    expect(el.viewportManager.width).toBeCloseTo(r.width, 0);
    expect(el.viewportManager.height).toBeCloseTo(r.height, 0);
  });

  it('🔴호스트 크기 그대로 축 높이만 바뀌어도 뷰포트가 따라온다', async () => {
    const el = await mount('');
    el.style.setProperty('--time-axis-height', '96px');
    await frame();
    await frame();
    expect(el.viewportManager.height).toBeCloseTo(area(el).height, 0);
  });

  it('기본값 — 뷰포트 = 그린 영역(테두리 포함 셈)', async () => {
    const el = await mount('');
    const r = area(el);
    expect(el.viewportManager.width).toBeCloseTo(r.width, 0);
    expect(el.viewportManager.height).toBeCloseTo(r.height, 0);
  });
});
