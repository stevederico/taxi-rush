import { CAR_RADIUS, TRAFFIC_RADIUS, TRAFFIC_STUN_TIME } from './constants.ts';
import { circleCircleHit } from './collision.ts';
import type { Rng } from './rng.ts';
import type { TrafficCar } from './traffic.ts';
import type { Vehicle } from './vehicle.ts';

const PLAYER_KEEP = 0.72;
const SHOVE = 0.85;
const MIN_SHOVE = 4;
const MAX_SPIN = 5;
const HOP_HEIGHT = 1.2;
/** A car that is already sliding only counts again when hit this hard. */
const HARD_HIT = 10;

export interface Bump {
  carId: number;
  /** Closing speed between the two cars. */
  impact: number;
}

function shove(car: TrafficCar, player: Vehicle, nx: number, nz: number, rng: Rng): void {
  const push = Math.max(MIN_SHOVE, Math.hypot(player.vx, player.vz) * SHOVE);
  car.vx = player.vx * SHOVE - nx * push * 0.5;
  car.vz = player.vz * SHOVE - nz * push * 0.5;
  car.spin = rng.range(-MAX_SPIN, MAX_SPIN);
  car.stun = TRAFFIC_STUN_TIME;
  car.speed = 0;
}

/**
 * Knock traffic out of the way of the player's car. The player keeps most of
 * their speed, and the car that was hit slides off spinning.
 */
export function bumpTraffic(player: Vehicle, cars: TrafficCar[], rng: Rng): Bump[] {
  const bumps: Bump[] = [];
  for (const car of cars) {
    if (Math.abs(car.y - player.y) > HOP_HEIGHT) continue;
    const hit = circleCircleHit(player.x, player.z, CAR_RADIUS, car.x, car.z, TRAFFIC_RADIUS);
    if (!hit) continue;
    const closingX = player.vx - car.dirX * car.speed - car.vx;
    const closingZ = player.vz - car.dirZ * car.speed - car.vz;
    const impact = Math.max(0, -(closingX * hit.nx + closingZ * hit.nz));
    player.x += hit.nx * hit.depth;
    player.z += hit.nz * hit.depth;
    const isFreshHit = car.stun <= 0 || impact > HARD_HIT;
    shove(car, player, hit.nx, hit.nz, rng);
    if (!isFreshHit) continue;
    player.vx *= PLAYER_KEEP;
    player.vz *= PLAYER_KEEP;
    bumps.push({ carId: car.id, impact });
  }
  return bumps;
}
