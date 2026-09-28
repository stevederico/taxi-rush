import { Color, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, Shape } from 'three';
import { headingTo } from '../game/math.ts';
import { shortestTurn } from './angles.ts';

const TURN_EASE = 9;
const THICKNESS = 0.5;
const SIZE = 0.5;
/** Tip the arrow toward the viewer so its top face can be read. */
const TILT = 1.05;
/** The edges are drawn darker than the faces, so the shape reads as solid. */
const EDGE_SHADE = 0.45;
/** Where the arrow sits in front of the camera: up and ahead. */
const SPOT = { y: 2.9, z: -8 };
/** On tall screens the arrow is smaller and lower, clear of the HUD. */
const TALL_SPOT_Y = 1.7;
const TALL_SIZE = 0.3;

/** Outline of the arrow, pointing along +y before it is laid flat. */
function makeOutline(): Shape {
  const shape = new Shape();
  shape.moveTo(0, 2.4);
  shape.lineTo(1.7, 0.4);
  shape.lineTo(0.7, 0.4);
  shape.lineTo(0.7, -2);
  shape.lineTo(-0.7, -2);
  shape.lineTo(-0.7, 0.4);
  shape.lineTo(-1.7, 0.4);
  shape.closePath();
  return shape;
}

/**
 * The big arrow that points where to go. It rides with the camera, so it is
 * always at the top of the screen, and turns to face the target.
 */
export class Arrow {
  readonly group = new Group();
  private needle: Mesh;
  private face = new MeshBasicMaterial({ fog: false, depthTest: false });
  private edge = new MeshBasicMaterial({ fog: false, depthTest: false });
  private tint = new Color();
  private turn = 0;
  private size = SIZE;
  private spotY = SPOT.y;

  constructor() {
    const geometry = new ExtrudeGeometry(makeOutline(), {
      depth: THICKNESS,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 1,
    });
    geometry.translate(0, 0, -THICKNESS / 2);
    geometry.rotateX(Math.PI / 2);
    this.needle = new Mesh(geometry, [this.face, this.edge]);
    this.needle.renderOrder = 10;
    this.group.add(this.needle);
    this.group.rotation.x = TILT;
    this.group.position.set(0, SPOT.y, SPOT.z);
    this.group.visible = false;
  }

  /** Fit the arrow to the shape of the screen. */
  fit(aspect: number): void {
    const isTall = aspect < 1;
    this.size = isTall ? TALL_SIZE : SIZE;
    this.spotY = isTall ? TALL_SPOT_Y : SPOT.y;
  }

  /** Point from a place toward a target, as seen by a camera facing viewHeading. */
  update(
    from: { x: number; z: number },
    target: { x: number; z: number },
    viewHeading: number,
    color: number,
    time: number,
    dt: number,
  ): void {
    this.group.visible = true;
    this.face.color.setHex(color);
    this.edge.color.copy(this.tint.setHex(color)).multiplyScalar(EDGE_SHADE);
    const want = shortestTurn(viewHeading, headingTo(from.x, from.z, target.x, target.z));
    this.turn += shortestTurn(this.turn, want) * Math.min(1, TURN_EASE * dt);
    this.needle.rotation.y = Math.PI + this.turn;
    this.group.position.y = this.spotY + Math.sin(time * 5) * 0.08;
    this.group.scale.setScalar(this.size * (1 + Math.sin(time * 7) * 0.05));
  }

  hide(): void {
    this.group.visible = false;
  }
}
