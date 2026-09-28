const TAU = Math.PI * 2;

/** Signed shortest rotation that takes one heading to another. */
export function shortestTurn(from: number, to: number): number {
  return ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI;
}
