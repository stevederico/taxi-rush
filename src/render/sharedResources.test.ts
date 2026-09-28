import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';
import type { Object3D } from 'three';
import { DROPOFF_RADIUS, PICKUP_RADIUS } from '../game/constants.ts';
import { Beacon } from './beacon.ts';
import { Figure } from './figure.ts';
import { DESTINATION, TIER_COLORS } from './palette.ts';

/** Every geometry and material a set of objects would upload to the GPU. */
function gpuResources(roots: readonly Object3D[]): Set<unknown> {
  const found = new Set<unknown>();
  for (const root of roots) {
    root.traverse((part) => {
      if (!(part instanceof Mesh)) return;
      found.add(part.geometry);
      for (const material of [part.material].flat()) found.add(material);
    });
  }
  return found;
}

const beaconColors = [...Object.values(TIER_COLORS), DESTINATION];

describe('Figure', () => {
  it('reuses the same GPU resources however many are made', () => {
    const firstRound = Array.from({ length: 24 }, (_, look) => new Figure(look).group);
    const before = gpuResources(firstRound);
    const later = Array.from({ length: 200 }, (_, i) => new Figure(i * 7).group);
    expect(gpuResources([...firstRound, ...later]).size).toBe(before.size);
  });
});

describe('Beacon', () => {
  it('reuses the same GPU resources however many are made', () => {
    const make = (i: number) =>
      new Beacon(i % 2 ? PICKUP_RADIUS : DROPOFF_RADIUS, beaconColors[i % beaconColors.length]!).group;
    const firstRound = Array.from({ length: 8 }, (_, i) => make(i));
    const before = gpuResources(firstRound);
    const later = Array.from({ length: 200 }, (_, i) => make(i));
    expect(gpuResources([...firstRound, ...later]).size).toBe(before.size);
  });
});
