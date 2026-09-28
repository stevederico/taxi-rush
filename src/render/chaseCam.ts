import { PerspectiveCamera, Vector3 } from 'three';
import { MAX_SPEED } from '../game/constants.ts';
import type { Vehicle } from '../game/vehicle.ts';
import type { ScreenSpot } from '../ui/clearSpot.ts';
import { shortestTurn } from './angles.ts';

const BASE_FOV = 62;
const SPEED_FOV = 16;
const DISTANCE = 10.5;
const SPEED_DISTANCE = 3;
const HEIGHT = 4.6;
const LOOK_AHEAD = 7;
const LOOK_HEIGHT = 1.8;
/** Share of the car's height that the camera follows, so jumps look tall. */
const RISE = 0.35;
const LOOK_RISE = 0.55;
const TURN_EASE = 4.5;
const MOVE_EASE = 14;
const SHAKE_FADE = 5;
const MAX_SHAKE = 1.2;
const PORTRAIT_PULL = 1.35;
const ORBIT_SPEED = 0.12;
const ORBIT_RADIUS = 24;
const ORBIT_HEIGHT = 10;

/** Camera that trails the cab, widens with speed and shakes on impact. */
export class ChaseCam {
  readonly camera = new PerspectiveCamera(BASE_FOV, 1, 0.5, 1600);
  private heading = 0;
  private shake = 0;
  private spot = new Vector3();
  private look = new Vector3();
  private isSnapped = false;
  private width = 1;
  private height = 1;

  /** Heading the camera is looking along, in the same terms as a car's heading. */
  get viewHeading(): number {
    return this.heading;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Rattle the view. Strength is roughly 0 to 1. */
  addShake(strength: number): void {
    this.shake = Math.min(MAX_SHAKE, this.shake + strength);
  }

  /** Jump straight to the chase position on the next update. */
  snap(): void {
    this.isSnapped = false;
  }

  follow(car: Vehicle, dt: number): void {
    if (this.camera.view?.enabled) this.camera.clearViewOffset();
    const pace = Math.min(1, Math.abs(car.speed) / MAX_SPEED);
    const travel = Math.hypot(car.vx, car.vz) > 3 ? Math.atan2(car.vx, car.vz) : car.heading;
    const want = car.speed < -1 ? car.heading : car.heading + shortestTurn(car.heading, travel) * 0.35;
    if (!this.isSnapped) this.heading = want;
    this.heading += shortestTurn(this.heading, want) * Math.min(1, TURN_EASE * dt);
    const pull = this.camera.aspect < 1 ? PORTRAIT_PULL : 1;
    const back = (DISTANCE + SPEED_DISTANCE * pace) * pull;
    this.spot.set(
      car.x - Math.sin(this.heading) * back,
      car.y * RISE + HEIGHT * pull,
      car.z - Math.cos(this.heading) * back,
    );
    if (this.isSnapped) this.camera.position.lerp(this.spot, Math.min(1, MOVE_EASE * dt));
    else this.camera.position.copy(this.spot);
    this.isSnapped = true;
    this.applyShake(dt);
    this.look.set(
      car.x + Math.sin(this.heading) * LOOK_AHEAD,
      car.y * LOOK_RISE + LOOK_HEIGHT,
      car.z + Math.cos(this.heading) * LOOK_AHEAD,
    );
    this.camera.lookAt(this.look);
    this.camera.fov += (BASE_FOV + SPEED_FOV * pace * pace - this.camera.fov) * Math.min(1, 4 * dt);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Slow circle around a point, for the menus. The view is shifted so the
   * point shows at a spot on screen, which keeps it clear of the menu card.
   */
  orbit(x: number, z: number, time: number, spot: ScreenSpot): void {
    const angle = time * ORBIT_SPEED;
    this.camera.position.set(x + Math.sin(angle) * ORBIT_RADIUS, ORBIT_HEIGHT, z + Math.cos(angle) * ORBIT_RADIUS);
    this.camera.lookAt(x, 1, z);
    this.camera.fov = BASE_FOV;
    const { width, height } = this;
    this.camera.setViewOffset(width, height, (0.5 - spot.x) * width, (0.5 - spot.y) * height, width, height);
    this.isSnapped = false;
  }

  private applyShake(dt: number): void {
    if (this.shake <= 0.001) return;
    this.camera.position.x += (Math.random() - 0.5) * this.shake;
    this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.6;
    this.camera.position.z += (Math.random() - 0.5) * this.shake;
    this.shake *= Math.exp(-SHAKE_FADE * dt);
  }
}
