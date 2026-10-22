import { describe, expect, test } from 'vitest';
import { IntervalTree } from '../src/utilities/IntervalTree.js';

const ids = (xs: Array<{ data: string }>) => xs.map((x) => x.data).sort();

describe('IntervalTree', () => {
  test('query returns the intervals that overlap — ends are open', () => {
    const tree = new IntervalTree<string>();
    tree.insert({ start: 0, end: 10, data: 'a' });
    tree.insert({ start: 10, end: 20, data: 'b' });
    tree.insert({ start: 5, end: 15, data: 'c' });
    expect(ids(tree.query({ start: 9, end: 11 }))).toEqual(['a', 'b', 'c']);
    // 맞닿기만 하면 겹치지 않는다
    expect(ids(tree.query({ start: 20, end: 30 }))).toEqual([]);
    expect(ids(tree.query({ start: 15, end: 16 }))).toEqual(['b']);
  });

  test('stays correct over many inserts and deletes (rebalancing)', () => {
    const tree = new IntervalTree<string>();
    for (let i = 0; i < 200; i++) tree.insert({ start: i, end: i + 3, data: `t${i}` });
    expect(tree.size).toBe(200);
    expect(ids(tree.query({ start: 100, end: 101 }))).toEqual(['t100', 't98', 't99']);
    for (let i = 0; i < 200; i += 2) expect(tree.delete({ start: i, end: i + 3 })).toBe(true);
    expect(tree.size).toBe(100);
    expect(ids(tree.query({ start: 100, end: 101 }))).toEqual(['t99']);
  });

  test('delete with a predicate removes only the matching one of equal intervals', () => {
    const tree = new IntervalTree<string>();
    tree.insert({ start: 0, end: 5, data: 'x' });
    tree.insert({ start: 0, end: 5, data: 'y' });
    expect(tree.delete({ start: 0, end: 5 }, (d) => d === 'y')).toBe(true);
    expect(ids(tree.getAll())).toEqual(['x']);
  });

  test('NEGATIVE: deleting what is not there reports false and changes nothing', () => {
    const tree = new IntervalTree<string>();
    tree.insert({ start: 0, end: 5, data: 'x' });
    expect(tree.delete({ start: 1, end: 5 })).toBe(false);
    expect(tree.size).toBe(1);
  });
});
