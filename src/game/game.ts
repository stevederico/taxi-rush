import { CRASH_SPEED, LANE_OFFSETS, MAX_CLOCK, START_CLOCK } from './constants.ts';
import type { World } from './body.ts';
import { bumpTraffic } from './bumps.ts';
import { generateCity } from './city.ts';
import type { City } from './cityTypes.ts';
import { buildIndex } from './collision.ts';
import { createFareBook, pickupBonus, refillFares, tickFare, tryDropoff, tryPickup } from './fares.ts';
import type { Fare, FareBook, Payout } from './fares.ts';
import { blockCenter, roadCenter } from './roads.ts';
import { createRng } from './rng.ts';
import type { Rng } from './rng.ts';
import { breakCombo, createTipJar, driftTip, jumpTip, nearMissTips, tickCombo } from './tips.ts';
import type { Tip, TipJar } from './tips.ts';
import { createTraffic, stepTraffic } from './traffic.ts';
import type { TrafficCar } from './traffic.ts';
import { createVehicle, stepVehicle } from './vehicle.ts';
import type { DriveInput, Vehicle } from './vehicle.ts';

const SPAWN_ROAD = 4;
const SPAWN_BLOCK = 4;

export type GameEvent =
  | { type: 'pickup'; fare: Fare; bonus: number }
  | { type: 'dropoff'; payout: Payout }
  | { type: 'fareLost'; fare: Fare }
  | { type: 'tip'; tip: Tip }
  | { type: 'crash'; impact: number }
  | { type: 'bump'; impact: number; carId: number }
  | { type: 'land'; airTime: number }
  | { type: 'comboLost' }
  | { type: 'gameOver' };

export interface GameStats {
  fareCash: number;
  topSpeed: number;
  crashes: number;
  longestJump: number;
}

export interface Game {
  city: City;
  world: World;
  car: Vehicle;
  traffic: TrafficCar[];
  fares: FareBook;
  tips: TipJar;
  rng: Rng;
  clock: number;
  cash: number;
  elapsed: number;
  isOver: boolean;
  events: GameEvent[];
  stats: GameStats;
}

/**
 * Start a fresh run. The city seed fixes the map. The run seed fixes the
 * traffic and the fares, so the same pair always plays out the same way.
 */
export function createGame(citySeed: number, runSeed = citySeed): Game {
  const city = generateCity(citySeed);
  const rng = createRng(runSeed ^ 0x5eed);
  const car = createVehicle(roadCenter(SPAWN_ROAD) - LANE_OFFSETS[0]!, blockCenter(SPAWN_BLOCK), 0);
  const game: Game = {
    city,
    world: { ramps: city.ramps, index: buildIndex(city.obstacles) },
    car,
    traffic: createTraffic(rng, car.x, car.z),
    fares: createFareBook(),
    tips: createTipJar(),
    rng,
    clock: START_CLOCK,
    cash: 0,
    elapsed: 0,
    isOver: false,
    events: [],
    stats: { fareCash: 0, topSpeed: 0, crashes: 0, longestJump: 0 },
  };
  refillFares(game.fares, city.stops, rng, car);
  return game;
}

function addTime(game: Game, seconds: number): void {
  game.clock = Math.min(MAX_CLOCK, game.clock + seconds);
}

function payTips(game: Game, tips: ReadonlyArray<Tip | null>): void {
  for (const tip of tips) {
    if (!tip) continue;
    game.cash += tip.amount;
    game.events.push({ type: 'tip', tip });
  }
}

function handleCrashes(game: Game, wallImpact: number): void {
  const bumps = bumpTraffic(game.car, game.traffic, game.rng);
  for (const bump of bumps) game.events.push({ type: 'bump', ...bump });
  const isWallCrash = wallImpact > CRASH_SPEED;
  if (isWallCrash) game.events.push({ type: 'crash', impact: wallImpact });
  if (!isWallCrash && bumps.length === 0) return;
  game.stats.crashes++;
  if (breakCombo(game.tips)) game.events.push({ type: 'comboLost' });
}

function handleStunts(game: Game, landed: number, jump: number, dt: number): void {
  const { car, tips } = game;
  if (landed > 0) game.events.push({ type: 'land', airTime: landed });
  game.stats.longestJump = Math.max(game.stats.longestJump, jump);
  tickCombo(tips, dt);
  payTips(game, [jumpTip(tips, jump), driftTip(tips, car, dt)]);
  payTips(game, nearMissTips(tips, car, game.traffic));
}

function handleFares(game: Game, dt: number): void {
  const { fares, car } = game;
  const lost = tickFare(fares, dt);
  if (lost) game.events.push({ type: 'fareLost', fare: lost });
  const picked = tryPickup(fares, car);
  if (picked) {
    const bonus = pickupBonus(picked, fares.delivered);
    addTime(game, bonus);
    game.events.push({ type: 'pickup', fare: picked, bonus });
  }
  const payout = tryDropoff(fares, car);
  if (payout) {
    game.cash += payout.pay;
    game.stats.fareCash += payout.pay;
    addTime(game, payout.bonus);
    game.events.push({ type: 'dropoff', payout });
  }
  refillFares(fares, game.city.stops, game.rng, car);
}

/** Advance the whole game by one fixed time step. */
export function stepGame(game: Game, input: DriveInput, dt: number): void {
  if (game.isOver) return;
  const { impact, landed, jump } = stepVehicle(game.car, input, dt, game.world);
  stepTraffic(game.traffic, game.car, game.world, game.rng, dt);
  handleCrashes(game, impact);
  handleStunts(game, landed, jump, dt);
  handleFares(game, dt);
  game.stats.topSpeed = Math.max(game.stats.topSpeed, Math.abs(game.car.speed));
  game.elapsed += dt;
  game.clock -= dt;
  if (game.clock > 0) return;
  game.clock = 0;
  game.isOver = true;
  game.events.push({ type: 'gameOver' });
}

/** Take the events gathered since the last call. */
export function drainEvents(game: Game): GameEvent[] {
  const events = game.events;
  game.events = [];
  return events;
}
