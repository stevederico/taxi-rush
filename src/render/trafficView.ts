import { Color, DynamicDrawUsage, Group, InstancedMesh, MeshPhongMaterial, Object3D } from 'three';
import type { BufferGeometry } from 'three';
import { isOnRoad } from '../game/roads.ts';
import type { TrafficCar } from '../game/traffic.ts';
import { makeSedan, makeVan } from './carModels.ts';
import { CURB_HEIGHT } from './ground.ts';
import { TRAFFIC_PAINTS } from './palette.ts';
import { shortestTurn } from './angles.ts';

const VAN_EVERY = 4;
const TURN_EASE = 7;
const HEIGHT_EASE = 14;

function isVan(car: TrafficCar): boolean {
  return car.id % VAN_EVERY === 0;
}

/** All traffic, drawn as two instanced meshes: sedans and vans. */
export class TrafficView {
  readonly group = new Group();
  private sedans: InstancedMesh;
  private vans: InstancedMesh;
  private headings = new Map<number, number>();
  private heights = new Map<number, number>();
  private dummy = new Object3D();

  constructor(cars: readonly TrafficCar[]) {
    const material = new MeshPhongMaterial({ vertexColors: true, shininess: 50, specular: 0x333333 });
    this.sedans = this.makeFleet(makeSedan(), material, cars.filter((c) => !isVan(c)));
    this.vans = this.makeFleet(makeVan(), material, cars.filter(isVan));
    this.group.add(this.sedans, this.vans);
  }

  private makeFleet(
    geometry: BufferGeometry,
    material: MeshPhongMaterial,
    cars: readonly TrafficCar[],
  ): InstancedMesh {
    const fleet = new InstancedMesh(geometry, material, Math.max(1, cars.length));
    fleet.count = cars.length;
    fleet.instanceMatrix.setUsage(DynamicDrawUsage);
    fleet.castShadow = true;
    fleet.frustumCulled = false;
    this.paint(fleet, cars);
    return fleet;
  }

  private paint(fleet: InstancedMesh, cars: readonly TrafficCar[]): void {
    const color = new Color();
    cars.forEach((car, i) => {
      fleet.setColorAt(i, color.setHex(TRAFFIC_PAINTS[car.paint % TRAFFIC_PAINTS.length]!));
    });
    if (fleet.instanceColor) fleet.instanceColor.needsUpdate = true;
  }

  /** Take the colors of a new set of cars and forget the old ones' motion. */
  repaint(cars: readonly TrafficCar[]): void {
    this.paint(this.sedans, cars.filter((c) => !isVan(c)));
    this.paint(this.vans, cars.filter(isVan));
    this.headings.clear();
    this.heights.clear();
  }

  /** Move every instance to its car, easing turns and hops so they look smooth. */
  update(cars: readonly TrafficCar[], dt: number): void {
    let sedan = 0;
    let van = 0;
    for (const car of cars) {
      const heading = this.ease(this.headings, car.id, car.heading, TURN_EASE * dt, true);
      const curb = isOnRoad(car.x, car.z) ? 0 : CURB_HEIGHT;
      const y = this.ease(this.heights, car.id, car.y + curb, HEIGHT_EASE * dt, false);
      this.dummy.position.set(car.x, y, car.z);
      this.dummy.rotation.set(0, heading, 0);
      this.dummy.updateMatrix();
      if (isVan(car)) this.vans.setMatrixAt(van++, this.dummy.matrix);
      else this.sedans.setMatrixAt(sedan++, this.dummy.matrix);
    }
    this.sedans.instanceMatrix.needsUpdate = true;
    this.vans.instanceMatrix.needsUpdate = true;
  }

  private ease(store: Map<number, number>, id: number, target: number, rate: number, isAngle: boolean): number {
    const current = store.get(id) ?? target;
    const gap = isAngle ? shortestTurn(current, target) : target - current;
    const next = current + gap * Math.min(1, rate);
    store.set(id, next);
    return next;
  }
}
