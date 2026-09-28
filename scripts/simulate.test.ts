import { it } from 'vitest';
import { createAutopilot, steerAutopilot } from '../src/game/autopilot.ts';
import { createGame, drainEvents, stepGame } from '../src/game/game.ts';

const DT = 1 / 60;

it('prints autopilot run stats', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const game = createGame(2026, seed);
    const pilot = createAutopilot();
    const counts: Record<string, number> = {};
    while (!game.isOver && game.elapsed < 1200) {
      stepGame(game, steerAutopilot(pilot, game, DT), DT);
      for (const e of drainEvents(game)) counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    console.log(
      `seed ${seed}: time ${game.elapsed.toFixed(0)}s cash $${game.cash} fares ${game.fares.delivered} lost ${game.fares.lost} tips $${game.tips.total} top ${(game.stats.topSpeed * 3.6).toFixed(0)}kmh`,
      JSON.stringify(counts),
    );
  }
});
