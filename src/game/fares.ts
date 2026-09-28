import {
  DROPOFF_RADIUS,
  FARE_BASE,
  FARE_BUFFER,
  FARE_PACE,
  FARE_RATE,
  LONG_FARE,
  PICKUP_RADIUS,
  SHORT_FARE,
  STOP_SPEED,
  WAITING_FARES,
} from './constants.ts';
import type { Stop } from './cityTypes.ts';
import type { Rng } from './rng.ts';

const MIN_TRIP = 130;
const MAX_TRIP = 620;
const CLOSE_RANGE = 190;
const CLOSE_FARES = 2;
const SPAWN_TRIES = 40;
const MIN_SPAWN_GAP = 30;
const SPEEDY_LEFT = 0.45;
const NORMAL_LEFT = 0.15;
const PICKUP_BASE_BONUS = 3;
const PICKUP_BONUS_PER_UNIT = 1 / 45;
const BONUS_DECAY = 0.04;
const BONUS_FLOOR = 0.45;

export type FareTier = 'short' | 'medium' | 'long';
export type Rating = 'speedy' | 'normal' | 'slow';

export interface Fare {
  id: number;
  from: Stop;
  to: Stop;
  /** Street distance of the trip. */
  distance: number;
  tier: FareTier;
  pay: number;
  /** Seconds allowed for the trip. */
  limit: number;
  /** Index into the renderer's outfit palette. */
  look: number;
}

export interface ActiveFare {
  fare: Fare;
  clock: number;
}

export interface FareBook {
  waiting: Fare[];
  active: ActiveFare | null;
  nextId: number;
  delivered: number;
  lost: number;
}

export interface Payout {
  fare: Fare;
  rating: Rating;
  pay: number;
  bonus: number;
}

/** Where the taxi is and how fast it is going. */
export interface Cab {
  x: number;
  z: number;
  speed: number;
  grounded: boolean;
}

export const RATING_BONUS: Record<Rating, number> = { speedy: 6, normal: 3, slow: 1 };
export const RATING_PAY: Record<Rating, number> = { speedy: 1.5, normal: 1.15, slow: 1 };

export function createFareBook(): FareBook {
  return { waiting: [], active: null, nextId: 1, delivered: 0, lost: 0 };
}

/** Distance by street, since the city is a grid. */
export function streetDistance(a: Stop, b: Stop): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

export function tierFor(distance: number): FareTier {
  if (distance < SHORT_FARE) return 'short';
  return distance < LONG_FARE ? 'medium' : 'long';
}

/** Later fares give less extra time, so every run ends. */
export function bonusScale(delivered: number): number {
  return Math.max(BONUS_FLOOR, 1 - BONUS_DECAY * delivered);
}

export function pickupBonus(fare: Fare, delivered: number): number {
  return (PICKUP_BASE_BONUS + fare.distance * PICKUP_BONUS_PER_UNIT) * bonusScale(delivered);
}

export function ratingFor(clock: number, limit: number): Rating {
  const left = clock / limit;
  if (left > SPEEDY_LEFT) return 'speedy';
  return left > NORMAL_LEFT ? 'normal' : 'slow';
}

function makeFare(book: FareBook, from: Stop, to: Stop, rng: Rng): Fare {
  const distance = streetDistance(from, to);
  return {
    id: book.nextId++,
    from,
    to,
    distance,
    tier: tierFor(distance),
    pay: Math.round(FARE_BASE + distance * FARE_RATE),
    limit: distance / FARE_PACE + FARE_BUFFER,
    look: rng.int(0, 5),
  };
}

function isStopFree(book: FareBook, stop: Stop): boolean {
  return book.waiting.every((f) => Math.hypot(f.from.x - stop.x, f.from.z - stop.z) > MIN_SPAWN_GAP);
}

function spawnFare(book: FareBook, stops: readonly Stop[], rng: Rng, cab: Cab, close: boolean): void {
  for (let tries = 0; tries < SPAWN_TRIES; tries++) {
    const from = rng.pick(stops);
    const to = rng.pick(stops);
    const trip = streetDistance(from, to);
    const reach = Math.hypot(from.x - cab.x, from.z - cab.z);
    if (trip < MIN_TRIP || trip > MAX_TRIP) continue;
    if (close && reach > CLOSE_RANGE) continue;
    if (reach < PICKUP_RADIUS * 2 || !isStopFree(book, from)) continue;
    book.waiting.push(makeFare(book, from, to, rng));
    return;
  }
}

/** Keep the streets stocked with waiting fares, with a couple always near the cab. */
export function refillFares(book: FareBook, stops: readonly Stop[], rng: Rng, cab: Cab): void {
  const near = book.waiting.filter(
    (f) => Math.hypot(f.from.x - cab.x, f.from.z - cab.z) < CLOSE_RANGE,
  ).length;
  for (let i = near; i < CLOSE_FARES; i++) spawnFare(book, stops, rng, cab, true);
  for (let i = book.waiting.length; i < WAITING_FARES; i++) spawnFare(book, stops, rng, cab, false);
}

function isStoppedAt(cab: Cab, x: number, z: number, radius: number): boolean {
  if (!cab.grounded || Math.abs(cab.speed) > STOP_SPEED) return false;
  return Math.hypot(cab.x - x, cab.z - z) <= radius;
}

/** Pick up a waiting fare if the cab has stopped beside one. */
export function tryPickup(book: FareBook, cab: Cab): Fare | null {
  if (book.active) return null;
  const fare = book.waiting.find((f) => isStoppedAt(cab, f.from.x, f.from.z, PICKUP_RADIUS));
  if (!fare) return null;
  book.waiting = book.waiting.filter((f) => f !== fare);
  book.active = { fare, clock: fare.limit };
  return fare;
}

/** Drop the passenger off if the cab has stopped at the destination. */
export function tryDropoff(book: FareBook, cab: Cab): Payout | null {
  const { active } = book;
  if (!active) return null;
  if (!isStoppedAt(cab, active.fare.to.x, active.fare.to.z, DROPOFF_RADIUS)) return null;
  const rating = ratingFor(active.clock, active.fare.limit);
  const pay = Math.round(active.fare.pay * RATING_PAY[rating]);
  const bonus = RATING_BONUS[rating] * bonusScale(book.delivered);
  book.active = null;
  book.delivered++;
  return { fare: active.fare, rating, pay, bonus };
}

/** Run the passenger's patience down. Returns the fare if they give up and bail. */
export function tickFare(book: FareBook, dt: number): Fare | null {
  const { active } = book;
  if (!active) return null;
  active.clock -= dt;
  if (active.clock > 0) return null;
  book.active = null;
  book.lost++;
  return active.fare;
}
