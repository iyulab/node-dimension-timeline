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

  test('deletes every one of many intervals that share a start (rotations move equal starts to the left)', () => {
    const tree = new IntervalTree<string>();
    for (let i = 0; i < 20; i++) tree.insert({ start: 5, end: 10 + i, data: `e${i}` });
    const missed: string[] = [];
    for (let i = 0; i < 20; i++) if (!tree.delete({ start: 5, end: 10 + i })) missed.push(`e${i}`);
    expect(missed).toEqual([]);
    expect(tree.size).toBe(0);
    expect(tree.getAll()).toEqual([]);
  });

  test('deletes the named one of identical intervals, and keeps the others intact', () => {
    const tree = new IntervalTree<string>();
    for (let i = 0; i < 10; i++) tree.insert({ start: i % 3, end: 50, data: `d${i}` });
    const deleted = [0, 3, 6, 9, 1].map((i) => tree.delete({ start: i % 3, end: 50 }, (d) => d === `d${i}`));
    expect(deleted.every(Boolean)).toBe(true);
    expect(ids(tree.getAll())).toEqual(['d2', 'd4', 'd5', 'd7', 'd8']);
    expect(ids(tree.query({ start: 40, end: 41 }))).toEqual(['d2', 'd4', 'd5', 'd7', 'd8']);
  });

  test('NEGATIVE: deleting what is not there reports false and changes nothing', () => {
    const tree = new IntervalTree<string>();
    tree.insert({ start: 0, end: 5, data: 'x' });
    expect(tree.delete({ start: 1, end: 5 })).toBe(false);
    expect(tree.size).toBe(1);
  });
});
