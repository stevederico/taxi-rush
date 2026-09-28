import { beforeEach, describe, expect, it } from 'vitest';
import { COMBO_MAX, COMBO_WINDOW } from './constants.ts';
import {
  awardTip,
  breakCombo,
  createTipJar,
  driftTip,
  jumpTip,
  nearMissTips,
  tickCombo,
} from './tips.ts';
import type { Stunt, TipJar } from './tips.ts';

const DT = 1 / 60;
const cruising: Stunt = { x: 0, z: 0, speed: 30, slip: 0, grounded: true };
const sliding: Stunt = { ...cruising, slip: 14 };

let jar: TipJar;

beforeEach(() => {
  jar = createTipJar();
});

function hold(cab: Stunt, seconds: number) {
  for (let t = 0; t < seconds; t += DT) driftTip(jar, cab, DT);
}

describe('awardTip', () => {
  it('multiplies by the combo and raises it', () => {
    expect(awardTip(jar, 'jump', 10)).toEqual({ kind: 'jump', amount: 10, combo: 1 });
    expect(awardTip(jar, 'jump', 10)).toEqual({ kind: 'jump', amount: 20, combo: 2 });
    expect(jar.total).toBe(30);
  });

  it('caps the combo', () => {
    for (let i = 0; i < 20; i++) awardTip(jar, 'nearMiss', 1);
    expect(jar.combo).toBe(COMBO_MAX);
  });
});

describe('tickCombo', () => {
  it('keeps the combo inside the window', () => {
    awardTip(jar, 'jump', 10);
    tickCombo(jar, COMBO_WINDOW - 0.1);
    expect(jar.combo).toBe(2);
  });

  it('drops the combo when the window runs out', () => {
    awardTip(jar, 'jump', 10);
    tickCombo(jar, COMBO_WINDOW + 0.1);
    expect(jar.combo).toBe(1);
  });
});

describe('breakCombo', () => {
  it('resets the combo and says one was lost', () => {
    awardTip(jar, 'jump', 10);
    expect(breakCombo(jar)).toBe(true);
    expect(jar.combo).toBe(1);
  });

  it('says nothing was lost with no combo', () => {
    expect(breakCombo(jar)).toBe(false);
  });
});

describe('jumpTip', () => {
  it('ignores tiny hops', () => {
    expect(jumpTip(jar, 0.1)).toBeNull();
  });

  it('pays more for more air', () => {
    const small = jumpTip(createTipJar(), 0.5)!;
    const big = jumpTip(createTipJar(), 1.5)!;
    expect(big.amount).toBeGreaterThan(small.amount);
  });
});

describe('driftTip', () => {
  it('pays when a long slide ends', () => {
    hold(sliding, 1.5);
    const tip = driftTip(jar, cruising, DT);
    expect(tip?.kind).toBe('drift');
    expect(tip!.amount).toBeGreaterThan(5);
  });

  it('ignores a short twitch', () => {
    hold(sliding, 0.3);
    expect(driftTip(jar, cruising, DT)).toBeNull();
  });

  it('ignores sliding in the air', () => {
    hold({ ...sliding, grounded: false }, 2);
    expect(driftTip(jar, cruising, DT)).toBeNull();
  });
});

describe('nearMissTips', () => {
  const beside = { id: 1, x: 4, z: 0 };
  const behind = { id: 1, x: 4, z: -20 };

  it('pays once the cab pulls clear of a close pass', () => {
    expect(nearMissTips(jar, cruising, [beside])).toEqual([]);
    const tips = nearMissTips(jar, cruising, [behind]);
    expect(tips.map((t) => t.kind)).toEqual(['nearMiss']);
  });

  it('pays only once per pass', () => {
    nearMissTips(jar, cruising, [beside]);
    nearMissTips(jar, cruising, [behind]);
    expect(nearMissTips(jar, cruising, [behind])).toEqual([]);
  });

  it('ignores a slow crawl past traffic', () => {
    const crawling = { ...cruising, speed: 5 };
    nearMissTips(jar, crawling, [beside]);
    expect(nearMissTips(jar, crawling, [behind])).toEqual([]);
  });

  it('ignores traffic that was never close', () => {
    nearMissTips(jar, cruising, [{ id: 1, x: 12, z: 0 }]);
    expect(nearMissTips(jar, cruising, [behind])).toEqual([]);
  });

  it('pays nothing when the pass ends in a crash', () => {
    nearMissTips(jar, cruising, [beside]);
    breakCombo(jar);
    expect(nearMissTips(jar, cruising, [behind])).toEqual([]);
  });
});
