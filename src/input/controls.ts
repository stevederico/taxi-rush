import { clamp } from '../game/math.ts';
import type { DriveInput } from '../game/vehicle.ts';
import { readGamepad } from './gamepad.ts';
import { Keyboard } from './keyboard.ts';
import { pedals } from './pedals.ts';
import { TouchPad } from './touchPad.ts';

/**
 * Blend several input sources into one. The strongest push on each axis wins,
 * except that braking on any source beats gas on another.
 */
export function mergeInputs(inputs: readonly DriveInput[]): DriveInput {
  const strongest = (pick: (input: DriveInput) => number): number =>
    inputs.reduce((best, input) => (Math.abs(pick(input)) > Math.abs(best) ? pick(input) : best), 0);
  const gas = Math.max(0, ...inputs.map((i) => i.throttle));
  const brake = Math.max(0, ...inputs.map((i) => -i.throttle));
  return {
    throttle: clamp(pedals(gas, brake), -1, 1),
    steer: clamp(strongest((i) => i.steer), -1, 1),
    handbrake: inputs.some((i) => i.handbrake),
  };
}

/** Keyboard, touch buttons and gamepad, read as one set of controls. */
export class Controls {
  private keyboard: Keyboard;
  private touch: TouchPad;

  constructor(target: Window, touchRoot: HTMLElement) {
    this.keyboard = new Keyboard(target);
    this.touch = new TouchPad(touchRoot);
  }

  releaseTouch(): void {
    this.touch.release();
  }

  read(): DriveInput {
    const inputs = [this.keyboard.read(), this.touch.read()];
    const pad = readGamepad();
    if (pad) inputs.push(pad);
    return mergeInputs(inputs);
  }
}
