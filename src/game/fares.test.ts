import { beforeEach, describe, expect, it } from 'vitest';
import { PICKUP_RADIUS, WAITING_FARES } from './constants.ts';
import { generateCity } from './city.ts';
import {
  bonusScale,
  createFareBook,
  pickupBonus,
  ratingFor,
  refillFares,
  streetDistance,
  tickFare,
  tierFor,
  tryDropoff,
  tryPickup,
} from './fares.ts';
import type { Cab, FareBook } from './fares.ts';
import { createRng } from './rng.ts';

const { stops } = generateCity(11);
const parkedAt = (x: number, z: number): Cab => ({ x, z, speed: 0, grounded: true });

let book: FareBook;

beforeEach(() => {
  book = createFareBook();
  refillFares(book, stops, createRng(3), parkedAt(0, 0));
});

describe('refillFares', () => {
  it('stocks the streets', () => {
    expect(book.waiting).toHaveLength(WAITING_FARES);
  });

  it('keeps a couple of fares close to the cab', () => {
    const close = book.waiting.filter((f) => Math.hypot(f.from.x, f.from.z) < 190);
    expect(close.length).toBeGreaterThanOrEqual(2);
  });

  it('never starts and ends a trip at the same stop', () => {
    expect(book.waiting.every((f) => f.distance > 100)).toBe(true);
  });

  it('pays more for longer trips', () => {
    const sorted = [...book.waiting].sort((a, b) => a.distance - b.distance);
    expect(sorted.at(-1)!.pay).toBeGreaterThan(sorted[0]!.pay);
  });
});

describe('tryPickup', () => {
  it('picks up when stopped beside a fare', () => {
    const fare = book.waiting[0]!;
    expect(tryPickup(book, parkedAt(fare.from.x + 2, fare.from.z))).toBe(fare);
    expect(book.active?.clock).toBe(fare.limit);
    expect(book.waiting).not.toContain(fare);
  });

  it('ignores a cab that drives past without stopping', () => {
    const fare = book.waiting[0]!;
    expect(tryPickup(book, { ...parkedAt(fare.from.x, fare.from.z), speed: 20 })).toBeNull();
  });

  it('ignores a cab that is too far away', () => {
    const fare = book.waiting[0]!;
    expect(tryPickup(book, parkedAt(fare.from.x + PICKUP_RADIUS + 1, fare.from.z))).toBeNull();
  });

  it('ignores a cab that is in the air', () => {
    const fare = book.waiting[0]!;
    expect(tryPickup(book, { ...parkedAt(fare.from.x, fare.from.z), grounded: false })).toBeNull();
  });

  it('takes only one passenger at a time', () => {
    const [first, second] = book.waiting;
    tryPickup(book, parkedAt(first!.from.x, first!.from.z));
    expect(tryPickup(book, parkedAt(second!.from.x, second!.from.z))).toBeNull();
  });
});

describe('tryDropoff', () => {
  it('does nothing with no passenger', () => {
    expect(tryDropoff(book, parkedAt(0, 0))).toBeNull();
  });

  it('pays a speedy bonus for a quick trip', () => {
    const fare = book.waiting[0]!;
    tryPickup(book, parkedAt(fare.from.x, fare.from.z));
    const payout = tryDropoff(book, parkedAt(fare.to.x, fare.to.z))!;
    expect(payout.rating).toBe('speedy');
    expect(payout.pay).toBe(Math.round(fare.pay * 1.5));
    expect(book.delivered).toBe(1);
    expect(book.active).toBeNull();
  });

  it('pays the plain fare for a slow trip', () => {
    const fare = book.waiting[0]!;
    tryPickup(book, parkedAt(fare.from.x, fare.from.z));
    tickFare(book, fare.limit * 0.95);
    expect(tryDropoff(book, parkedAt(fare.to.x, fare.to.z))!.pay).toBe(fare.pay);
  });

  it('needs the cab to stop at the destination', () => {
    const fare = book.waiting[0]!;
    tryPickup(book, parkedAt(fare.from.x, fare.from.z));
    expect(tryDropoff(book, { ...parkedAt(fare.to.x, fare.to.z), speed: 12 })).toBeNull();
  });
});

describe('tickFare', () => {
  it('loses the passenger when their patience runs out', () => {
    const fare = book.waiting[0]!;
    tryPickup(book, parkedAt(fare.from.x, fare.from.z));
    expect(tickFare(book, fare.limit - 0.1)).toBeNull();
    expect(tickFare(book, 0.2)).toBe(fare);
    expect(book.active).toBeNull();
    expect(book.lost).toBe(1);
  });
});

describe('fare rules', () => {
  it('sorts trips into tiers by distance', () => {
    expect([tierFor(100), tierFor(300), tierFor(500)]).toEqual(['short', 'medium', 'long']);
  });

  it('rates a trip by how much patience is left', () => {
    expect([ratingFor(9, 10), ratingFor(3, 10), ratingFor(1, 10)]).toEqual([
      'speedy',
      'normal',
      'slow',
    ]);
  });

  it('measures distance along streets', () => {
    const a = { ...stops[0]!, x: 0, z: 0 };
    const b = { ...stops[0]!, x: 30, z: -40 };
    expect(streetDistance(a, b)).toBe(70);
  });

  it('shrinks time bonuses as the run goes on, down to a floor', () => {
    expect(bonusScale(0)).toBe(1);
    expect(bonusScale(5)).toBeCloseTo(0.8);
    expect(bonusScale(100)).toBe(0.45);
  });

  it('gives more pickup time for longer trips', () => {
    const [short, long] = [...book.waiting].sort((a, b) => a.distance - b.distance);
    expect(pickupBonus(long!, 0)).toBeGreaterThanOrEqual(pickupBonus(short!, 0));
  });
});
