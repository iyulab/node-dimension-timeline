import { defineConfig } from 'vitest/config';

// 라이브러리 빌드 설정(vite.config.ts — dts · 주석 제거 플러그인)을 시험에 싣지 않는다.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
