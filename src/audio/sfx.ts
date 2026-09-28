import type { GameEvent } from '../game/game.ts';
import type { Note, Sound } from './sound.ts';

const PICKUP: Note[] = [
  { from: 523, at: 0, length: 0.12, level: 0.22, wave: 'square' },
  { from: 659, at: 0.08, length: 0.12, level: 0.22, wave: 'square' },
  { from: 784, at: 0.16, length: 0.22, level: 0.22, wave: 'square' },
];
const CASH: Note[] = [
  { from: 1319, at: 0, length: 0.1, level: 0.2, wave: 'triangle' },
  { from: 1760, at: 0.07, length: 0.1, level: 0.2, wave: 'triangle' },
  { from: 2093, at: 0.14, length: 0.4, level: 0.22, wave: 'triangle' },
  { from: 1047, at: 0.14, length: 0.4, level: 0.12, wave: 'square' },
];
const LOST: Note[] = [
  { from: 392, to: 300, at: 0, length: 0.22, level: 0.2, wave: 'sawtooth' },
  { from: 294, to: 180, at: 0.2, length: 0.4, level: 0.2, wave: 'sawtooth' },
];
const OVER: Note[] = [
  { from: 523, at: 0, length: 0.3, level: 0.2, wave: 'square' },
  { from: 415, at: 0.25, length: 0.3, level: 0.2, wave: 'square' },
  { from: 330, at: 0.5, length: 0.3, level: 0.2, wave: 'square' },
  { from: 262, at: 0.75, length: 0.9, level: 0.22, wave: 'square' },
];
const START: Note[] = [
  { from: 392, at: 0, length: 0.1, level: 0.2, wave: 'square' },
  { from: 523, at: 0.1, length: 0.1, level: 0.2, wave: 'square' },
  { from: 784, at: 0.2, length: 0.3, level: 0.22, wave: 'square' },
];
const TIP_BASE_HZ = 660;
const TIP_STEP = 1.122;

/** Short sound effects for things that happen in the game. */
export class Sfx {
  private sound: Sound;

  constructor(sound: Sound) {
    this.sound = sound;
  }

  start(): void {
    this.sound.play(START);
  }

  /** One tick for each of the last seconds on the clock. */
  tick(): void {
    this.sound.play([{ from: 990, at: 0, length: 0.07, level: 0.16, wave: 'square' }]);
  }

  private tip(combo: number): void {
    const hz = TIP_BASE_HZ * Math.pow(TIP_STEP, combo - 1);
    this.sound.play([
      { from: hz, at: 0, length: 0.08, level: 0.16, wave: 'triangle' },
      { from: hz * 1.5, at: 0.06, length: 0.14, level: 0.16, wave: 'triangle' },
    ]);
  }

  private crash(impact: number): void {
    const level = Math.min(0.6, 0.18 + impact * 0.012);
    this.sound.thud(level, 0.35, 1800);
    this.sound.play([{ from: 110, to: 45, at: 0, length: 0.25, level, wave: 'sine' }]);
  }

  handle(event: GameEvent): void {
    if (event.type === 'pickup') this.sound.play(PICKUP);
    if (event.type === 'dropoff') this.sound.play(CASH);
    if (event.type === 'fareLost') this.sound.play(LOST);
    if (event.type === 'gameOver') this.sound.play(OVER);
    if (event.type === 'tip') this.tip(event.tip.combo);
    if (event.type === 'crash' || event.type === 'bump') this.crash(event.impact);
    if (event.type === 'land') this.sound.thud(0.35, 0.22, 500);
  }
}
