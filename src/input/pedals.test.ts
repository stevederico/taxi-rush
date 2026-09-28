import { describe, expect, it } from 'vitest';
import { pedals } from './pedals.ts';

describe('pedals', () => {
  it('is full throttle on gas alone', () => {
    expect(pedals(1, 0)).toBe(1);
  });

  it('brakes on brake alone', () => {
    expect(pedals(0, 1)).toBe(-1);
  });

  it('brakes when both are held', () => {
    expect(pedals(1, 1)).toBe(-1);
  });

  it('follows a light brake over full gas', () => {
    expect(pedals(1, 0.3)).toBe(-0.3);
  });

  it('is idle with neither', () => {
    expect(pedals(0, 0)).toBe(0);
  });
});
