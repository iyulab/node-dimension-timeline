// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

// 타입 맵이 약속하는 이벤트는 실제로 나가야 한다 — 아무도 내지 않는 이름을 맵에 두면 소비자의 타입 있는 리스너가
// 영영 불리지 않는 이벤트를 기다린다(2026-11 감사에서 여덟 개와 속성 하나가 그랬다). 맵에 이름을 더하려면
// 요소(또는 그 부품)의 `emit('<이름>'` 호출이 먼저 있어야 한다.

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.ts') ? [full] : [];
  });
}

function mapKeys(): string[] {
  const text = readFileSync(join(SRC, 'events', 'TimelineEvents.ts'), 'utf8');
  const body = /export interface TimelineEventMap \{([\s\S]*?)\n\}/.exec(text)?.[1] ?? '';
  return [...body.matchAll(/'([a-z][a-z0-9-]*)':/g)].map((m) => m[1]);
}

function emittedNames(): Set<string> {
  const names = new Set<string>();
  for (const file of walk(SRC)) {
    if (file.includes(`${join('src', 'events')}`)) continue;
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\bemit\(\s*'([a-z][a-z0-9-]*)'/g)) names.add(m[1]);
  }
  return names;
}

test('every name in TimelineEventMap is raised by some emit() call', () => {
  const keys = mapKeys();
  expect(keys.length).toBeGreaterThan(5); // 맵을 못 읽어 빈 목록으로 통과하지 않는다
  const emitted = emittedNames();
  expect(keys.filter((k) => !emitted.has(k))).toEqual([]);
});
