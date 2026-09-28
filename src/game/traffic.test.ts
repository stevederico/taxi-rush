import { describe, expect, it } from 'vitest';
import { GRID_BLOCKS, TRAFFIC_COUNT, WORLD_HALF } from './constants.ts';
import type { World } from './body.ts';
import { bumpTraffic } from './bumps.ts';
import { generateCity } from './city.ts';
import { buildIndex } from './collision.ts';
import { isOnRoad, roadCenter } from './roads.ts';
import { createRng } from './rng.ts';
import { createTraffic, stepTraffic } from './traffic.ts';
import { planTurn } from './trafficTurns.ts';
import { createVehicle } from './vehicle.ts';

const DT = 1 / 30;
const city = generateCity(21);
const world: World = { ramps: city.ramps, index: buildIndex(city.obstacles) };
const farAway = { x: 9999, z: 9999 };

describe('createTraffic', () => {
  it('spawns every car on a road, clear of the player', () => {
    const cars = createTraffic(createRng(1), 0, 0);
    expect(cars).toHaveLength(TRAFFIC_COUNT);
    expect(cars.every((c) => isOnRoad(c.x, c.z))).toBe(true);
    expect(cars.every((c) => Math.hypot(c.x, c.z) >= 40)).toBe(true);
  });
});

describe('stepTraffic', () => {
  it('keeps every car on the road and inside the map for minutes', () => {
    const rng = createRng(2);
    const cars = createTraffic(rng, 0, 0);
    let strays = 0;
    for (let step = 0; step < 30 * 180; step++) {
      stepTraffic(cars, farAway, world, rng, DT);
      for (const c of cars) {
        const isInside = Math.abs(c.x) < WORLD_HALF && Math.abs(c.z) < WORLD_HALF;
        if (!isInside || !isOnRoad(c.x, c.z)) strays++;
      }
    }
    expect(strays).toBe(0);
  });

  it('keeps traffic moving instead of locking up', () => {
    const rng = createRng(3);
    const cars = createTraffic(rng, 0, 0);
    const start = cars.map((c) => ({ x: c.x, z: c.z }));
    for (let step = 0; step < 30 * 60; step++) stepTraffic(cars, farAway, world, rng, DT);
    const moved = cars.filter((c, i) => Math.hypot(c.x - start[i]!.x, c.z - start[i]!.z) > 5);
    expect(moved.length).toBeGreaterThan(TRAFFIC_COUNT * 0.9);
  });

  it('slows down for a player stopped in its lane', () => {
    const rng = createRng(4);
    const [car] = createTraffic(rng, 0, 0);
    const player = { x: car!.x + car!.dirX * 8, z: car!.z + car!.dirZ * 8 };
    for (let step = 0; step < 60; step++) stepTraffic([car!], player, world, rng, DT);
    expect(car!.speed).toBeLessThan(1);
  });
});

describe('planTurn', () => {
  const lane = 3.5;

  it('turns at the edge of the map instead of driving off it', () => {
    const car = { x: roadCenter(3) - lane, z: WORLD_HALF - 40, dirX: 0, dirZ: 1, lane };
    const kinds = Array.from({ length: 30 }, (_, i) => planTurn(car, createRng(i)).kind);
    expect(kinds).not.toContain('straight');
  });

  it('never turns off the map from an edge road', () => {
    const car = { x: roadCenter(0) - lane, z: 0, dirX: 0, dirZ: 1, lane };
    const kinds = Array.from({ length: 30 }, (_, i) => planTurn(car, createRng(i)).kind);
    expect(kinds).not.toContain('right');
  });

  it('plans for a crossing that is still ahead', () => {
    const car = { x: roadCenter(2) - lane, z: roadCenter(4) + 20, dirX: 0, dirZ: 1, lane };
    expect(planTurn(car, createRng(1)).road).toBe(5);
  });

  it('still finds a way back from beyond the last road', () => {
    const car = { x: roadCenter(2) - lane, z: WORLD_HALF - 2, dirX: 0, dirZ: 1, lane };
    const turn = planTurn(car, createRng(1));
    expect(turn.road).toBe(GRID_BLOCKS);
    expect(turn.kind).not.toBe('straight');
  });
});

describe('bumpTraffic', () => {
  it('knocks a car away and slows the player', () => {
    const rng = createRng(5);
    const [car] = createTraffic(rng, 0, 0);
    const player = createVehicle(car!.x, car!.z - 2, 0);
    player.vz = 30;
    const bumps = bumpTraffic(player, [car!], rng);
    expect(bumps).toHaveLength(1);
    expect(car!.stun).toBeGreaterThan(0);
    expect(player.vz).toBeLessThan(30);
    expect(player.vz).toBeGreaterThan(15);
  });

  it('lets the player jump clean over a car', () => {
    const rng = createRng(5);
    const [car] = createTraffic(rng, 0, 0);
    const player = createVehicle(car!.x, car!.z, 0);
    player.y = 3;
    expect(bumpTraffic(player, [car!], rng)).toEqual([]);
  });
});
