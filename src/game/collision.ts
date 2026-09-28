import type { Box } from './cityTypes.ts';

const DEFAULT_CELL = 32;
const KEY_SPAN = 4096;

/** Boxes bucketed on a coarse grid so lookups only touch what is close. */
export interface SpatialIndex {
  cellSize: number;
  cells: Map<number, Box[]>;
}

/** Result of a circle overlapping something solid. Normal points away from it. */
export interface Hit {
  nx: number;
  nz: number;
  depth: number;
}

function cellKey(cx: number, cz: number): number {
  return (cx + KEY_SPAN) * KEY_SPAN * 2 + (cz + KEY_SPAN);
}

/** Bucket boxes for fast neighborhood queries. */
export function buildIndex(boxes: readonly Box[], cellSize = DEFAULT_CELL): SpatialIndex {
  const cells = new Map<number, Box[]>();
  for (const box of boxes) {
    const x0 = Math.floor(box.minX / cellSize);
    const x1 = Math.floor(box.maxX / cellSize);
    const z0 = Math.floor(box.minZ / cellSize);
    const z1 = Math.floor(box.maxZ / cellSize);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const key = cellKey(cx, cz);
        const bucket = cells.get(key);
        if (bucket) bucket.push(box);
        else cells.set(key, [box]);
      }
    }
  }
  return { cellSize, cells };
}

/** All boxes whose cells touch a circle. May include boxes that do not overlap it. */
export function nearbyBoxes(index: SpatialIndex, x: number, z: number, radius: number): Box[] {
  const { cellSize, cells } = index;
  const found = new Set<Box>();
  const x0 = Math.floor((x - radius) / cellSize);
  const x1 = Math.floor((x + radius) / cellSize);
  const z0 = Math.floor((z - radius) / cellSize);
  const z1 = Math.floor((z + radius) / cellSize);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cz = z0; cz <= z1; cz++) {
      const bucket = cells.get(cellKey(cx, cz));
      if (bucket) for (const box of bucket) found.add(box);
    }
  }
  return [...found];
}

function hitFromInside(x: number, z: number, radius: number, box: Box): Hit {
  const toMinX = x - box.minX;
  const toMaxX = box.maxX - x;
  const toMinZ = z - box.minZ;
  const toMaxZ = box.maxZ - z;
  const least = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
  if (least === toMinX) return { nx: -1, nz: 0, depth: toMinX + radius };
  if (least === toMaxX) return { nx: 1, nz: 0, depth: toMaxX + radius };
  if (least === toMinZ) return { nx: 0, nz: -1, depth: toMinZ + radius };
  return { nx: 0, nz: 1, depth: toMaxZ + radius };
}

/** Overlap between a circle and a box, or null when they are apart. */
export function circleBoxHit(x: number, z: number, radius: number, box: Box): Hit | null {
  const nearX = Math.min(box.maxX, Math.max(box.minX, x));
  const nearZ = Math.min(box.maxZ, Math.max(box.minZ, z));
  const dx = x - nearX;
  const dz = z - nearZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return null;
  if (distSq === 0) return hitFromInside(x, z, radius, box);
  const dist = Math.sqrt(distSq);
  return { nx: dx / dist, nz: dz / dist, depth: radius - dist };
}

/** Overlap between two circles, with the normal pointing from b toward a. */
export function circleCircleHit(
  ax: number,
  az: number,
  ar: number,
  bx: number,
  bz: number,
  br: number,
): Hit | null {
  const dx = ax - bx;
  const dz = az - bz;
  const dist = Math.hypot(dx, dz);
  const reach = ar + br;
  if (dist >= reach) return null;
  if (dist === 0) return { nx: 1, nz: 0, depth: reach };
  return { nx: dx / dist, nz: dz / dist, depth: reach - dist };
}
