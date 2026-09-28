import {
  GRID_BLOCKS,
  LANE_OFFSETS,
  TRAFFIC_COUNT,
  TRAFFIC_LOOKAHEAD,
  TRAFFIC_MAX_SPEED,
  TRAFFIC_MIN_SPEED,
  TRAFFIC_RADIUS,
  WORLD_HALF,
} from './constants.ts';
import { resolveSolids, stepVertical } from './body.ts';
import type { Body, World } from './body.ts';
import { approach } from './math.ts';
import { laneShift, surfaceAt } from './ramps.ts';
import { nearestRoad, roadCenter } from './roads.ts';
import type { Rng } from './rng.ts';
import { planTurn } from './trafficTurns.ts';
import type { Turn } from './trafficTurns.ts';

const ACCEL = 12;
const LANE_HALF = 2.6;
const STUN_FRICTION = 2.2;
const SPIN_FRICTION = 1.6;
const REJOIN_SPEED = 5;
const STUCK_LIMIT = 4;
const GHOST_TIME = 2;
const SPAWN_CLEARANCE = 40;
const PAINT_COUNT = 7;

export interface TrafficCar extends Body {
  id: number;
  heading: number;
  dirX: number;
  dirZ: number;
  lane: number;
  speed: number;
  cruise: number;
  /** Seconds left sliding after being hit. */
  stun: number;
  spin: number;
  stuck: number;
  ghost: number;
  paint: number;
  turn: Turn;
}

/** Something traffic should slow down for. */
export interface Blocker {
  x: number;
  z: number;
}

function spawnCar(id: number, rng: Rng, avoidX: number, avoidZ: number): TrafficCar {
  const isAlongZ = rng.chance(0.5);
  const sign = rng.chance(0.5) ? 1 : -1;
  const dirX = isAlongZ ? 0 : sign;
  const dirZ = isAlongZ ? sign : 0;
  const lane = rng.pick(LANE_OFFSETS);
  const shift = laneShift(dirX, dirZ, lane);
  const center = roadCenter(rng.int(0, GRID_BLOCKS));
  const along = rng.range(-WORLD_HALF + 30, WORLD_HALF - 30);
  const x = isAlongZ ? center + shift.x : along;
  const z = isAlongZ ? along : center + shift.z;
  if (Math.hypot(x - avoidX, z - avoidZ) < SPAWN_CLEARANCE) return spawnCar(id, rng, avoidX, avoidZ);
  const cruise = rng.range(TRAFFIC_MIN_SPEED, TRAFFIC_MAX_SPEED);
  const car: TrafficCar = {
    id, x, z, y: 0, vx: 0, vz: 0, vy: 0, grounded: true, airTime: 0, isLaunched: false,
    heading: Math.atan2(dirX, dirZ), dirX, dirZ, lane, speed: cruise, cruise,
    stun: 0, spin: 0, stuck: 0, ghost: 0, paint: rng.int(0, PAINT_COUNT - 1),
    turn: { kind: 'straight', at: 0, road: 0 },
  };
  car.turn = planTurn(car, rng);
  return car;
}

/** Fill the streets with cars, keeping the area around a point clear. */
export function createTraffic(rng: Rng, avoidX: number, avoidZ: number): TrafficCar[] {
  const cars: TrafficCar[] = [];
  for (let id = 0; id < TRAFFIC_COUNT; id++) cars.push(spawnCar(id, rng, avoidX, avoidZ));
  return cars;
}

function isAhead(car: TrafficCar, other: Blocker): boolean {
  const dx = other.x - car.x;
  const dz = other.z - car.z;
  const ahead = dx * car.dirX + dz * car.dirZ;
  const aside = Math.abs(dx * -car.dirZ + dz * car.dirX);
  return ahead > 0.5 && ahead < TRAFFIC_LOOKAHEAD && aside < LANE_HALF;
}

function isBlocked(car: TrafficCar, blockers: readonly Blocker[]): boolean {
  if (car.ghost > 0) return false;
  for (const other of blockers) {
    if (other !== car && isAhead(car, other)) return true;
  }
  return false;
}

function takeTurn(car: TrafficCar, rng: Rng): void {
  const { turn } = car;
  if (turn.kind !== 'straight') {
    const dirX = turn.kind === 'right' ? -car.dirZ : car.dirZ;
    const dirZ = turn.kind === 'right' ? car.dirX : -car.dirX;
    const shift = laneShift(dirX, dirZ, car.lane);
    if (dirX !== 0) car.z = roadCenter(turn.road) + shift.z;
    else car.x = roadCenter(turn.road) + shift.x;
    car.dirX = dirX;
    car.dirZ = dirZ;
    car.heading = Math.atan2(dirX, dirZ);
  }
  car.turn = planTurn(car, rng);
}

function cruiseAlong(car: TrafficCar, blockers: readonly Blocker[], rng: Rng, dt: number): void {
  const blocked = isBlocked(car, blockers);
  car.speed = approach(car.speed, blocked ? 0 : car.cruise, ACCEL * dt);
  car.stuck = car.speed < 0.5 ? car.stuck + dt : 0;
  car.ghost = Math.max(0, car.ghost - dt);
  if (car.stuck > STUCK_LIMIT) {
    car.ghost = GHOST_TIME;
    car.stuck = 0;
  }
  car.x += car.dirX * car.speed * dt;
  car.z += car.dirZ * car.speed * dt;
  rejoinLane(car, dt);
  const along = car.x * car.dirX + car.z * car.dirZ;
  const sign = car.dirX + car.dirZ;
  if (along >= car.turn.at * sign) takeTurn(car, rng);
}

/** Drift back to the lane line after being knocked off it. */
function rejoinLane(car: TrafficCar, dt: number): void {
  const shift = laneShift(car.dirX, car.dirZ, car.lane);
  if (car.dirZ !== 0) {
    const target = roadCenter(nearestRoad(car.x - shift.x)) + shift.x;
    car.x = approach(car.x, target, REJOIN_SPEED * dt);
  } else {
    const target = roadCenter(nearestRoad(car.z - shift.z)) + shift.z;
    car.z = approach(car.z, target, REJOIN_SPEED * dt);
  }
}

function slide(car: TrafficCar, world: World, rng: Rng, dt: number): void {
  car.stun -= dt;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
  car.heading += car.spin * dt;
  const fade = Math.exp(-STUN_FRICTION * dt);
  car.vx *= fade;
  car.vz *= fade;
  car.spin *= Math.exp(-SPIN_FRICTION * dt);
  resolveSolids(car, TRAFFIC_RADIUS, world);
  if (car.stun > 0) return;
  car.speed = 0;
  car.vx = 0;
  car.vz = 0;
  car.heading = Math.atan2(car.dirX, car.dirZ);
  car.turn = planTurn(car, rng);
}

/** Advance every traffic car by one time step. */
export function stepTraffic(
  cars: TrafficCar[],
  player: Blocker,
  world: World,
  rng: Rng,
  dt: number,
): void {
  const blockers: Blocker[] = [...cars, player];
  for (const car of cars) {
    if (car.stun > 0) slide(car, world, rng, dt);
    else cruiseAlong(car, blockers, rng, dt);
    const isSliding = car.stun > 0;
    const vx = isSliding ? car.vx : car.dirX * car.speed;
    const vz = isSliding ? car.vz : car.dirZ * car.speed;
    stepVertical(car, surfaceAt(world.ramps, car.x, car.z, vx, vz), dt);
  }
}
