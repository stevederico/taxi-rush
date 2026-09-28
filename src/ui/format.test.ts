import { describe, expect, it } from 'vitest';
import { formatCash, formatClock, formatSpeed, formatTime } from './format.ts';

describe('formatCash', () => {
  it('adds thousands separators', () => {
    expect(formatCash(1250)).toBe('1,250');
  });

  it('rounds to whole dollars', () => {
    expect(formatCash(19.6)).toBe('20');
  });
});

describe('formatSpeed', () => {
  it('converts to km/h', () => {
    expect(formatSpeed(10)).toBe('36');
  });

  it('shows reverse as a positive speed', () => {
    expect(formatSpeed(-10)).toBe('36');
  });
});

describe('formatTime', () => {
  it('pads seconds', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('never goes negative', () => {
    expect(formatTime(-3)).toBe('0:00');
  });
});

describe('formatClock', () => {
  it('rounds up so the last second still shows 1', () => {
    expect(formatClock(0.2)).toBe('1');
  });

  it('shows 0 when time is out', () => {
    expect(formatClock(0)).toBe('0');
  });
});
