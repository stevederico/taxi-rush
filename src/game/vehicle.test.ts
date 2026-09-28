import { describe, expect, it } from 'vitest';
import { CAR_RADIUS, GRAVITY, MAX_REVERSE, MAX_SPEED } from './constants.ts';
import type { World } from './body.ts';
import { buildIndex } from './collision.ts';
import { createVehicle, stepVehicle } from './vehicle.ts';
import type { DriveInput, Vehicle } from './vehicle.ts';

const DT = 1 / 60;
const GAS: DriveInput = { throttle: 1, steer: 0, handbrake: false };
const IDLE: DriveInput = { throttle: 0, steer: 0, handbrake: false };
const openWorld: World = { ramps: [], index: buildIndex([]) };

function run(car: Vehicle, input: DriveInput, seconds: number, world = openWorld) {
  let impact = 0;
  let landed = 0;
  let jump = 0;
  let highest = 0;
  for (let t = 0; t < seconds; t += DT) {
    const step = stepVehicle(car, input, DT, world);
    impact = Math.max(impact, step.impact);
    landed = Math.max(landed, step.landed);
    jump = Math.max(jump, step.jump);
    highest = Math.max(highest, car.y);
  }
  return { impact, landed, jump, highest };
}

describe('stepVehicle', () => {
  it('drives forward along its heading', () => {
    const car = createVehicle(0, 0, 0);
    run(car, GAS, 2);
    expect(car.z).toBeGreaterThan(20);
    expect(car.x).toBeCloseTo(0);
  });

  it('never passes top speed', () => {
    const car = createVehicle(0, -300, 0);
    run(car, GAS, 12);
    expect(car.speed).toBeGreaterThan(MAX_SPEED * 0.85);
    expect(car.speed).toBeLessThanOrEqual(MAX_SPEED);
  });

  it('rolls to a stop with no throttle', () => {
    const car = createVehicle(0, -300, 0);
    run(car, GAS, 2);
    run(car, IDLE, 20);
    expect(Math.abs(car.speed)).toBeLessThan(0.1);
  });

  it('brakes much faster than it coasts', () => {
    const braking = createVehicle(0, -300, 0);
    const coasting = createVehicle(0, -300, 0);
    run(braking, GAS, 3);
    run(coasting, GAS, 3);
    run(braking, { ...IDLE, throttle: -1 }, 0.5);
    run(coasting, IDLE, 0.5);
    expect(braking.speed).toBeLessThan(coasting.speed - 10);
  });

  it('reverses up to the reverse limit', () => {
    const car = createVehicle(0, 0, 0);
    run(car, { ...IDLE, throttle: -1 }, 6);
    expect(car.speed).toBeLessThan(-MAX_REVERSE * 0.7);
    expect(car.speed).toBeGreaterThanOrEqual(-MAX_REVERSE);
  });

  it('turns right with positive steer', () => {
    const car = createVehicle(0, 0, 0);
    run(car, { ...GAS, steer: 1 }, 1.5);
    expect(car.x).toBeLessThan(-1);
  });

  it('turns left with negative steer', () => {
    const car = createVehicle(0, 0, 0);
    run(car, { ...GAS, steer: -1 }, 1.5);
    expect(car.x).toBeGreaterThan(1);
  });

  it('cannot turn while parked', () => {
    const car = createVehicle(0, 0, 0);
    run(car, { ...IDLE, steer: 1 }, 1);
    expect(car.heading).toBe(0);
  });

  it('slides more with the handbrake on', () => {
    const gripping = createVehicle(0, 0, 0);
    const drifting = createVehicle(0, 0, 0);
    run(gripping, GAS, 3);
    run(drifting, GAS, 3);
    run(gripping, { ...GAS, steer: 1 }, 0.8);
    run(drifting, { throttle: 1, steer: 1, handbrake: true }, 0.8);
    expect(Math.abs(drifting.slip)).toBeGreaterThan(Math.abs(gripping.slip) + 5);
  });

  it('is stopped by a wall and reports the impact', () => {
    const wall = { minX: -50, maxX: 50, minZ: 40, maxZ: 60 };
    const car = createVehicle(0, 0, 0);
    const { impact } = run(car, GAS, 4, { ramps: [], index: buildIndex([wall]) });
    expect(impact).toBeGreaterThan(15);
    expect(car.z).toBeLessThanOrEqual(40 - CAR_RADIUS + 0.001);
  });

  it('stays inside the map', () => {
    const car = createVehicle(0, 300, 0);
    run(car, GAS, 10);
    expect(car.z).toBeLessThan(364);
  });
});

