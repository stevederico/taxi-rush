const TOUCH_CLASS = 'is-touch';

/** True on phones and tablets, where a finger is the main pointer. */
export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Show the on-screen driving buttons on touch devices. Laptops with a touch
 * screen get them too, the first time the screen is touched.
 */
export function watchForTouch(root: HTMLElement): void {
  if (isTouchDevice()) root.classList.add(TOUCH_CLASS);
  const handlePointer = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    root.classList.add(TOUCH_CLASS);
    window.removeEventListener('pointerdown', handlePointer);
  };
  window.addEventListener('pointerdown', handlePointer);
}
