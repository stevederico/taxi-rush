import { LANE_OFFSETS, MAX_SPEED, PICKUP_RADIUS } from './constants.ts';
import type { Game } from './game.ts';
import { clamp, headingTo, wrapAngle } from './math.ts';
import { planRoute } from './route.ts';
import type { Point } from './route.ts';
import type { DriveInput } from './vehicle.ts';

const LOOK_AHEAD = 13;
const NEXT_LEG_AT = 7;
const CORNER_RANGE = 42;
const CORNER_SPEED = 13;
const CRUISE_SPEED = MAX_SPEED * 0.8;
const STEER_GAIN = 2.6;
const SHARP_TURN = 0.7;
const STOP_RANGE = PICKUP_RADIUS * 0.45;
const BRAKE_RATE = 1.1;
const STUCK_AFTER = 1.2;
const BACK_UP_TIME = 1.1;
const REPLAN_DRIFT = 30;

/** A driver that follows the streets to the next fare or drop-off. */
export interface Autopilot {
  route: Point[];
  leg: number;
  goal: Point | null;
  stuck: number;
  backUp: number;
}

export function createAutopilot(): Autopilot {
  return { route: [], leg: 0, goal: null, stuck: 0, backUp: 0 };
}

/** Where the cab should go right now: the drop-off, or the nearest waiting fare. */
export function currentGoal(game: Game): Point | null {
  const { car, fares } = game;
  if (fares.active) return fares.active.fare.to;
  let best: Point | null = null;
  let bestGap = Infinity;
  for (const fare of fares.waiting) {
    const gap = Math.abs(fare.from.x - car.x) + Math.abs(fare.from.z - car.z);
    if (gap < bestGap) [best, bestGap] = [fare.from, gap];
  }
  return best;
}

interface Leg {
  dirX: number;
  dirZ: number;
  length: number;
  /** How far along the leg the car is. */
  done: number;
  /** How far the car is from the leg's line. */
  off: number;
}

function measureLeg(pilot: Autopilot, car: Point, index: number): Leg {
  const a = pilot.route[index]!;
  const b = pilot.route[index + 1]!;
  const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const dirX = (b.x - a.x) / length;
  const dirZ = (b.z - a.z) / length;
  const done = clamp((car.x - a.x) * dirX + (car.z - a.z) * dirZ, 0, length);
  const off = Math.abs((car.x - a.x) * -dirZ + (car.z - a.z) * dirX);
  return { dirX, dirZ, length, done, off };
}

/** Point on a leg, shifted into the right-hand lane unless it is the last leg. */
function pointOn(pilot: Autopilot, index: number, leg: Leg, along: number): Point {
  const a = pilot.route[index]!;
  const isLast = index === pilot.route.length - 2;
  const shift = isLast ? 0 : LANE_OFFSETS[0]!;
  return {
    x: a.x + leg.dirX * along - leg.dirZ * shift,
    z: a.z + leg.dirZ * along + leg.dirX * shift,
  };
}

function aimPoint(pilot: Autopilot, car: Point, leg: Leg): Point {
  const left = leg.length - leg.done;
  const hasNext = pilot.leg < pilot.route.length - 2;
  if (left >= LOOK_AHEAD || !hasNext) {
    return pointOn(pilot, pilot.leg, leg, Math.min(leg.length, leg.done + LOOK_AHEAD));
  }
  const next = measureLeg(pilot, car, pilot.leg + 1);
  return pointOn(pilot, pilot.leg + 1, next, Math.min(next.length, LOOK_AHEAD - left));
}

function wantedSpeed(pilot: Autopilot, leg: Leg, turn: number, goalGap: number): number {
  const isLastLeg = pilot.leg >= pilot.route.length - 2;
  const left = leg.length - leg.done;
  let speed = CRUISE_SPEED;
  if (!isLastLeg && left < CORNER_RANGE) speed = CORNER_SPEED + (left / CORNER_RANGE) * 12;
  if (Math.abs(turn) > SHARP_TURN) speed = Math.min(speed, CORNER_SPEED * 0.7);
  if (isLastLeg) speed = Math.min(speed, Math.max(0, (goalGap - STOP_RANGE) * BRAKE_RATE));
  return speed;
}

function replan(pilot: Autopilot, car: Point, goal: Point): void {
  pilot.route = planRoute({ x: car.x, z: car.z }, goal);
  pilot.leg = 0;
  pilot.goal = goal;
}

function backingUp(pilot: Autopilot, game: Game, wanted: number, dt: number): boolean {
  const isStalled = wanted > 3 && Math.abs(game.car.speed) < 1;
  pilot.stuck = isStalled ? pilot.stuck + dt : 0;
  if (pilot.stuck > STUCK_AFTER) {
    pilot.stuck = 0;
    pilot.backUp = BACK_UP_TIME;
  }
  pilot.backUp = Math.max(0, pilot.backUp - dt);
  return pilot.backUp > 0;
}

/** Decide the controls for this step. */
export function steerAutopilot(pilot: Autopilot, game: Game, dt: number): DriveInput {
  const { car } = game;
  const goal = currentGoal(game);
  if (!goal) return { throttle: 0, steer: 0, handbrake: false };
  if (pilot.goal !== goal) replan(pilot, car, goal);
  let leg = measureLeg(pilot, car, pilot.leg);
  if (leg.off > REPLAN_DRIFT) {
    replan(pilot, car, goal);
    leg = measureLeg(pilot, car, pilot.leg);
  }
  if (leg.length - leg.done < NEXT_LEG_AT && pilot.leg < pilot.route.length - 2) {
    pilot.leg++;
    leg = measureLeg(pilot, car, pilot.leg);
  }
  const aim = aimPoint(pilot, car, leg);
  const turn = wrapAngle(headingTo(car.x, car.z, aim.x, aim.z) - car.heading);
  const goalGap = Math.hypot(goal.x - car.x, goal.z - car.z);
  const wanted = wantedSpeed(pilot, leg, turn, goalGap);
  if (backingUp(pilot, game, wanted, dt)) {
    return { throttle: -1, steer: clamp(turn * STEER_GAIN, -1, 1), handbrake: false };
  }
  const gap = wanted - car.speed;
  const throttle = gap > 0 ? clamp(gap * 0.5, 0.2, 1) : gap < -3 ? -1 : 0;
  return { throttle, steer: clamp(-turn * STEER_GAIN, -1, 1), handbrake: false };
}
