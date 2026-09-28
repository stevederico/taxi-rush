/**
 * Throttle from a gas and a brake pedal, each 0 to 1. The brake wins when
 * both are pressed, so a panicked player always slows down.
 */
export function pedals(gas: number, brake: number): number {
  return brake > 0 ? -brake : gas;
}
