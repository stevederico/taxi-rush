import { describe, expect, it } from 'vitest';
import { MAX_SPEED } from '../game/constants.ts';
import { engineHz } from './engine.ts';

describe('engineHz', () => {
  it('idles low when parked', () => {
    expect(engineHz(0)).toBe(46);
  });

  it('rises with speed inside a gear', () => {
    expect(engineHz(6)).toBeGreaterThan(engineHz(2));
  });

  it('drops revs at a gear change', () => {
    const gearSpan = MAX_SPEED / 5;
    expect(engineHz(gearSpan + 0.1)).toBeLessThan(engineHz(gearSpan - 0.1));
  });

  it('sounds the same in reverse as forward', () => {
    expect(engineHz(-8)).toBe(engineHz(8));
  });

  it('stays in a sane range at any speed', () => {
    const notes = [0, 10, 25, MAX_SPEED, MAX_SPEED * 3].map(engineHz);
    expect(notes.every((hz) => hz >= 46 && hz < 200)).toBe(true);
  });
});
