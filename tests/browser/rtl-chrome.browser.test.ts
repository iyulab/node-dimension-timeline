/// <reference types="@vitest/browser-playwright" />
import { describe, it, expect, afterEach } from 'vitest';
import '../../src/components/DimensionTimeline.js';

/**
 * 타임라인은 `dir="rtl"` 에서 **크롬은 읽는 방향을 따르고 시간축은 거울이 아니다**: 차원 선택 열과 모서리 머리는 읽는 방향의
 * 시작(RTL 은 오른쪽)에 서고, 시간은 어느 방향의 페이지에서도 왼쪽에서 오른쪽으로 흐른다(시간축 · 캔버스 · 눈금 · 지금 표지 ·
 * 스크롤바 · 줌 단추는 한 «플롯 영역» 으로 같은 물리 좌표를 쓴다). 반쪽 거울의 위험은 둘이다 — 격자 칸은 뒤집혔는데 모서리 머리의
 * 테두리가 바깥 가장자리에 남는 것, 시간축이 캔버스와 어긋나는 것. 오라클은 구조(상자 위치)와 계산된 테두리 변이다.
 */
type Timeline = HTMLElement & { updateComplete: Promise<unknown> };

afterEach(() => { document.body.replaceChildren(); document.documentElement.dir = 'ltr'; });

const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));

async function mount(dir: 'ltr' | 'rtl'): Promise<Timeline> {
  document.documentElement.dir = dir;
  const el = document.createElement('d-dimension-timeline') as unknown as Timeline;
  el.setAttribute('style', 'display:block; width:900px; height:420px;');
  document.body.appendChild(el);
  await el.updateComplete;
  await frame();
  await frame();
  return el;
}
const box = (el: Timeline, sel: string) => el.shadowRoot!.querySelector(sel)!.getBoundingClientRect();

describe.each(['ltr', 'rtl'] as const)('RTL — dimension-timeline 크롬과 시간축 (%s)', (dir) => {
  it('차원 선택 열은 읽는 방향의 시작에, 시간축과 캔버스는 그 반대편에 같은 가로 범위로 선다', async () => {
    const el = await mount(dir);
    const dim = box(el, '.dimension-area');
    const canvas = box(el, '.canvas-area');
    const axis = box(el, '.time-axis-area');
    if (dir === 'ltr') expect(dim.right).toBeLessThanOrEqual(canvas.left + 1);
    else expect(dim.left).toBeGreaterThanOrEqual(canvas.right - 1);
    expect(Math.abs(axis.left - canvas.left), `${dir}: 시간축 왼쪽 ${axis.left} · 캔버스 왼쪽 ${canvas.left}`).toBeLessThan(2);
    expect(Math.abs(axis.right - canvas.right), `${dir}: 시간축 오른쪽 ${axis.right} · 캔버스 오른쪽 ${canvas.right}`).toBeLessThan(2);
  });

  it('모서리 머리의 테두리는 시간축과 맞닿는 변에 선다(읽는 방향의 끝)', async () => {
    const el = await mount(dir);
    const corner = el.shadowRoot!.querySelector('.corner-header') as HTMLElement;
    const cs = getComputedStyle(corner);
    const adjacent = dir === 'ltr' ? cs.borderRightWidth : cs.borderLeftWidth;
    const outer = dir === 'ltr' ? cs.borderLeftWidth : cs.borderRightWidth;
    expect(adjacent, `${dir}: 시간축과 맞닿는 변`).toBe('1px');
    expect(outer, `${dir}: 바깥 변`).toBe('0px');
  });
});

describe('RTL — dimension-timeline 시간축은 거울이 아니다', () => {
  it('RTL 페이지의 눈금 라벨 위치(시간축 왼쪽 기준)와 지금 표지가 LTR 페이지와 같다', async () => {
    const read = async (dir: 'ltr' | 'rtl') => {
      const el = await mount(dir);
      const axis = el.shadowRoot!.querySelector('d-time-axis') as HTMLElement;
      const origin = axis.getBoundingClientRect().left;
      const labels = [...axis.shadowRoot!.querySelectorAll<HTMLElement>('.time-label')]
        .map((l) => Math.round(l.getBoundingClientRect().left - origin))
        .sort((x, y) => x - y);
      el.remove();
      return labels;
    };
    const ltr = await read('ltr');
    const rtl = await read('rtl');
    expect(ltr.length, '눈금 라벨이 그려진다').toBeGreaterThanOrEqual(2);
    expect(rtl, '시간은 어느 방향의 페이지에서도 왼쪽에서 오른쪽으로 흐른다 — 눈금이 같은 자리에 선다').toEqual(ltr);
  });
});
