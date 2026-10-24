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

describe('축 · 맥락 머리글의 높이', () => {
  it('🔴시간축이 --time-axis-height 행을 채운다', async () => {
    const el = await mount('--time-axis-height: 80px;');
    const axis = el.shadowRoot!.querySelector('d-time-axis')!;
    await (axis as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const container = axis.shadowRoot!.querySelector('.time-axis-container')!;
    expect(Math.round(axis.getBoundingClientRect().height)).toBe(80);
    expect(Math.round(container.getBoundingClientRect().height)).toBe(79); // 아래 경계선 1px
  });

  it('🔴맥락 조각의 전체 높이가 그려진 머리글(--context-header-height)을 쓴다', async () => {
    const slice = document.createElement('d-context-slice') as unknown as HTMLElement & {
      updateComplete: Promise<unknown>;
      getTotalHeight(): number;
      getContentHeight(): number;
    };
    slice.style.setProperty('--context-header-height', '48px');
    document.body.appendChild(slice);
    await slice.updateComplete;
    await frame();
    // 머리글 상자 = --context-header-height 48 + 아래 경계선 1
    expect(slice.getTotalHeight() - slice.getContentHeight()).toBe(49);
  });
});
