import { describe, expect, it } from 'vitest';
import { START_CLOCK } from './constants.ts';
import { createGame, drainEvents, stepGame } from './game.ts';
import type { Game } from './game.ts';
import type { DriveInput } from './vehicle.ts';

const DT = 1 / 60;
const IDLE: DriveInput = { throttle: 0, steer: 0, handbrake: false };

function run(game: Game, input: DriveInput, seconds: number) {
  for (let t = 0; t < seconds; t += DT) stepGame(game, input, DT);
}

function teleport(game: Game, x: number, z: number) {
  Object.assign(game.car, { x, z, vx: 0, vz: 0, speed: 0 });
  game.traffic.length = 0;
}

describe('createGame', () => {
  it('starts with a full clock, no cash and fares waiting', () => {
    const game = createGame(1);
    expect(game.clock).toBe(START_CLOCK);
    expect(game.cash).toBe(0);
    expect(game.fares.waiting.length).toBeGreaterThan(3);
  });

  it('spawns the cab clear of anything solid', () => {
    const game = createGame(1);
    run(game, IDLE, 0.5);
    expect(drainEvents(game).filter((e) => e.type === 'crash')).toEqual([]);
  });
});

describe('stepGame', () => {
  it('ends the run when the clock runs out', () => {
    const game = createGame(2);
    game.traffic.length = 0;
    run(game, IDLE, START_CLOCK + 1);
    expect(game.isOver).toBe(true);
    expect(game.clock).toBe(0);
    expect(drainEvents(game).at(-1)).toEqual({ type: 'gameOver' });
  });

  it('stops changing once the run is over', () => {
    const game = createGame(2);
    game.traffic.length = 0;
    run(game, IDLE, START_CLOCK + 1);
    const elapsed = game.elapsed;
    run(game, { ...IDLE, throttle: 1 }, 1);
    expect(game.elapsed).toBe(elapsed);
  });

  it('adds time on pickup', () => {
    const game = createGame(3);
    const fare = game.fares.waiting[0]!;
    teleport(game, fare.from.x, fare.from.z);
    stepGame(game, IDLE, DT);
    const [event] = drainEvents(game).filter((e) => e.type === 'pickup');
    expect(event).toBeDefined();
    expect(game.clock).toBeGreaterThan(START_CLOCK + 3);
  });

  it('pays cash and adds time on dropoff', () => {
    const game = createGame(3);
    const fare = game.fares.waiting[0]!;
    teleport(game, fare.from.x, fare.from.z);
    stepGame(game, IDLE, DT);
    const clock = game.clock;
    teleport(game, fare.to.x, fare.to.z);
    stepGame(game, IDLE, DT);
    expect(game.cash).toBe(Math.round(fare.pay * 1.5));
    expect(game.clock).toBeGreaterThan(clock + 5);
    expect(game.fares.delivered).toBe(1);
  });

  it('keeps fares waiting after one is taken', () => {
    const game = createGame(3);
    const before = game.fares.waiting.length;
    const fare = game.fares.waiting[0]!;
    teleport(game, fare.from.x, fare.from.z);
    stepGame(game, IDLE, DT);
    expect(game.fares.waiting.length).toBe(before);
  });

  it('reports a crash and breaks the combo when the cab hits a wall', () => {
    const game = createGame(4);
    game.traffic.length = 0;
    game.tips.combo = 3;
    game.car.heading = Math.PI / 2;
    run(game, { ...IDLE, throttle: 1 }, 4);
    const types = drainEvents(game).map((e) => e.type);
    expect(types).toContain('crash');
    expect(types).toContain('comboLost');
    expect(game.tips.combo).toBe(1);
  });

  it('plays a whole run the same way from the same seed', () => {
    const drive = (seed: number) => {
      const game = createGame(seed);
      run(game, { throttle: 1, steer: 0.2, handbrake: false }, 20);
      return [game.car.x, game.car.z, game.cash, game.traffic[0]!.x];
    };
    expect(drive(8)).toEqual(drive(8));
  });
});
