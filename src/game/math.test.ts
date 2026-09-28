import { describe, expect, it } from 'vitest';
import { approach, clamp, headingTo, wrapAngle } from './math.ts';

describe('clamp', () => {
  it('limits values to the range', () => {
    expect([clamp(-2, 0, 1), clamp(0.5, 0, 1), clamp(3, 0, 1)]).toEqual([0, 0.5, 1]);
  });
});

describe('approach', () => {
  it('moves toward the target without passing it', () => {
    expect([approach(0, 10, 3), approach(9, 10, 3), approach(5, 0, 10)]).toEqual([3, 10, 0]);
  });
});

describe('wrapAngle', () => {
  it('wraps into (-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2);
  });
});

describe('headingTo', () => {
  it('is 0 facing +z and a quarter turn facing +x', () => {
    expect(headingTo(0, 0, 0, 5)).toBeCloseTo(0);
    expect(headingTo(0, 0, 5, 0)).toBeCloseTo(Math.PI / 2);
  });
});
