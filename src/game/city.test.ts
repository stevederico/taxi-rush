import { describe, expect, it } from 'vitest';
import { GRID_BLOCKS, WORLD_HALF } from './constants.ts';
import { generateCity } from './city.ts';
import { circleBoxHit } from './collision.ts';
import { groundHeight, rampHeightAt } from './ramps.ts';
import { isOnRoad } from './roads.ts';

const SEEDS = [1, 2, 3, 1234, 99999];

describe('generateCity', () => {
  it('builds the same city from the same seed', () => {
    expect(generateCity(5)).toEqual(generateCity(5));
  });

  it('lays out every block', () => {
    expect(generateCity(1).blocks).toHaveLength(GRID_BLOCKS * GRID_BLOCKS);
  });

  it.each(SEEDS)('keeps buildings off the road (seed %i)', (seed) => {
    const { buildings } = generateCity(seed);
    const corners = buildings.flatMap((b) => [
      [b.minX + 0.01, b.minZ + 0.01],
      [b.maxX - 0.01, b.maxZ - 0.01],
    ]);
    expect(corners.every(([x, z]) => !isOnRoad(x!, z!))).toBe(true);
  });

  it.each(SEEDS)('puts every stop on the road and inside the map (seed %i)', (seed) => {
    const { stops } = generateCity(seed);
    expect(stops.length).toBeGreaterThan(100);
    expect(stops.every((s) => isOnRoad(s.x, s.z))).toBe(true);
    expect(stops.every((s) => Math.abs(s.x) < WORLD_HALF && Math.abs(s.z) < WORLD_HALF)).toBe(true);
  });

  it.each(SEEDS)('keeps stops clear of anything solid (seed %i)', (seed) => {
    const { stops, obstacles } = generateCity(seed);
    const blocked = stops.filter((s) => obstacles.some((o) => circleBoxHit(s.x, s.z, 2, o)));
    expect(blocked).toEqual([]);
  });

  it.each(SEEDS)('puts every ramp on the road (seed %i)', (seed) => {
    const { ramps } = generateCity(seed);
    expect(ramps.length).toBeGreaterThan(5);
    const tops = ramps.map((r) => [r.x + r.dirX * r.length, r.z + r.dirZ * r.length]);
    expect(ramps.every((r) => isOnRoad(r.x, r.z))).toBe(true);
    expect(tops.every(([x, z]) => isOnRoad(x!, z!))).toBe(true);
  });

  it('names stops after the nearest corner', () => {
    expect(generateCity(1).stops[0]!.name).toMatch(/^\w+ & \d\w\w$/);
  });
});

describe('rampHeightAt', () => {
  const ramp = { x: 0, z: 0, dirX: 0, dirZ: 1, length: 10, width: 8, height: 2 };

  it('rises along the ramp', () => {
    expect(rampHeightAt(ramp, 0, 5)).toBeCloseTo(1);
    expect(rampHeightAt(ramp, 0, 10)).toBeCloseTo(2);
  });

  it('is flat beside, before and after the ramp', () => {
    expect([rampHeightAt(ramp, 5, 5), rampHeightAt(ramp, 0, -1), rampHeightAt(ramp, 0, 11)]).toEqual([
      0, 0, 0,
    ]);
  });

  it('follows the ramp direction', () => {
    const west = { ...ramp, dirX: -1, dirZ: 0 };
    expect(rampHeightAt(west, -5, 0)).toBeCloseTo(1);
    expect(rampHeightAt(west, 5, 0)).toBe(0);
  });
});

describe('groundHeight', () => {
  it('is 0 away from every ramp', () => {
    expect(groundHeight(generateCity(1).ramps, WORLD_HALF - 1, WORLD_HALF - 1)).toBe(0);
  });
});
