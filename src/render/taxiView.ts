import { Group, Mesh, MeshBasicMaterial, MeshPhongMaterial, CircleGeometry } from 'three';
import { clamp } from '../game/math.ts';
import { isOnRoad } from '../game/roads.ts';
import type { Vehicle } from '../game/vehicle.ts';
import { makeTaxiBody, makeWheel, WHEEL_RADIUS, WHEEL_X, WHEEL_Z } from './carModels.ts';
import { CURB_HEIGHT } from './ground.ts';

const MAX_STEER_ANGLE = 0.5;
const ROLL_PER_SLIP = 0.012;
const ROLL_PER_TURN = 0.0022;
const AIR_PITCH = 0.02;
const MAX_AIR_PITCH = 0.35;
const MIN_SLOPE_SPEED = 6;
const MAX_ROLL = 0.16;
const PITCH_PER_ACCEL = 0.0035;
const MAX_PITCH = 0.09;
const LEAN_EASE = 8;
const SHADOW_RADIUS = 2.6;

/** The player's cab: body, four spinning wheels and a soft shadow blob. */
export class TaxiView {
  readonly group = new Group();
  private body = new Group();
  private wheels: Mesh[] = [];
  private shadow: Mesh;
  private spin = 0;
  private roll = 0;
  private pitch = 0;
  private lift = 0;
  private lastSpeed = 0;

  constructor() {
    const paint = new MeshPhongMaterial({ vertexColors: true, shininess: 70, specular: 0x555555 });
    const shell = new Mesh(makeTaxiBody(), paint);
    shell.castShadow = true;
    this.body.add(shell);
    const wheel = makeWheel();
    for (const x of [-WHEEL_X, WHEEL_X]) {
      for (const z of [WHEEL_Z, -WHEEL_Z]) {
        const mesh = new Mesh(wheel, paint);
        mesh.position.set(x, WHEEL_RADIUS, z);
        mesh.rotation.order = 'YXZ';
        this.wheels.push(mesh);
        this.body.add(mesh);
      }
    }
    this.shadow = new Mesh(
      new CircleGeometry(SHADOW_RADIUS, 20),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(0.62, 1, 1);
    this.group.add(this.body, this.shadow);
  }

  /** Match the view to the car. groundY is the surface height under it. */
  update(car: Vehicle, groundY: number, dt: number): void {
    const ease = Math.min(1, LEAN_EASE * dt);
    const curb = isOnRoad(car.x, car.z) ? 0 : CURB_HEIGHT;
    this.lift += (curb - this.lift) * ease;
    this.group.position.set(car.x, 0, car.z);
    this.group.rotation.y = car.heading;
    this.lean(car, dt, ease);
    this.body.position.y = car.y + this.lift;
    this.shadow.position.y = groundY + this.lift + 0.05;
    const height = Math.max(0, car.y - groundY);
    const fade = Math.max(0.35, 1 - height / 8);
    this.shadow.scale.set(0.62 * fade, fade, 1);
    this.spinWheels(car, dt);
  }

  private lean(car: Vehicle, dt: number, ease: number): void {
    const accel = dt > 0 ? (car.speed - this.lastSpeed) / dt : 0;
    this.lastSpeed = car.speed;
    const sway = car.slip * ROLL_PER_SLIP - car.steer * car.speed * ROLL_PER_TURN;
    const squat = clamp(-accel * PITCH_PER_ACCEL, -MAX_PITCH, MAX_PITCH);
    const flight = car.grounded ? 0 : clamp(-car.vy * AIR_PITCH, -MAX_AIR_PITCH, MAX_AIR_PITCH);
    this.roll += (clamp(sway, -MAX_ROLL, MAX_ROLL) - this.roll) * ease;
    this.pitch += (squat + flight - this.pitch) * ease;
    const slope = car.grounded ? -Math.atan2(car.vy, Math.max(MIN_SLOPE_SPEED, Math.abs(car.speed))) : 0;
    this.body.rotation.set(this.pitch + slope, 0, this.roll);
  }

  private spinWheels(car: Vehicle, dt: number): void {
    this.spin += (car.speed / WHEEL_RADIUS) * dt;
    this.wheels.forEach((wheel, i) => {
      const isFront = i % 2 === 0;
      wheel.rotation.y = isFront ? -car.steer * MAX_STEER_ANGLE : 0;
      wheel.rotation.x = this.spin;
    });
  }
}
