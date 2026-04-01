import { resolve } from 'path';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  // 개발 서버 설정
  server: {
    open: './demo/index.html',
    port: 5174,
  },

  // 빌드 설정
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    copyPublicDir: false,
    minify: false,
    lib: {
      entry: [
        resolve(__dirname, 'src/index.ts'),
      ],
      formats: ['es'],
      fileName: (_format: string, entry: string): string => `${entry}.js`,
    },
    rollupOptions: {
      // 외부 종속성 라이브러리
      external: [
        /^lit.*/,
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
      treeshake: {
        moduleSideEffects: true,
      },
    },
  },

  // 플러그인 설정
  plugins: [
    dts({
      include: ['src/**/*'],
    }) as unknown as Plugin,
  ],
});
