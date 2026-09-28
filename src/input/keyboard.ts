import type { DriveInput } from '../game/vehicle.ts';
import { pedals } from './pedals.ts';

const GAS_KEYS = ['KeyW', 'ArrowUp'];
const BRAKE_KEYS = ['KeyS', 'ArrowDown'];
const LEFT_KEYS = ['KeyA', 'ArrowLeft'];
const RIGHT_KEYS = ['KeyD', 'ArrowRight'];
const DRIFT_KEYS = ['Space', 'ShiftLeft', 'ShiftRight'];
const DRIVING_KEYS = new Set([...GAS_KEYS, ...BRAKE_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...DRIFT_KEYS]);

/** Tracks which driving keys are held down. */
export class Keyboard {
  private held = new Set<string>();

  constructor(target: Window) {
    target.addEventListener('keydown', (event) => this.handleKey(event, true));
    target.addEventListener('keyup', (event) => this.handleKey(event, false));
    target.addEventListener('blur', () => this.held.clear());
  }

  private handleKey(event: KeyboardEvent, isDown: boolean): void {
    if (!DRIVING_KEYS.has(event.code)) return;
    if (event.target instanceof HTMLButtonElement && event.code === 'Space') return;
    event.preventDefault();
    if (isDown) this.held.add(event.code);
    else this.held.delete(event.code);
  }

  private isHeld(codes: readonly string[]): boolean {
    return codes.some((code) => this.held.has(code));
  }

  read(): DriveInput {
    const throttle = pedals(this.isHeld(GAS_KEYS) ? 1 : 0, this.isHeld(BRAKE_KEYS) ? 1 : 0);
    const steer = (this.isHeld(RIGHT_KEYS) ? 1 : 0) - (this.isHeld(LEFT_KEYS) ? 1 : 0);
    return { throttle, steer, handbrake: this.isHeld(DRIFT_KEYS) };
  }
}
