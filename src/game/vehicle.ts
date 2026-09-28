import {
  BRAKE_DECEL,
  CAR_RADIUS,
  COAST_DRAG,
  DRIFT_GRIP,
  DRIFT_TURN_BOOST,
  ENGINE_ACCEL,
  GRIP,
  MAX_REVERSE,
  MAX_SPEED,
  MAX_TURN_RATE,
  STEER_RESPONSE,
  STEP_HEIGHT,
  WALL_RESTITUTION,
} from './constants.ts';
import { resolveSolids, stepVertical } from './body.ts';
import type { Body, World } from './body.ts';
import { approach, clamp, wrapAngle } from './math.ts';
import { groundHeight, surfaceAt } from './ramps.ts';

const FULL_STEER_SPEED = 6;
const STEER_FADE_SPEED = 45;
const AIR_STEER = 0.25;
const HANDBRAKE_DECEL = 9;
const ROLLING_DECEL = 3;

/** What the driver is asking for this step. */
export interface DriveInput {
  /** -1 (brake or reverse) to 1 (full throttle). */
  throttle: number;
  /** -1 (left) to 1 (right). */
  steer: number;
  handbrake: boolean;
}

export interface Vehicle extends Body {
  /** Radians. 0 faces +z, growing counter-clockwise seen from above. */
  heading: number;
  /** Smoothed steering position, -1 to 1. */
  steer: number;
  /** Speed along the nose of the car. Negative in reverse. */
  speed: number;
  /** Sideways sliding speed. */
  slip: number;
}

export interface VehicleStep {
  /** Hardest hit against something solid this step. */
  impact: number;
  /** Air time of any fall or jump that ended this step, otherwise 0. */
  landed: number;
  /** Air time if that flight was a launch off a ramp, otherwise 0. */
  jump: number;
}

/** A parked car at a point, facing a heading. */
export function createVehicle(x: number, z: number, heading: number): Vehicle {
  return {
    x,
    z,
    y: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    grounded: true,
    airTime: 0,
    isLaunched: false,
    heading,
    steer: 0,
    speed: 0,
    slip: 0,
  };
}

function turnRate(speed: number, isDrifting: boolean): number {
  const bite = clamp(Math.abs(speed) / FULL_STEER_SPEED, 0, 1);
  const fade = 1 / (1 + Math.abs(speed) / STEER_FADE_SPEED);
  const boost = isDrifting ? DRIFT_TURN_BOOST : 1;
  return MAX_TURN_RATE * bite * fade * boost * Math.sign(speed);
}

function drive(speed: number, input: DriveInput, dt: number): number {
  let next = speed;
  if (input.throttle > 0) {
    next += ENGINE_ACCEL * input.throttle * (1 - Math.max(0, speed) / MAX_SPEED) * dt;
  } else if (input.throttle < 0 && speed > 0.5) {
    next = Math.max(0, speed + BRAKE_DECEL * input.throttle * dt);
  } else if (input.throttle < 0) {
    next += ENGINE_ACCEL * 0.6 * input.throttle * (1 - Math.max(0, -speed) / MAX_REVERSE) * dt;
  }
  if (input.handbrake) next = approach(next, 0, HANDBRAKE_DECEL * dt);
  next -= next * COAST_DRAG * dt;
  if (input.throttle === 0) next = approach(next, 0, ROLLING_DECEL * dt);
  return next;
}

function steerAndDrive(car: Vehicle, input: DriveInput, dt: number): void {
  const authority = car.grounded ? 1 : AIR_STEER;
  car.heading = wrapAngle(
    car.heading - car.steer * turnRate(car.speed, input.handbrake) * authority * dt,
  );
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  let forward = car.vx * fx + car.vz * fz;
  let side = car.vx * -fz + car.vz * fx;
  if (car.grounded) {
    forward = drive(forward, input, dt);
    side *= Math.exp(-(input.handbrake ? DRIFT_GRIP : GRIP) * dt);
  }
  car.vx = fx * forward - fz * side;
  car.vz = fz * forward + fx * side;
}

/** Ramps are solid from the back and sides. Returns the impact if one blocks the move. */
function blockedByStep(car: Vehicle, world: World, fromX: number, fromZ: number): number {
  const rise = groundHeight(world.ramps, car.x, car.z) - car.y;
  if (rise <= STEP_HEIGHT) return 0;
  const impact = Math.hypot(car.vx, car.vz);
  car.x = fromX;
  car.z = fromZ;
  car.vx *= -WALL_RESTITUTION;
  car.vz *= -WALL_RESTITUTION;
  return impact;
}

function measure(car: Vehicle): void {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  car.speed = car.vx * fx + car.vz * fz;
  car.slip = car.vx * -fz + car.vz * fx;
}

/** Advance the player's car by one time step. */
export function stepVehicle(car: Vehicle, input: DriveInput, dt: number, world: World): VehicleStep {
  car.steer = approach(car.steer, clamp(input.steer, -1, 1), STEER_RESPONSE * dt);
  steerAndDrive(car, input, dt);
  const fromX = car.x;
  const fromZ = car.z;
  car.x += car.vx * dt;
  car.z += car.vz * dt;
  const stepImpact = blockedByStep(car, world, fromX, fromZ);
  const wallImpact = resolveSolids(car, CAR_RADIUS, world);
  const landing = stepVertical(car, surfaceAt(world.ramps, car.x, car.z, car.vx, car.vz), dt);
  measure(car);
  return {
    impact: Math.max(stepImpact, wallImpact),
    landed: landing?.airTime ?? 0,
    jump: landing?.isJump ? landing.airTime : 0,
  };
}
