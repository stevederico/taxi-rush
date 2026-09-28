import { GRID_BLOCKS } from './constants.ts';
import { laneShift } from './ramps.ts';
import { nearestRoad, roadCenter } from './roads.ts';
import type { Rng } from './rng.ts';

const STRAIGHT_CHANCE = 0.6;
const TURN_MARGIN = 0.5;
const STRAIGHT_OVERSHOOT = 1;

export type TurnKind = 'straight' | 'left' | 'right';

/** What a traffic car will do at the next crossing, and where along its road. */
export interface Turn {
  kind: TurnKind;
  /** World coordinate along the current direction of travel. */
  at: number;
  /** Index of the crossing road. */
  road: number;
}

/** The parts of a car that route planning needs. */
export interface Mover {
  x: number;
  z: number;
  dirX: number;
  dirZ: number;
  lane: number;
}

function isRoadIndex(index: number): boolean {
  return index >= 0 && index <= GRID_BLOCKS;
}

/** Index of the first crossing road far enough ahead to still turn at, or -1. */
function roadAhead(coord: number, sign: number, lane: number): number {
  const start = sign > 0 ? 0 : GRID_BLOCKS;
  for (let road = start; isRoadIndex(road); road += sign) {
    if (sign * (roadCenter(road) - coord) > lane + TURN_MARGIN) return road;
  }
  return -1;
}

function turnDirection(car: Mover, kind: TurnKind): { dirX: number; dirZ: number } {
  if (kind === 'right') return { dirX: -car.dirZ, dirZ: car.dirX };
  if (kind === 'left') return { dirX: car.dirZ, dirZ: -car.dirX };
  return { dirX: car.dirX, dirZ: car.dirZ };
}

function isAllowed(car: Mover, kind: TurnKind, road: number, ownRoad: number): boolean {
  const sign = car.dirX + car.dirZ;
  if (kind === 'straight') return isRoadIndex(road + sign);
  const dir = turnDirection(car, kind);
  return isRoadIndex(ownRoad + dir.dirX + dir.dirZ);
}

function turnPoint(car: Mover, kind: TurnKind, road: number): number {
  const sign = car.dirX + car.dirZ;
  if (kind === 'straight') return roadCenter(road) + sign * (car.lane + STRAIGHT_OVERSHOOT);
  const dir = turnDirection(car, kind);
  const shift = laneShift(dir.dirX, dir.dirZ, car.lane);
  return roadCenter(road) + (car.dirZ !== 0 ? shift.z : shift.x);
}

function chooseKind(car: Mover, rng: Rng, road: number, ownRoad: number, mustTurn: boolean): TurnKind {
  const canGoStraight = !mustTurn && isAllowed(car, 'straight', road, ownRoad);
  const turns = (['left', 'right'] as const).filter((k) => isAllowed(car, k, road, ownRoad));
  if (canGoStraight && (turns.length === 0 || rng.chance(STRAIGHT_CHANCE))) return 'straight';
  return rng.pick(turns);
}

/** Pick what a traffic car does at the next crossing. It never drives off the map. */
export function planTurn(car: Mover, rng: Rng): Turn {
  const sign = car.dirX + car.dirZ;
  const coord = car.dirZ !== 0 ? car.z : car.x;
  const ownRoad = nearestRoad(car.dirZ !== 0 ? car.x : car.z);
  const found = roadAhead(coord, sign, car.lane);
  if (found >= 0) {
    const kind = chooseKind(car, rng, found, ownRoad, false);
    return { kind, at: turnPoint(car, kind, found), road: found };
  }
  const lastRoad = sign > 0 ? GRID_BLOCKS : 0;
  const kind = chooseKind(car, rng, lastRoad, ownRoad, true);
  return { kind, at: coord, road: lastRoad };
}
