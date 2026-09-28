import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
} from 'three';
import { memo } from './memo.ts';

const BEAM_HEIGHT = 46;
const RING_Y = 0.08;
const RING_WIDTH = 0.7;
const RING_OPACITY = 0.7;
const BEAM_OPACITY = 0.16;

const beamGeometry = new CylinderGeometry(1, 1, BEAM_HEIGHT, 20, 1, true);
beamGeometry.translate(0, BEAM_HEIGHT / 2, 0);

const ringGeometry = memo((radius: number) => new RingGeometry(radius - RING_WIDTH, radius, 40));

/** Every beacon of one color shares these, so they pulse in step. */
const materialsFor = memo((color: number) => ({
  ring: new MeshBasicMaterial({
    color, transparent: true, opacity: RING_OPACITY, side: DoubleSide, depthWrite: false,
  }),
  beam: new MeshBasicMaterial({
    color, transparent: true, opacity: BEAM_OPACITY, side: DoubleSide, depthWrite: false, fog: false,
  }),
}));

/** A glowing ring on the road with a beam of light, to mark a place to stop. */
export class Beacon {
  readonly group = new Group();
  private ring: Mesh;
  private ringMaterial: MeshBasicMaterial;

  constructor(radius: number, color: number) {
    const materials = materialsFor(color);
    this.ringMaterial = materials.ring;
    this.ring = new Mesh(ringGeometry(radius), materials.ring);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = RING_Y;
    const beam = new Mesh(beamGeometry, materials.beam);
    beam.scale.set(radius * 0.45, 1, radius * 0.45);
    this.group.add(this.ring, beam);
  }

  place(x: number, z: number): void {
    this.group.position.set(x, 0, z);
  }

  /** Breathe in and out so the eye catches it. */
  animate(time: number): void {
    const pulse = 1 + Math.sin(time * 4) * 0.06;
    this.ring.scale.set(pulse, pulse, 1);
    this.ringMaterial.opacity = RING_OPACITY + Math.sin(time * 4) * 0.2;
  }
}
