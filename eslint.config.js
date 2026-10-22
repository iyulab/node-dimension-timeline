import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import liteslint from "eslint-plugin-lit";
import globals from "globals";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "demo/**", "*.config.*"]
  },
  {
    // 확장자를 명시해야 .ts 가 린팅 대상으로 opt-in 된다.
    // 확장자 없는 패턴("src/**/*")은 universal 로 취급돼 어떤 파일도 매칭하지 않는다.
    files: ["src/**/*.ts", "tests/**/*.ts"],
    // 프리셋은 extends 로 합성한다. 객체 스프레드({...preset})는 배열 프리셋
    // (tseslint.configs.recommended)을 인덱스 키로 뭉개 무력화시킨다.
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      liteslint.configs["flat/recommended"]
    ],
    languageOptions: {
      sourceType: "module",
      globals: globals.browser
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    }
  }
]);
