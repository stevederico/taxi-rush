/** Clamp a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear blend from a to b. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Move current toward target by at most maxStep. */
export function approach(current: number, target: number, maxStep: number): number {
  if (current < target) return Math.min(target, current + maxStep);
  return Math.max(target, current - maxStep);
}

/** Wrap an angle into (-PI, PI]. */
export function wrapAngle(angle: number): number {
  const TAU = Math.PI * 2;
  let a = angle % TAU;
  if (a > Math.PI) a -= TAU;
  if (a <= -Math.PI) a += TAU;
  return a;
}

/** Distance between two points on the ground plane. */
export function dist2d(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, az - bz);
}

/**
 * Heading (radians) that faces from one ground point to another.
 * Heading 0 faces +z and grows counter-clockwise seen from above.
 */
export function headingTo(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ);
}
