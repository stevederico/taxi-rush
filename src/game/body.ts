import { GRAVITY, WALL_RESTITUTION, WORLD_HALF } from './constants.ts';
import { circleBoxHit, nearbyBoxes } from './collision.ts';
import type { Hit, SpatialIndex } from './collision.ts';
import type { Ramp } from './cityTypes.ts';
import type { Surface } from './ramps.ts';

const LIFT_OFF_SPEED = 1.5;
const LIFT_OFF_GAP = 0.35;
/** Upward speed at take-off that makes it a launch, not a roll off an edge. */
const LAUNCH_SPEED = 3;

/** Anything that moves over the ground and can leave it. */
export interface Body {
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  grounded: boolean;
  airTime: number;
  /** True while in the air after leaving a ramp going up. */
  isLaunched: boolean;
}

/** What happened on the step a body came back down. */
export interface Landing {
  airTime: number;
  /** True when the flight started as a launch off a ramp. */
  isJump: boolean;
}

/** The static parts of the world that bodies collide with. */
export interface World {
  ramps: readonly Ramp[];
  index: SpatialIndex;
}

/**
 * Push a body out along a hit normal and bounce its velocity.
 * Returns how fast it was moving into the surface.
 */
export function bounce(body: Body, hit: Hit, restitution = WALL_RESTITUTION): number {
  body.x += hit.nx * hit.depth;
  body.z += hit.nz * hit.depth;
  const into = -(body.vx * hit.nx + body.vz * hit.nz);
  if (into <= 0) return 0;
  body.vx += hit.nx * into * (1 + restitution);
  body.vz += hit.nz * into * (1 + restitution);
  return into;
}

function boundsHit(body: Body, radius: number): Hit | null {
  const limit = WORLD_HALF - radius;
  if (body.x > limit) return { nx: -1, nz: 0, depth: body.x - limit };
  if (body.x < -limit) return { nx: 1, nz: 0, depth: -limit - body.x };
  if (body.z > limit) return { nx: 0, nz: -1, depth: body.z - limit };
  if (body.z < -limit) return { nx: 0, nz: 1, depth: -limit - body.z };
  return null;
}

/** Keep a body out of buildings, trees and the edge of the map. Returns the hardest impact. */
export function resolveSolids(body: Body, radius: number, world: World): number {
  let impact = 0;
  for (const box of nearbyBoxes(world.index, body.x, body.z, radius)) {
    const hit = circleBoxHit(body.x, body.z, radius, box);
    if (hit) impact = Math.max(impact, bounce(body, hit));
  }
  const edge = boundsHit(body, radius);
  if (edge) impact = Math.max(impact, bounce(body, edge));
  return impact;
}

function stepGrounded(body: Body, surface: Surface): void {
  const gap = body.y - surface.height;
  const isLeaving = gap > 0 && (body.vy > LIFT_OFF_SPEED || gap > LIFT_OFF_GAP);
  if (isLeaving) {
    body.grounded = false;
    body.airTime = 0;
    body.isLaunched = body.vy > LAUNCH_SPEED;
    return;
  }
  // Upward speed comes from the slope, never from how far the body was
  // lifted this step. Popping up onto the side of a ramp is a curb, not a launch.
  body.vy = surface.rise;
  body.y = surface.height;
}

/**
 * Follow the ground, take off when it falls away, and land again.
 * Returns the landing on the step the body comes down, otherwise null.
 */
export function stepVertical(body: Body, surface: Surface, dt: number): Landing | null {
  if (body.grounded) {
    stepGrounded(body, surface);
    return null;
  }
  body.airTime += dt;
  body.vy -= GRAVITY * dt;
  body.y += body.vy * dt;
  if (body.y > surface.height) return null;
  const landing = { airTime: body.airTime, isJump: body.isLaunched };
  body.y = surface.height;
  body.vy = 0;
  body.grounded = true;
  body.airTime = 0;
  body.isLaunched = false;
  return landing;
}