describe('ramps', () => {
  const ramp = { x: 0, z: 60, dirX: 0, dirZ: 1, length: 11, width: 9, height: 2.9 };
  const world: World = { ramps: [ramp], index: buildIndex([]) };

  it('launches a fast car into the air and lands it', () => {
    const car = createVehicle(0, 0, 0);
    const { jump } = run(car, GAS, 5, world);
    expect(jump).toBeGreaterThan(0.5);
    expect(car.grounded).toBe(true);
    expect(car.y).toBe(0);
  });

  it('gives a slow car a shorter jump', () => {
    const fast = createVehicle(0, 0, 0);
    const slow = createVehicle(0, 45, 0);
    const fastJump = run(fast, GAS, 5, world).jump;
    const slowJump = run(slow, GAS, 5, world).jump;
    expect(slowJump).toBeGreaterThan(0);
    expect(slowJump).toBeLessThan(fastJump);
  });

  it('blocks a car that hits the tall end', () => {
    const car = createVehicle(0, 120, Math.PI);
    const { impact, jump } = run(car, GAS, 4, world);
    expect(impact).toBeGreaterThan(10);
    expect(jump).toBe(0);
    expect(car.z).toBeGreaterThan(71);
  });

  it('cannot be steered much in the air', () => {
    const car = createVehicle(0, 0, 0);
    for (let step = 0; step < 600 && car.grounded; step++) stepVehicle(car, GAS, DT, world);
    expect(car.grounded).toBe(false);
    const before = car.heading;
    run(car, { ...GAS, steer: 1 }, 0.2, world);
    expect(Math.abs(car.heading - before)).toBeLessThan(0.1);
  });

  describe('crossing a ramp from the side', () => {
    const SPEED = 40;
    const slope = ramp.height / ramp.length;
    /** The highest a car at this speed can get by driving straight up the ramp. */
    const fairPeak = ramp.height + (slope * SPEED) ** 2 / (2 * GRAVITY);

    function cross(along: number, degrees: number) {
      const heading = Math.PI / 2 + (degrees * Math.PI) / 180;
      const car = createVehicle(-30 * Math.sin(heading), ramp.z + along - 30 * Math.cos(heading), heading);
      car.vx = Math.sin(heading) * SPEED;
      car.vz = Math.cos(heading) * SPEED;
      return run(car, GAS, 3, world);
    }

    const crossings: Array<[number, number]> = [];
    for (let along = 0.2; along < ramp.length; along += 0.35) {
      for (let degrees = -45; degrees <= 45; degrees += 5) crossings.push([along, degrees]);
    }

    // Regression: popping up onto the side of a ramp used to turn the one-step
    // lift into upward speed, which threw the cab 45 m into the air.
    it('never flies higher than a straight launch could', () => {
      const highest = Math.max(...crossings.map(([along, deg]) => cross(along, deg).highest));
      expect(highest).toBeLessThan(fairPeak);
    });

    it('does not count rolling off the side as a jump', () => {
      const square = crossings.filter(([, deg]) => Math.abs(deg) <= 10);
      const jumps = square.map(([along, deg]) => cross(along, deg).jump);
      expect(Math.max(...jumps)).toBe(0);
    });
  });
});
