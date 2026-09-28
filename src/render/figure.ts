import { Group, Mesh, MeshLambertMaterial, SphereGeometry } from 'three';
import { MeshBuilder } from './meshBuilder.ts';
import { memo } from './memo.ts';
import { OUTFITS, SKIN_TONES } from './palette.ts';

const PANTS = 0x2b3140;
const FIGURE_SCALE = 1.35;
const WAVE_SPEED = 9;
const BOB_SPEED = 5;

const headGeometry = new SphereGeometry(0.3, 10, 8);
const bodyMaterial = new MeshLambertMaterial({ vertexColors: true });
const headMaterial = memo((skin: number) => new MeshLambertMaterial({ color: skin }));

const torsoGeometry = memo((shirt: number) => {
  const builder = new MeshBuilder();
  builder.addSlab({ x: -0.16, y: 0, z: 0, width: 0.24, depth: 0.26, height: 0.85, color: PANTS });
  builder.addSlab({ x: 0.16, y: 0, z: 0, width: 0.24, depth: 0.26, height: 0.85, color: PANTS });
  builder.addSlab({
    x: 0, y: 0.85, z: 0, width: 0.62, depth: 0.34, height: 0.7,
    topWidth: 0.74, topDepth: 0.36, color: shirt,
  });
  builder.addSlab({ x: -0.46, y: 0.85, z: 0, width: 0.16, depth: 0.2, height: 0.68, color: shirt });
  return builder.build();
});

/** Keyed by look, since a look fixes both the shirt and the skin. */
const LOOKS = OUTFITS.length * SKIN_TONES.length;
const armGeometry = memo((look: number) => {
  const builder = new MeshBuilder();
  const shirt = OUTFITS[look % OUTFITS.length]!;
  const skin = SKIN_TONES[look % SKIN_TONES.length]!;
  builder.addSlab({ x: 0, y: 0, z: 0, width: 0.16, depth: 0.2, height: 0.5, color: shirt });
  builder.addSlab({ x: 0, y: 0.5, z: 0, width: 0.15, depth: 0.18, height: 0.28, color: skin });
  return builder.build();
});

/**
 * A small person who waves one arm to hail the cab. All figures share their
 * geometry and materials, so making and dropping them costs no GPU memory.
 */
export class Figure {
  readonly group = new Group();
  private arm = new Group();
  private phase: number;

  constructor(look: number) {
    const shirt = OUTFITS[look % OUTFITS.length]!;
    const skin = SKIN_TONES[look % SKIN_TONES.length]!;
    const head = new Mesh(headGeometry, headMaterial(skin));
    head.position.y = 1.85;
    this.arm.add(new Mesh(armGeometry(look % LOOKS), bodyMaterial));
    this.arm.position.set(0.46, 1.45, 0);
    this.phase = look * 1.7;
    this.group.add(new Mesh(torsoGeometry(shirt), bodyMaterial), head, this.arm);
    this.group.scale.setScalar(FIGURE_SCALE);
    this.group.traverse((part) => {
      part.castShadow = true;
    });
  }

  /** Stand at a point and turn to face another point. */
  place(x: number, z: number, faceX: number, faceZ: number): void {
    this.group.position.set(x, 0.18, z);
    this.group.rotation.y = Math.atan2(faceX - x, faceZ - z);
  }

  /** Wave and bounce. Excited figures jump higher. */
  animate(time: number, isExcited: boolean): void {
    const t = time + this.phase;
    this.arm.rotation.z = -0.35 + Math.sin(t * WAVE_SPEED) * 0.45;
    const hop = Math.abs(Math.sin(t * BOB_SPEED)) * (isExcited ? 0.5 : 0.12);
    this.group.position.y = 0.18 + hop;
  }
}
