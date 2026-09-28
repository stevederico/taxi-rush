import { isOnRoadAxis, nearestRoad, roadBelow, roadCenter } from './roads.ts';

export interface Point {
  x: number;
  z: number;
}

/** Crossing of a street (constant x) and an avenue (constant z), by road index. */
interface Crossing {
  street: number;
  avenue: number;
}

function toPoint(crossing: Crossing): Point {
  return { x: roadCenter(crossing.street), z: roadCenter(crossing.avenue) };
}

/** The road crossing a stretch that lies between a coordinate and a goal. */
function roadToward(coord: number, goal: number): number {
  const below = roadBelow(coord);
  return goal > coord ? below + 1 : below;
}

/** True when both points are on the same stretch of road between two crossings. */
function isSameStretch(from: Point, to: Point): boolean {
  const isStreet = isOnRoadAxis(from.x) && isOnRoadAxis(to.x) && nearestRoad(from.x) === nearestRoad(to.x);
  const isAvenue = isOnRoadAxis(from.z) && isOnRoadAxis(to.z) && nearestRoad(from.z) === nearestRoad(to.z);
  if (isStreet) return roadBelow(from.z) === roadBelow(to.z);
  return isAvenue && roadBelow(from.x) === roadBelow(to.x);
}

/** The crossing to head for first, staying on the road the car is already on. */
function firstCrossing(from: Point, to: Point): { crossing: Crossing; isOnStreet: boolean } {
  const isOnStreet = isOnRoadAxis(from.x);
  const isOnAvenue = isOnRoadAxis(from.z);
  if (isOnStreet && !isOnAvenue) {
    return { crossing: { street: nearestRoad(from.x), avenue: roadToward(from.z, to.z) }, isOnStreet };
  }
  if (isOnAvenue && !isOnStreet) {
    return { crossing: { street: roadToward(from.x, to.x), avenue: nearestRoad(from.z) }, isOnStreet };
  }
  return { crossing: { street: nearestRoad(from.x), avenue: nearestRoad(from.z) }, isOnStreet };
}

function isSame(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.z - b.z) < 1;
}

/**
 * Plan a drive along the street grid. The route starts where the car is,
 * follows roads with at most two turns, and ends at the goal.
 */
export function planRoute(from: Point, to: Point): Point[] {
  if (isSameStretch(from, to)) return [from, to];
  const { crossing: first, isOnStreet } = firstCrossing(from, to);
  const last: Crossing = { street: nearestRoad(to.x), avenue: nearestRoad(to.z) };
  const corner: Crossing = isOnStreet
    ? { street: first.street, avenue: last.avenue }
    : { street: last.street, avenue: first.avenue };
  const route = [from];
  for (const point of [toPoint(first), toPoint(corner), toPoint(last), to]) {
    if (!isSame(route.at(-1)!, point)) route.push(point);
  }
  return route;
}

/** Total length of a route. */
export function routeLength(route: readonly Point[]): number {
  let length = 0;
  for (let i = 1; i < route.length; i++) {
    length += Math.hypot(route[i]!.x - route[i - 1]!.x, route[i]!.z - route[i - 1]!.z);
  }
  return length;
}
