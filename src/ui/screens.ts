import type { Game } from '../game/game.ts';
import { nextRank, rankFor } from '../game/rank.ts';
import { CENTER, clearSpot } from './clearSpot.ts';
import type { ScreenSpot } from './clearSpot.ts';
import { byId } from './dom.ts';
import { formatCash, formatSpeed, formatTime } from './format.ts';

export type ScreenName = 'title' | 'pause' | 'over' | 'none';

export interface ScreenActions {
  start(): void;
  resume(): void;
  quit(): void;
}

/** The title, pause and game over screens. */
export class Screens {
  private title = byId('title');
  private pause = byId('pause');
  private over = byId('over');

  constructor(actions: ScreenActions) {
    byId('start-button').addEventListener('click', actions.start);
    byId('again-button').addEventListener('click', actions.start);
    byId('resume-button').addEventListener('click', actions.resume);
    byId('quit-button').addEventListener('click', actions.quit);
  }

  show(name: ScreenName): void {
    this.title.hidden = name !== 'title';
    this.pause.hidden = name !== 'pause';
    this.over.hidden = name !== 'over';
    const focus = { title: 'start-button', pause: 'resume-button', over: 'again-button', none: '' }[name];
    if (focus) byId(focus).focus({ preventScroll: true });
  }

  /** The spot on screen that the open menu card leaves clear. */
  clearSpot(): ScreenSpot {
    const open = [this.title, this.over].find((screen) => !screen.hidden);
    const card = open?.querySelector('.card');
    if (!card) return CENTER;
    return clearSpot(card.getBoundingClientRect(), window.innerWidth, window.innerHeight);
  }

  showBest(best: number): void {
    byId('title-best').hidden = best <= 0;
    byId('title-best-value').textContent = formatCash(best);
  }

  /** Fill in the results of a finished run. */
  showResults(game: Game, best: number, isNewBest: boolean): void {
    const upcoming = nextRank(game.cash);
    byId('over-cash').textContent = formatCash(game.cash);
    byId('over-rank').textContent = rankFor(game.cash).title;
    byId('over-new-best').hidden = !isNewBest;
    byId('over-best').hidden = isNewBest;
    byId('over-best-value').textContent = formatCash(best);
    byId('stat-fares').textContent = String(game.fares.delivered);
    byId('stat-tips').textContent = `$${formatCash(game.tips.total)}`;
    byId('stat-combo').textContent = `x${game.tips.bestCombo}`;
    byId('stat-jump').textContent = `${game.stats.longestJump.toFixed(1)}s`;
    byId('stat-speed').textContent = `${formatSpeed(game.stats.topSpeed)} km/h`;
    byId('stat-time').textContent = formatTime(game.elapsed);
    byId('over-next').textContent = upcoming
      ? `$${formatCash(upcoming.cash - game.cash)} more for ${upcoming.title}`
      : 'Top rank. The city is yours.';
  }
}
