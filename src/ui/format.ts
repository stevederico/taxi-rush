const KMH_PER_UNIT = 3.6;

/** Whole dollars with thousands separators, such as 1,250. */
export function formatCash(amount: number): string {
  return Math.round(amount).toLocaleString('en-US');
}

/** Game speed (units per second) as whole km/h. */
export function formatSpeed(speed: number): string {
  return String(Math.round(Math.abs(speed) * KMH_PER_UNIT));
}

/** Seconds as minutes and seconds, such as 2:05. */
export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Seconds left on the clock, rounded up so 0 only shows when time is out. */
export function formatClock(seconds: number): string {
  return String(Math.max(0, Math.ceil(seconds)));
}
