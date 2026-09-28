import type { Game, GameEvent } from '../game/game.ts';
import type { Rating } from '../game/fares.ts';
import type { TipKind } from '../game/tips.ts';
import { byId, replay } from './dom.ts';
import { formatCash, formatClock, formatSpeed } from './format.ts';

const LOW_CLOCK = 10;
const MAX_POPUPS = 6;
const POPUP_LIFE_MS = 1100;
const POPUP_SPREAD = 120;

const TIP_NAMES: Record<TipKind, string> = { nearMiss: 'Near Miss', jump: 'Big Air', drift: 'Drift' };
const RATING_NAMES: Record<Rating, string> = { speedy: 'Speedy!', normal: 'Nice Ride', slow: 'Made It' };
type Tone = 'good' | 'bad' | 'info';

/** The heads-up display: clock, cash, fare, combo, speed and pop-up text. */
export class Hud {
  private root = byId('hud');
  private clock = byId('clock');
  private clockBox = byId('clock-box');
  private cash = byId('cash');
  private cashPanel = this.cash.closest<HTMLElement>('.panel')!;
  private farePanel = byId('fare-panel');
  private fareLabel = byId('fare-label');
  private fareName = byId('fare-name');
  private fareMeter = byId('fare-meter');
  private combo = byId('combo');
  private comboValue = byId('combo-value');
  private speed = byId('speed');
  private banner = byId('banner');
  private popups = byId('popups');
  private shown = { clock: '', cash: '', speed: '', combo: 0 };

  setVisible(isVisible: boolean): void {
    this.root.hidden = !isVisible;
  }

  /** Clear pop-ups and banners left over from the last run. */
  reset(): void {
    this.popups.replaceChildren();
    this.banner.classList.remove('is-shown');
    this.shown = { clock: '', cash: '', speed: '', combo: 0 };
  }

  private setText(element: HTMLElement, key: 'clock' | 'cash' | 'speed', text: string): void {
    if (this.shown[key] === text) return;
    this.shown[key] = text;
    element.textContent = text;
  }

  /** Refresh the numbers. Runs every frame, so it only touches what changed. */
  update(game: Game): void {
    this.setText(this.clock, 'clock', formatClock(game.clock));
    this.setText(this.cash, 'cash', formatCash(game.cash));
    this.setText(this.speed, 'speed', formatSpeed(game.car.speed));
    this.clockBox.classList.toggle('is-low', game.clock <= LOW_CLOCK && !game.isOver);
    this.updateFare(game);
    this.updateCombo(game.tips.combo);
  }

  private updateFare(game: Game): void {
    const { active } = game.fares;
    this.farePanel.classList.toggle('is-carrying', active !== null);
    if (!active) {
      this.fareLabel.textContent = 'Find A Fare';
      this.fareName.textContent = 'Stop In A Ring';
      return;
    }
    const left = Math.max(0, active.clock / active.fare.limit);
    this.fareLabel.textContent = `Fare $${formatCash(active.fare.pay)}`;
    this.fareName.textContent = active.fare.to.name;
    this.fareMeter.style.transform = `scaleX(${left.toFixed(3)})`;
    this.fareMeter.style.background = left > 0.45 ? 'var(--green)' : left > 0.15 ? 'var(--yellow)' : 'var(--red)';
  }

  private updateCombo(combo: number): void {
    if (this.shown.combo === combo) return;
    this.shown.combo = combo;
    this.combo.hidden = combo < 2;
    this.comboValue.textContent = `x${combo}`;
    if (combo >= 2) replay(this.combo, 'is-bumped');
  }

  /** Show a big message across the screen. */
  announce(text: string, detail: string, tone: Tone): void {
    const small = document.createElement('small');
    small.textContent = detail;
    this.banner.replaceChildren(text, small);
    this.banner.classList.remove('tone-good', 'tone-bad', 'tone-info');
    this.banner.classList.add(`tone-${tone}`);
    replay(this.banner, 'is-shown');
  }

  private popup(text: string): void {
    const element = document.createElement('div');
    element.className = 'popup';
    element.textContent = text;
    element.style.left = `${(Math.random() - 0.5) * POPUP_SPREAD}px`;
    element.style.top = `${-60 - Math.random() * 40}px`;
    this.popups.append(element);
    while (this.popups.childElementCount > MAX_POPUPS) this.popups.firstElementChild?.remove();
    window.setTimeout(() => element.remove(), POPUP_LIFE_MS);
  }

  /** Put what just happened on screen. */
  handle(event: GameEvent): void {
    if (event.type === 'tip') {
      const { kind, amount, combo } = event.tip;
      this.popup(`+$${amount} ${TIP_NAMES[kind]}${combo > 1 ? ` x${combo}` : ''}`);
      replay(this.cashPanel, 'is-paid');
    }
    if (event.type === 'pickup') {
      this.announce(event.fare.to.name, `+${Math.round(event.bonus)} Sec`, 'info');
      replay(this.clockBox, 'is-boosted');
    }
    if (event.type === 'dropoff') {
      const { rating, pay, bonus } = event.payout;
      const seconds = Math.max(1, Math.round(bonus));
      this.announce(`${RATING_NAMES[rating]} +$${formatCash(pay)}`, `+${seconds} Sec`, 'good');
      replay(this.cashPanel, 'is-paid');
      replay(this.clockBox, 'is-boosted');
    }
    if (event.type === 'fareLost') this.announce('Fare Bailed!', 'Too Slow', 'bad');
    if (event.type === 'comboLost') this.popup('Combo Lost');
  }
}

