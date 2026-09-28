/** Seeded random number source, so a city or a test run can be repeated. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Random element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** True with the given probability. */
  chance(probability: number): boolean;
}

const UINT32 = 4294967296;

/** Create a mulberry32 generator from an integer seed. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
  const range = (min: number, max: number): number => min + next() * (max - min);
  const int = (min: number, max: number): number => Math.floor(range(min, max + 1));
  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick() needs a non-empty list');
    return items[Math.floor(next() * items.length)] as T;
  };
  const chance = (probability: number): boolean => next() < probability;
  return { next, range, int, pick, chance };
}
