import { Group } from 'three';
import type { Sprite } from 'three';
import { DROPOFF_RADIUS, PICKUP_RADIUS } from '../game/constants.ts';
import type { Stop } from '../game/cityTypes.ts';
import type { Fare, FareBook, FareTier } from '../game/fares.ts';
import { Beacon } from './beacon.ts';
import { Figure } from './figure.ts';
import { makeLabel } from './labels.ts';
import { DESTINATION, TIER_COLORS } from './palette.ts';

const TIER_TEXT: Record<FareTier, string> = { short: '$', medium: '$$', long: '$$$' };
const LABEL_HEIGHT = 5.4;
const CHEER_TIME = 3.5;

function cssColor(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

interface Hailer {
  fare: Fare;
  group: Group;
  figure: Figure;
  beacon: Beacon;
  label: Sprite;
}

/** Waiting passengers, the drop-off beacon and the passenger who just got out. */
export class FaresView {
  readonly group = new Group();
  private hailers = new Map<number, Hailer>();
  private destination = new Beacon(DROPOFF_RADIUS, DESTINATION);
  private cheerer: Figure | null = null;
  private cheerLeft = 0;

  constructor() {
    this.destination.group.visible = false;
    this.group.add(this.destination.group);
  }

  private addHailer(fare: Fare): void {
    const color = TIER_COLORS[fare.tier];
    const figure = new Figure(fare.look);
    figure.place(fare.from.curbX, fare.from.curbZ, fare.from.x, fare.from.z);
    const beacon = new Beacon(PICKUP_RADIUS, color);
    beacon.place(fare.from.x, fare.from.z);
    const label = makeLabel(TIER_TEXT[fare.tier], cssColor(color));
    label.position.set(fare.from.curbX, LABEL_HEIGHT, fare.from.curbZ);
    const group = new Group();
    group.add(figure.group, beacon.group, label);
    this.group.add(group);
    this.hailers.set(fare.id, { fare, group, figure, beacon, label });
  }

  /** Remove every marker, ready for a new run. */
  clear(): void {
    for (const hailer of this.hailers.values()) this.group.remove(hailer.group);
    this.hailers.clear();
    if (this.cheerer) this.group.remove(this.cheerer.group);
    this.cheerer = null;
  }

  /** Show someone cheering on the curb after a drop-off. */
  cheer(stop: Stop, look: number): void {
    if (this.cheerer) this.group.remove(this.cheerer.group);
    this.cheerer = new Figure(look);
    this.cheerer.place(stop.curbX, stop.curbZ, stop.x, stop.z);
    this.cheerLeft = CHEER_TIME;
    this.group.add(this.cheerer.group);
  }

  /** Match the markers to the fares that exist right now. */
  update(book: FareBook, time: number, dt: number): void {
    const waiting = new Set(book.waiting.map((f) => f.id));
    for (const [id, hailer] of this.hailers) {
      if (waiting.has(id)) continue;
      this.group.remove(hailer.group);
      this.hailers.delete(id);
    }
    for (const fare of book.waiting) {
      if (!this.hailers.has(fare.id)) this.addHailer(fare);
    }
    const isCarrying = book.active !== null;
    for (const hailer of this.hailers.values()) {
      hailer.figure.animate(time, false);
      hailer.beacon.animate(time);
      hailer.beacon.group.visible = !isCarrying;
      hailer.label.visible = !isCarrying;
    }
    this.destination.group.visible = isCarrying;
    if (book.active) {
      this.destination.place(book.active.fare.to.x, book.active.fare.to.z);
      this.destination.animate(time);
    }
    this.updateCheerer(time, dt);
  }

  private updateCheerer(time: number, dt: number): void {
    if (!this.cheerer) return;
    this.cheerLeft -= dt;
    this.cheerer.animate(time, true);
    if (this.cheerLeft > 0) return;
    this.group.remove(this.cheerer.group);
    this.cheerer = null;
  }
}
