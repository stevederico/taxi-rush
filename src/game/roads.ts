import { BLOCK_SIZE, GRID_BLOCKS, PITCH, ROAD_WIDTH, WORLD_HALF } from './constants.ts';

export const ROAD_COUNT = GRID_BLOCKS + 1;

const STREET_NAMES = ['Alder', 'Birch', 'Cedar', 'Dune', 'Elm', 'Fig', 'Grove', 'Harbor', 'Iris'];
const AVENUE_NAMES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

/** Center line coordinate of road number index (0 to GRID_BLOCKS). */
export function roadCenter(index: number): number {
  return -WORLD_HALF + ROAD_WIDTH / 2 + index * PITCH;
}

/** Lowest coordinate of block number index (0 to GRID_BLOCKS - 1). */
export function blockStart(index: number): number {
  return roadCenter(index) + ROAD_WIDTH / 2;
}

/** Middle coordinate of block number index. */
export function blockCenter(index: number): number {
  return blockStart(index) + BLOCK_SIZE / 2;
}

/** Index of the road whose center line is closest to a coordinate. */
export function nearestRoad(coord: number): number {
  const raw = Math.round((coord + WORLD_HALF - ROAD_WIDTH / 2) / PITCH);
  return Math.min(GRID_BLOCKS, Math.max(0, raw));
}

/** Index of the last road whose center line is at or below a coordinate. */
export function roadBelow(coord: number): number {
  const raw = Math.floor((coord + WORLD_HALF - ROAD_WIDTH / 2) / PITCH);
  return Math.min(GRID_BLOCKS - 1, Math.max(0, raw));
}

/** True when the coordinate lies inside the width of any road on that axis. */
export function isOnRoadAxis(coord: number): boolean {
  return Math.abs(coord - roadCenter(nearestRoad(coord))) <= ROAD_WIDTH / 2;
}

/** True when a ground point is on asphalt (either a street or an avenue). */
export function isOnRoad(x: number, z: number): boolean {
  return isOnRoadAxis(x) || isOnRoadAxis(z);
}

/** Name of the corner nearest to a ground point, such as "Cedar & 4th". */
export function cornerName(x: number, z: number): string {
  const street = STREET_NAMES[nearestRoad(x) % STREET_NAMES.length];
  const avenue = AVENUE_NAMES[nearestRoad(z) % AVENUE_NAMES.length];
  return `${street} & ${avenue}`;
}
