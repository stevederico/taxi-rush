import { describe, expect, it } from 'vitest';
import { createAutopilot, currentGoal, steerAutopilot } from './autopilot.ts';
import { createGame, drainEvents, stepGame } from './game.ts';
import type { Game, GameEvent } from './game.ts';
import { isOnRoad, roadCenter } from './roads.ts';
import { planRoute, routeLength } from './route.ts';

const DT = 1 / 60;

function drive(game: Game, seconds: number): GameEvent[] {
  const pilot = createAutopilot();
  const events: GameEvent[] = [];
  for (let t = 0; t < seconds && !game.isOver; t += DT) {
    stepGame(game, steerAutopilot(pilot, game, DT), DT);
    events.push(...drainEvents(game));
  }
  return events;
}

describe('planRoute', () => {
  const from = { x: roadCenter(2), z: roadCenter(3) + 40 };
  const to = { x: roadCenter(6) + 30, z: roadCenter(7) + 8.5 };

  it('starts at the car and ends at the goal', () => {
    const route = planRoute(from, to);
    expect(route[0]).toEqual(from);
    expect(route.at(-1)).toEqual(to);
  });

  it('stays on the road the whole way', () => {
    const route = planRoute(from, to);
    expect(route.every((p) => isOnRoad(p.x, p.z))).toBe(true);
  });

  it('only makes moves along one axis at a time between crossings', () => {
    const route = planRoute(from, to).slice(0, -1);
    const isStraight = route.slice(1).map((p, i) => p.x === route[i]!.x || p.z === route[i]!.z);
    expect(isStraight).not.toContain(false);
  });

  it('is about as long as the street distance', () => {
    const street = Math.abs(from.x - to.x) + Math.abs(from.z - to.z);
    expect(routeLength(planRoute(from, to))).toBeLessThan(street + 60);
  });

  it('goes straight there on the same stretch of road', () => {
    const near = { x: roadCenter(2) + 8.5, z: from.z + 15 };
    expect(planRoute(from, near)).toEqual([from, near]);
  });
});

describe('currentGoal', () => {
  it('heads for the nearest waiting fare', () => {
    const game = createGame(3);
    const goal = currentGoal(game)!;
    const gaps = game.fares.waiting.map(
      (f) => Math.abs(f.from.x - game.car.x) + Math.abs(f.from.z - game.car.z),
    );
    expect(Math.abs(goal.x - game.car.x) + Math.abs(goal.z - game.car.z)).toBe(Math.min(...gaps));
  });

  it('heads for the drop-off when carrying a passenger', () => {
    const game = createGame(3);
    const fare = game.fares.waiting[0]!;
    game.fares.active = { fare, clock: fare.limit };
    expect(currentGoal(game)).toBe(fare.to);
  });
});

describe('a full run on autopilot', () => {
  it.each([1, 2, 3])('picks up and delivers fares with real driving (run %i)', (runSeed) => {
    const game = createGame(2026, runSeed);
    const events = drive(game, 120);
    expect(events.filter((e) => e.type === 'pickup').length).toBeGreaterThanOrEqual(2);
    expect(game.fares.delivered).toBeGreaterThanOrEqual(2);
    expect(game.cash).toBeGreaterThan(150);
  });

  it('ends when the clock runs out', () => {
    const game = createGame(2026, 4);
    drive(game, 900);
    expect(game.isOver).toBe(true);
  });
});
