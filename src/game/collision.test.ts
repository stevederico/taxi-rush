import { describe, expect, it } from 'vitest';
import { buildIndex, circleBoxHit, circleCircleHit, nearbyBoxes } from './collision.ts';

const box = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };

describe('circleBoxHit', () => {
  it('misses a box that is out of reach', () => {
    expect(circleBoxHit(-5, 5, 2, box)).toBeNull();
  });

  it('pushes straight out of a wall', () => {
    const hit = circleBoxHit(-1, 5, 2, box);
    expect(hit).toEqual({ nx: -1, nz: 0, depth: 1 });
  });

  it('pushes diagonally off a corner', () => {
    const hit = circleBoxHit(-1, -1, 2, box)!;
    expect(hit.nx).toBeCloseTo(-Math.SQRT1_2);
    expect(hit.nz).toBeCloseTo(-Math.SQRT1_2);
  });

  it('pushes out through the nearest wall when the center is inside', () => {
    expect(circleBoxHit(9, 5, 1, box)).toEqual({ nx: 1, nz: 0, depth: 2 });
  });
});

describe('circleCircleHit', () => {
  it('misses when apart', () => {
    expect(circleCircleHit(0, 0, 1, 3, 0, 1)).toBeNull();
  });

  it('points from the second circle to the first', () => {
    expect(circleCircleHit(0, 0, 1, 1.5, 0, 1)).toEqual({ nx: -1, nz: 0, depth: 0.5 });
  });
});

describe('nearbyBoxes', () => {
  const far = { minX: 500, maxX: 510, minZ: 500, maxZ: 510 };
  const wide = { minX: -100, maxX: 100, minZ: 40, maxZ: 50 };
  const index = buildIndex([box, far, wide]);

  it('finds boxes close to the point', () => {
    expect(nearbyBoxes(index, 5, 5, 2)).toContain(box);
  });

  it('skips boxes far from the point', () => {
    expect(nearbyBoxes(index, 5, 5, 2)).not.toContain(far);
  });

  it('returns a box that spans many cells only once', () => {
    expect(nearbyBoxes(index, 0, 45, 60).filter((b) => b === wide)).toHaveLength(1);
  });

  it('handles negative coordinates', () => {
    expect(nearbyBoxes(index, -90, 45, 2)).toContain(wide);
  });
});
