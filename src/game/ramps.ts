import {
  GRID_BLOCKS,
  LANE_OFFSETS,
  RAMP_HEIGHT,
  RAMP_LENGTH,
  RAMP_WIDTH,
} from './constants.ts';
import { blockCenter, roadCenter } from './roads.ts';
import type { Rng } from './rng.ts';
import type { Ramp } from './cityTypes.ts';

const RAMP_COUNT = 14;
const MAX_TRIES = 200;
const MIN_RAMP_GAP = 60;

/** Middle of the two lanes that carry traffic in one direction. */
const LANE_MIDDLE = (LANE_OFFSETS[0]! + LANE_OFFSETS[1]!) / 2;

/**
 * Sideways shift from a road's center line to the lanes that travel along
 * (dirX, dirZ). Traffic keeps to the right.
 */
export function laneShift(dirX: number, dirZ: number, offset: number): { x: number; z: number } {
  return { x: -dirZ * offset, z: dirX * offset };
}

function makeRamp(rng: Rng): Ramp {
  const road = rng.int(1, GRID_BLOCKS - 1);
  const segment = rng.int(0, GRID_BLOCKS - 1);
  const sign = rng.chance(0.5) ? 1 : -1;
  const isAlongZ = rng.chance(0.5);
  const dirX = isAlongZ ? 0 : sign;
  const dirZ = isAlongZ ? sign : 0;
  const shift = laneShift(dirX, dirZ, LANE_MIDDLE);
  const along = blockCenter(segment) - (sign * RAMP_LENGTH) / 2;
  const x = isAlongZ ? roadCenter(road) + shift.x : along;
  const z = isAlongZ ? along : roadCenter(road) + shift.z;
  return { x, z, dirX, dirZ, length: RAMP_LENGTH, width: RAMP_WIDTH, height: RAMP_HEIGHT };
}

/** Scatter launch ramps over mid-block stretches of road. */
export function placeRamps(rng: Rng): Ramp[] {
  const ramps: Ramp[] = [];
  for (let tries = 0; tries < MAX_TRIES && ramps.length < RAMP_COUNT; tries++) {
    const ramp = makeRamp(rng);
    const isCrowded = ramps.some((r) => Math.hypot(r.x - ramp.x, r.z - ramp.z) < MIN_RAMP_GAP);
    if (!isCrowded) ramps.push(ramp);
  }
  return ramps;
}

/** Height of a ramp's surface under a ground point, or 0 when off the ramp. */
export function rampHeightAt(ramp: Ramp, x: number, z: number): number {
  const dx = x - ramp.x;
  const dz = z - ramp.z;
  const along = dx * ramp.dirX + dz * ramp.dirZ;
  const across = dx * -ramp.dirZ + dz * ramp.dirX;
  if (along < 0 || along > ramp.length) return 0;
  if (Math.abs(across) > ramp.width / 2) return 0;
  return (along / ramp.length) * ramp.height;
}

/** The drivable surface under a point, as seen by something moving across it. */
export interface Surface {
  height: number;
  /** How fast the surface rises under a mover with velocity (vx, vz). */
  rise: number;
}

/** Surface under a point for a mover with velocity (vx, vz). Flat ground is 0. */
export function surfaceAt(ramps: readonly Ramp[], x: number, z: number, vx: number, vz: number): Surface {
  let height = 0;
  let top: Ramp | null = null;
  for (const ramp of ramps) {
    const h = rampHeightAt(ramp, x, z);
    if (h > height) [height, top] = [h, ramp];
  }
  if (!top) return { height: 0, rise: 0 };
  const slope = top.height / top.length;
  return { height, rise: slope * (vx * top.dirX + vz * top.dirZ) };
}

/** Height of the drivable surface under a ground point. */
export function groundHeight(ramps: readonly Ramp[], x: number, z: number): number {
  return surfaceAt(ramps, x, z, 0, 0).height;
}
