import { ROAD_WIDTH, LANE_OFFSETS } from './constants.ts';
import { cornerName } from './roads.ts';
import type { Rng } from './rng.ts';
import type { Block, Ramp, Stop } from './cityTypes.ts';

const STOP_SLIDE = 18;
const CURB_INSET = 2;
const RAMP_CLEARANCE = 22;

/** Distance from a block's edge out to the middle of the curb lane. */
const CURB_LANE = ROAD_WIDTH / 2 - LANE_OFFSETS[1]!;

/** Outward directions for the four sides of a block. */
const SIDES: ReadonlyArray<{ nx: number; nz: number }> = [
  { nx: -1, nz: 0 },
  { nx: 1, nz: 0 },
  { nx: 0, nz: -1 },
  { nx: 0, nz: 1 },
];

function makeStop(rng: Rng, block: Block, nx: number, nz: number): Omit<Stop, 'id'> {
  const cx = (block.minX + block.maxX) / 2;
  const cz = (block.minZ + block.maxZ) / 2;
  const half = (block.maxX - block.minX) / 2;
  const slide = rng.range(-STOP_SLIDE, STOP_SLIDE);
  const edgeX = cx + nx * half + nz * slide;
  const edgeZ = cz + nz * half + nx * slide;
  const x = edgeX + nx * CURB_LANE;
  const z = edgeZ + nz * CURB_LANE;
  return {
    x,
    z,
    curbX: edgeX - nx * CURB_INSET,
    curbZ: edgeZ - nz * CURB_INSET,
    name: cornerName(x, z),
  };
}

/** One curb stop on each side of every block, skipping spots next to a ramp. */
export function placeStops(rng: Rng, blocks: readonly Block[], ramps: readonly Ramp[]): Stop[] {
  const stops: Stop[] = [];
  for (const block of blocks) {
    for (const side of SIDES) {
      const stop = makeStop(rng, block, side.nx, side.nz);
      const isBlocked = ramps.some(
        (r) => Math.hypot(r.x - stop.x, r.z - stop.z) < RAMP_CLEARANCE,
      );
      if (!isBlocked) stops.push({ ...stop, id: stops.length });
    }
  }
  return stops;
}
