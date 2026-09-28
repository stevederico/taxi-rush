import type { DriveInput } from '../game/vehicle.ts';
import { pedals } from './pedals.ts';

type PadKey = 'left' | 'right' | 'gas' | 'brake' | 'drift';

/** Keep getting a finger's events after it slides off the button. */
function capture(button: HTMLElement, pointerId: number): void {
  try {
    button.setPointerCapture(pointerId);
  } catch {
    // The pointer is already gone. The button still works without capture.
  }
}

/** On-screen driving buttons. Each button tracks its own finger. */
export class TouchPad {
  private held = new Set<PadKey>();

  constructor(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>('[data-pad]').forEach((button) => {
      const key = button.dataset.pad as PadKey;
      const press = (event: PointerEvent) => {
        event.preventDefault();
        this.held.add(key);
        button.classList.add('is-held');
        capture(button, event.pointerId);
      };
      const release = () => {
        this.held.delete(key);
        button.classList.remove('is-held');
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    });
  }

  release(): void {
    this.held.clear();
  }

  read(): DriveInput {
    const throttle = pedals(this.held.has('gas') ? 1 : 0, this.held.has('brake') ? 1 : 0);
    const steer = (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    return { throttle, steer, handbrake: this.held.has('drift') };
  }
}
