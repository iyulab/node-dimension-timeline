/**
 * Canvas 렌더링 유틸리티
 */

/**
 * 디바이스 픽셀 비율 가져오기
 */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

/**
 * Canvas를 고해상도로 설정
 */
export function setupHighDpiCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const dpr = getDevicePixelRatio();

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  return ctx;
}

/**
 * Canvas 클리어
 */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  const dpr = getDevicePixelRatio();
  ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);
}

/**
 * 둥근 사각형 경로 생성
 */
export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * 둥근 사각형 그리기
 */
export function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
): void {
  ctx.fillStyle = fillStyle;
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

/**
 * 둥근 사각형 테두리 그리기
 */
export function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle: string,
  lineWidth: number = 1,
): void {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();
}

/**
 * 텍스트를 주어진 너비에 맞게 자르기 (ellipsis)
 */
export function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  const metrics = ctx.measureText(text);

  if (metrics.width <= maxWidth) {
    return text;
  }

  const ellipsis = '...';
  const ellipsisWidth = ctx.measureText(ellipsis).width;

  if (maxWidth <= ellipsisWidth) {
    return '';
  }

  let truncated = text;
  while (truncated.length > 0) {
    truncated = truncated.slice(0, -1);
    if (ctx.measureText(truncated).width + ellipsisWidth <= maxWidth) {
      return truncated + ellipsis;
    }
  }

  return '';
}

/**
 * 텍스트 중앙 정렬 그리기
 */
export function fillTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  maxWidth?: number,
): void {
  const displayText = maxWidth ? truncateText(ctx, text, maxWidth) : text;
  const metrics = ctx.measureText(displayText);

  const textX = x + (width - metrics.width) / 2;
  const textY = y + height / 2 + metrics.actualBoundingBoxAscent / 2;

  ctx.fillText(displayText, textX, textY);
}

/**
 * 프로그레스 바 그리기
 */
export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  progress: number,
  backgroundColor: string,
  progressColor: string,
  radius: number = 2,
): void {
  // 배경
  fillRoundedRect(ctx, x, y, width, height, radius, backgroundColor);

  // 프로그레스
  const progressWidth = Math.max(0, Math.min(1, progress / 100)) * width;
  if (progressWidth > 0) {
    fillRoundedRect(ctx, x, y, progressWidth, height, radius, progressColor);
  }
}

/**
 * 수직 그라데이션 생성
 */
export function createVerticalGradient(
  ctx: CanvasRenderingContext2D,
  y: number,
  height: number,
  colorStops: Array<{ offset: number; color: string }>,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, y, 0, y + height);
  colorStops.forEach(({ offset, color }) => {
    gradient.addColorStop(offset, color);
  });
  return gradient;
}

/**
 * 색상에 투명도 추가
 */
export function withAlpha(color: string, alpha: number): string {
  // Hex 색상 처리
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // rgb() 색상 처리
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }

  // 이미 rgba인 경우
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }

  return color;
}

/**
 * 색상 밝기 조절
 */
export function adjustBrightness(color: string, factor: number): string {
  // Hex to RGB
  let r: number, g: number, b: number;

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (!match) return color;
    [r, g, b] = match.map(Number);
  } else {
    return color;
  }

  // 밝기 조절
  r = Math.min(255, Math.max(0, Math.round(r * factor)));
  g = Math.min(255, Math.max(0, Math.round(g * factor)));
  b = Math.min(255, Math.max(0, Math.round(b * factor)));

  return `rgb(${r}, ${g}, ${b})`;
}
