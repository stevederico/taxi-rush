import { describe, expect, it } from 'vitest';
import { nextRank, rankFor, RANKS } from './rank.ts';

describe('rankFor', () => {
  it('starts at the bottom rank', () => {
    expect(rankFor(0).title).toBe("Learner's Permit");
  });

  it('earns a rank exactly at its threshold', () => {
    expect(rankFor(400).title).toBe('Rookie Cabbie');
    expect(rankFor(399).title).toBe("Learner's Permit");
  });

  it('tops out at the last rank', () => {
    expect(rankFor(999999)).toBe(RANKS.at(-1));
  });
});

describe('nextRank', () => {
  it('names the next rank up', () => {
    expect(nextRank(500)?.title).toBe('Street Smart');
  });

  it('is null at the top', () => {
    expect(nextRank(999999)).toBeNull();
  });
});
