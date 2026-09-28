const STORAGE_KEY = 'taxi-rush-best';

/** Best cash total saved on this device, or 0. Private browsing may block storage. */
export function loadBest(): number {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}

/** Save a score if it beats the best. Returns true when it is a new best. */
export function saveBest(cash: number): boolean {
  if (cash <= loadBest()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(cash)));
  } catch {
    return true;
  }
  return true;
}
