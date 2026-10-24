import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// 라이브러리 빌드 설정(vite.config.ts — dts · 주석 제거 플러그인)을 시험에 싣지 않는다.
//
// - unit:    계산 모듈(시간 척도 · 충돌 배치 · 구간 트리 · 이벤트 타입 · 라벨).
// - browser: **실제 배치에서만 드러나는 것** — 뷰포트 크기와 포인터 좌표는 그려진 영역의 상자에서 나온다.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/browser/**'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'browser',
          // 직렬 — 파일마다 브라우저 페이지가 함께 뜨면 여유 메모리가 바닥나 시험이 비결정적으로 죽는다.
          fileParallelism: false,
          include: ['tests/browser/**/*.test.ts'],
          browser: {
            enabled: true,
            // 실제 스크롤바로 — headless 기본(`--hide-scrollbars`)은 스크롤바 폭이 0 이다.
            provider: playwright({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } }),
            // headless 고정 — 헤드 있는 창은 OS 표시 배율에 물려 얇은 테두리가 장치 픽셀로 스냅된다.
            instances: [{ browser: 'chromium', headless: true }],
          },
          // 고정 포트 — packages/components/vitest.config.ts 참조(Windows 동적 포트 제외 범위). 41501~41508 · 41510 사용 중.
          api: { host: '127.0.0.1', port: 41509 },
          isolate: true,
        },
      },
    ],
  },
});
