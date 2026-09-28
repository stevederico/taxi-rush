import type { DriveInput } from '../game/vehicle.ts';
import { pedals } from './pedals.ts';

const DEAD_ZONE = 0.15;
const BUTTON_A = 0;
const BUTTON_B = 1;
const BUTTON_X = 2;
const LEFT_TRIGGER = 6;
const RIGHT_TRIGGER = 7;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;

function pressed(pad: Gamepad, index: number): number {
  return pad.buttons[index]?.value ?? 0;
}

/** Read the first connected gamepad, or null when there is none. */
export function readGamepad(): DriveInput | null {
  if (typeof navigator.getGamepads !== 'function') return null;
  const pad = navigator.getGamepads().find((p) => p !== null && p.connected);
  if (!pad) return null;
  const stick = pad.axes[0] ?? 0;
  const dpad = pressed(pad, DPAD_RIGHT) - pressed(pad, DPAD_LEFT);
  const steer = Math.abs(stick) > DEAD_ZONE ? stick : dpad;
  const gas = Math.max(pressed(pad, RIGHT_TRIGGER), pressed(pad, BUTTON_A));
  const brake = Math.max(pressed(pad, LEFT_TRIGGER), pressed(pad, BUTTON_B));
  const pedal = brake > DEAD_ZONE ? brake : 0;
  return { throttle: pedals(gas, pedal), steer, handbrake: pressed(pad, BUTTON_X) > 0.5 };
}
