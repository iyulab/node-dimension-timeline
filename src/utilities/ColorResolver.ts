/**
 * 캔버스에 칠할 색을 CSS 색 표현에서 푼다.
 *
 * 캔버스 2D 문맥은 `var(--x)` · `light-dark()` 같은 표현을 모르고 CSS 를 상속하지도 않는다. 그래서 요소 안에 둔 탐침 요소의
 * `color` 에 표현을 걸고 **계산된 값**을 읽는다 — 변수 사슬 · 시스템 색 · 색 함수가 브라우저가 풀어 준 `rgb()` 로 온다.
 * 풀린 값은 표현마다 담아 두고, 테마가 바뀌었을 수 있을 때(`invalidate()`) 비운다.
 */

/** `rgb(r, g, b)` · `rgba(r, g, b, a)` — 캔버스 유틸(`withAlpha` 등)이 읽는 모양 */
const PLAIN_RGB = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;

/** `rgb(r g b / a)` · `color(srgb …)` · `oklch(…)` 처럼 풀린 값이 단순 `rgb()` 가 아닐 때 한 픽셀로 칠해 `rgb()` 로 돌려받는다 */
function toPlainRgb(color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return color;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
}

/** 색 표현 → 캔버스가 칠할 수 있는 색 */
export interface ColorResolver {
  resolve(color: string): string;
  /** 풀어 둔 값을 비운다 — 테마 · 변수가 바뀌었을 수 있을 때 */
  invalidate(): void;
}

/** 표현을 풀지 않고 그대로 돌려준다 — 탐침이 없는 환경 · 단위 시험용 */
export const identityColorResolver: ColorResolver = {
  resolve: (color) => color,
  invalidate: () => undefined,
};

/**
 * 탐침 요소로 푸는 해석기. `probe` 는 문서에 붙어 있어야 하고(상속받는 변수를 읽으려면 그려질 요소의 안쪽이어야 한다)
 * 화면에 보일 필요는 없다(`display: none` 이어도 계산된 `color` 는 읽힌다).
 */
export class ProbeColorResolver implements ColorResolver {
  private readonly cache = new Map<string, string>();

  constructor(private readonly probe: HTMLElement) {}

  resolve(color: string): string {
    // 표현이 아닌 값은 그대로 — 대부분의 `#rrggbb` · `rgb()` 는 탐침을 거치지 않는다
    if (!color.includes('var(') && !color.includes('light-dark(') && !color.includes('color-mix(')) return color;
    const cached = this.cache.get(color);
    if (cached !== undefined) return cached;

    const { style } = this.probe;
    style.color = '';
    style.color = color;
    // 파싱되지 않은 표현은 `style.color` 가 비어 있다 — 풀 수 없으니 그대로 둔다
    const resolved = style.color === '' || !this.probe.isConnected
      ? color
      : getComputedStyle(this.probe).color;
    style.color = '';

    const plain = PLAIN_RGB.test(resolved) ? resolved : toPlainRgb(resolved);
    this.cache.set(color, plain);
    return plain;
  }

  invalidate(): void {
    this.cache.clear();
  }
}
