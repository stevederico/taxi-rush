import {
  COMBO_MAX,
  COMBO_WINDOW,
  DRIFT_MIN_SLIP,
  DRIFT_MIN_TIME,
  DRIFT_TIP_RATE,
  JUMP_MIN_AIR,
  JUMP_TIP_RATE,
  NEAR_MISS_DIST,
  NEAR_MISS_SPEED,
  NEAR_MISS_TIP,
} from './constants.ts';

const NEAR_MISS_EXIT = 1.5;
const DRIFT_MIN_SPEED = 10;
const MAX_DRIFT_PAID = 4;

export type TipKind = 'nearMiss' | 'jump' | 'drift';

export interface Tip {
  kind: TipKind;
  amount: number;
  /** Multiplier that was applied to this tip. */
  combo: number;
}

export interface TipJar {
  /** Multiplier the next tip will get. */
  combo: number;
  comboTimer: number;
  driftTime: number;
  total: number;
  count: number;
  bestCombo: number;
  /** Traffic car ids the cab is currently squeezing past. */
  armed: Set<number>;
}

/** A traffic car as the tip rules see it. */
export interface Passer {
  id: number;
  x: number;
  z: number;
}

/** The cab as the tip rules see it. */
export interface Stunt {
  x: number;
  z: number;
  speed: number;
  slip: number;
  grounded: boolean;
}

export function createTipJar(): TipJar {
  return {
    combo: 1,
    comboTimer: 0,
    driftTime: 0,
    total: 0,
    count: 0,
    bestCombo: 1,
    armed: new Set(),
  };
}

/** Pay a tip at the current multiplier and raise the multiplier for the next one. */
export function awardTip(jar: TipJar, kind: TipKind, base: number): Tip {
  const combo = jar.combo;
  const amount = Math.max(1, Math.round(base * combo));
  jar.total += amount;
  jar.count++;
  jar.bestCombo = Math.max(jar.bestCombo, combo);
  jar.combo = Math.min(COMBO_MAX, combo + 1);
  jar.comboTimer = COMBO_WINDOW;
  return { kind, amount, combo };
}

/** A crash throws the multiplier away. Returns true if there was one to lose. */
export function breakCombo(jar: TipJar): boolean {
  const hadCombo = jar.combo > 1;
  jar.combo = 1;
  jar.comboTimer = 0;
  jar.driftTime = 0;
  jar.armed.clear();
  return hadCombo;
}

/** Let the multiplier lapse when no tip lands inside the window. */
export function tickCombo(jar: TipJar, dt: number): void {
  if (jar.comboTimer <= 0) return;
  jar.comboTimer -= dt;
  if (jar.comboTimer <= 0) jar.combo = 1;
}

/** Tip for a jump that just landed, or null when it was too small to count. */
export function jumpTip(jar: TipJar, airTime: number): Tip | null {
  if (airTime < JUMP_MIN_AIR) return null;
  return awardTip(jar, 'jump', airTime * JUMP_TIP_RATE);
}

/** Track a slide and pay for it when it ends. */
export function driftTip(jar: TipJar, cab: Stunt, dt: number): Tip | null {
  const isSliding =
    cab.grounded && Math.abs(cab.slip) > DRIFT_MIN_SLIP && Math.abs(cab.speed) > DRIFT_MIN_SPEED;
  if (isSliding) {
    jar.driftTime += dt;
    return null;
  }
  const held = jar.driftTime;
  jar.driftTime = 0;
  if (held < DRIFT_MIN_TIME) return null;
  return awardTip(jar, 'drift', Math.min(held, MAX_DRIFT_PAID) * DRIFT_TIP_RATE);
}

/**
 * Pay for squeezing past traffic at speed. A pass arms when the cab gets close
 * and pays when it pulls clear. A crash clears every armed pass first.
 */
export function nearMissTips(jar: TipJar, cab: Stunt, cars: readonly Passer[]): Tip[] {
  const tips: Tip[] = [];
  const isFast = Math.abs(cab.speed) >= NEAR_MISS_SPEED;
  for (const car of cars) {
    const gap = Math.hypot(car.x - cab.x, car.z - cab.z);
    if (gap < NEAR_MISS_DIST && isFast) jar.armed.add(car.id);
    if (gap < NEAR_MISS_DIST + NEAR_MISS_EXIT || !jar.armed.has(car.id)) continue;
    jar.armed.delete(car.id);
    if (isFast) tips.push(awardTip(jar, 'nearMiss', NEAR_MISS_TIP));
  }
  return tips;
}
