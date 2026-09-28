/** A point on screen as fractions of its width and height, 0 to 1 from the top left. */
export interface ScreenSpot {
  x: number;
  y: number;
}

export interface CardBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Narrowest strip beside or below the card that the cab can be shown in. */
const MIN_SIDE_ROOM = 150;
const MIN_BELOW_ROOM = 110;
/** Down a little from the middle, so the cab sits on the road, not in the sky. */
const SIDE_HEIGHT = 0.6;
export const CENTER: ScreenSpot = { x: 0.5, y: 0.5 };

/**
 * Where to put the cab so the menu card does not cover it: the middle of the
 * wider side strip, else the strip below the card, else the middle.
 */
export function clearSpot(card: CardBox, width: number, height: number): ScreenSpot {
  const leftRoom = card.left;
  const rightRoom = width - card.right;
  if (Math.max(leftRoom, rightRoom) >= MIN_SIDE_ROOM) {
    const x = leftRoom >= rightRoom ? leftRoom / 2 : card.right + rightRoom / 2;
    return { x: x / width, y: SIDE_HEIGHT };
  }
  const belowRoom = height - card.bottom;
  if (belowRoom >= MIN_BELOW_ROOM) return { x: 0.5, y: (card.bottom + belowRoom / 2) / height };
  return CENTER;
}
