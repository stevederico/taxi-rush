import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('gives different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('keeps next() inside [0, 1)', () => {
    const rng = createRng(7);
    const values = Array.from({ length: 500 }, () => rng.next());
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('keeps int() inside its inclusive bounds', () => {
    const rng = createRng(9);
    const values = Array.from({ length: 500 }, () => rng.int(2, 5));
    expect(new Set(values)).toEqual(new Set([2, 3, 4, 5]));
  });

  it('throws when picking from an empty list', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
});
