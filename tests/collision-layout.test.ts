import { describe, expect, test } from 'vitest';
import { CollisionLayoutEngine } from '../src/core/CollisionLayoutEngine.js';
import { TimeScale } from '../src/core/TimeScale.js';
import type { Task } from '../src/types/index.js';

// 1시간 = 60px → 1분 = 1px. 원점 2026-01-01 00:00(로컬).
const origin = new Date(2026, 0, 1, 0, 0);
const scale = () => new TimeScale('hour', origin, 60);
const at = (min: number) => new Date(origin.getTime() + min * 60_000);
const task = (id: string, from: number, to: number, team: string | string[] = 'A'): Task =>
  ({ id, start: at(from), end: at(to), dimensions: { team } });

const rows = (engine: CollisionLayoutEngine, tasks: Task[]) =>
  Object.fromEntries(engine.layoutContext(tasks, scale()).tasks.map((t) => [t.task.id, t.row]));

describe('CollisionLayoutEngine — row assignment', () => {
  const engine = new CollisionLayoutEngine({ minTaskWidth: 0 });

  test('overlapping tasks go to separate rows; a task that starts when another ends reuses its row', () => {
    expect(rows(engine, [task('a', 0, 60), task('b', 30, 90), task('c', 60, 120)])).toEqual({ a: 0, b: 1, c: 0 });
  });

  test('uses as few rows as the deepest overlap needs, whatever the input order', () => {
    const tasks = [task('d', 50, 70), task('a', 0, 100), task('c', 20, 40), task('b', 10, 30), task('e', 80, 90)];
    const r = engine.layoutContext(tasks, scale());
    // 가장 깊은 겹침은 a · b · c (20~30분) = 3
    expect(r.rowCount).toBe(3);
    const placed = r.tasks;
    for (const x of placed)
      for (const y of placed)
        if (x !== y && x.row === y.row) expect(x.task.end <= y.task.start || y.task.end <= x.task.start).toBe(true);
  });

  test('NEGATIVE: one task, or none, is one row high', () => {
    expect(engine.layoutContext([task('a', 0, 10)], scale()).rowCount).toBe(1);
    const empty = engine.layoutContext([], scale());
    expect(empty.rowCount).toBe(1);
    expect(empty.height).toBe(32);
  });

  test('minTaskWidth widens a short task for collision too — a 1-minute task blocks the next 20px', () => {
    const wide = new CollisionLayoutEngine({ minTaskWidth: 20 });
    expect(rows(wide, [task('short', 0, 1), task('next', 10, 30)])).toEqual({ short: 0, next: 1 });
    expect(rows(wide, [task('short', 0, 1), task('later', 20, 30)])).toEqual({ short: 0, later: 0 });
  });
});

describe('CollisionLayoutEngine — layout by dimension', () => {
  const engine = new CollisionLayoutEngine({ taskHeight: 20, taskGap: 4, minTaskWidth: 0 });

  test('groups by the dimension value, sorted, with unassigned last; a task with two values appears in both', () => {
    const r = engine.layout(
      [task('x', 0, 10, 'B'), task('y', 0, 10, ['A', 'B']), { id: 'z', start: at(0), end: at(10), dimensions: {} }],
      'team',
      scale(),
    );
    expect(r.contexts.map((c) => c.dimensionValue)).toEqual(['A', 'B', '(none)']);
    expect(r.contexts[1].tasks.map((t) => t.task.id).sort()).toEqual(['x', 'y']);
    expect(r.contexts[1].rowCount).toBe(2);
  });

  test('heights: rows × (height + gap) − gap, and the total adds a gap between contexts', () => {
    const r = engine.layout([task('a', 0, 10, 'A'), task('b', 5, 15, 'A'), task('c', 0, 10, 'B')], 'team', scale());
    expect(r.contexts.map((c) => c.height)).toEqual([44, 20]);
    expect(r.totalHeight).toBe(44 + 4 + 20);
  });

  test('zoomY scales task height, gap and y', () => {
    const r = engine.layout([task('a', 0, 10), task('b', 5, 15)], 'team', scale(), undefined, 2);
    const b = r.contexts[0].tasks.find((t) => t.task.id === 'b')!;
    expect(b.height).toBe(40);
    expect(b.y).toBe(48);
  });

  test('visibleRange keeps only tasks that overlap it (ends open)', () => {
    const r = engine.layout([task('a', 0, 10), task('b', 10, 20), task('c', 30, 40)], 'team', scale(), {
      start: at(10),
      end: at(30),
    });
    expect(r.contexts[0].tasks.map((t) => t.task.id)).toEqual(['b']);
  });

  test('NEGATIVE: no tasks lay out to zero height, never a negative one', () => {
    const r = engine.layout([], 'team', scale());
    expect(r.contexts).toEqual([]);
    expect(r.totalHeight).toBe(0);
  });
});
