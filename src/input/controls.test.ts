import { describe, expect, it } from 'vitest';
import { mergeInputs } from './controls.ts';

const idle = { throttle: 0, steer: 0, handbrake: false };

describe('mergeInputs', () => {
  it('is idle with no input', () => {
    expect(mergeInputs([idle, idle])).toEqual(idle);
  });

  it('takes the strongest push on each axis', () => {
    const keys = { throttle: 1, steer: 0, handbrake: false };
    const stick = { throttle: 0.2, steer: -0.6, handbrake: false };
    expect(mergeInputs([keys, stick])).toEqual({ throttle: 1, steer: -0.6, handbrake: false });
  });

  it('pulls the handbrake if any source does', () => {
    expect(mergeInputs([idle, { ...idle, handbrake: true }]).handbrake).toBe(true);
  });

  it('keeps values inside -1 to 1', () => {
    expect(mergeInputs([{ throttle: 3, steer: -4, handbrake: false }])).toEqual({
      throttle: 1,
      steer: -1,
      handbrake: false,
    });
  });

  it('brakes when one source brakes and another gives gas', () => {
    const keys = { throttle: 1, steer: 0, handbrake: false };
    const touch = { throttle: -1, steer: 0, handbrake: false };
    expect(mergeInputs([keys, touch]).throttle).toBe(-1);
    expect(mergeInputs([touch, keys]).throttle).toBe(-1);
  });
});
