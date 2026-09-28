import { describe, expect, it } from 'vitest';
import { CENTER, clearSpot } from './clearSpot.ts';

describe('clearSpot', () => {
  it('uses the strip beside a centered card on a wide screen', () => {
    const card = { left: 410, right: 870, top: 110, bottom: 610 };
    const spot = clearSpot(card, 1280, 720);
    expect(spot.x * 1280).toBeCloseTo(205);
    expect(spot.x * 1280).toBeLessThan(card.left);
  });

  it('uses the strip below the card on a tall screen', () => {
    const card = { left: 16, right: 374, top: 150, bottom: 700 };
    const spot = clearSpot(card, 390, 844);
    expect(spot.x).toBe(0.5);
    expect(spot.y * 844).toBeCloseTo(772);
  });

  it('picks the wider side when the card is off center', () => {
    const card = { left: 100, right: 500, top: 50, bottom: 650 };
    expect(clearSpot(card, 1280, 720).x * 1280).toBeCloseTo(890);
  });

  it('falls back to the middle when the card fills the screen', () => {
    const card = { left: 16, right: 374, top: 20, bottom: 820 };
    expect(clearSpot(card, 390, 844)).toEqual(CENTER);
  });
});
