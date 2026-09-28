import { CAR_RADIUS } from '../game/constants.ts';
import type { Game, GameEvent } from '../game/game.ts';
import { groundHeight } from '../game/ramps.ts';
import { Arrow } from './arrow.ts';
import { makeBuildings } from './buildings.ts';
import { ChaseCam } from './chaseCam.ts';
import { Effects } from './effects.ts';
import { FaresView } from './faresView.ts';
import { makeGround } from './ground.ts';
import * as palette from './palette.ts';
import { makeProps } from './props.ts';
import { Stage } from './stage.ts';
import { TaxiView } from './taxiView.ts';
import { makeGroundTexture, makeWindowTexture } from './textures.ts';
import { TrafficView } from './trafficView.ts';
import { CENTER } from '../ui/clearSpot.ts';
import type { ScreenSpot } from '../ui/clearSpot.ts';

const SMOKE_SLIP = 7;
const SMOKE_RATE = 0.03;
const SHAKE_PER_IMPACT = 0.03;

/** Everything drawn in 3D, kept in step with one game. */
export class WorldView {
  readonly cam = new ChaseCam();
  private stage: Stage;
  private taxi = new TaxiView();
  private traffic: TrafficView;
  private fares = new FaresView();
  private arrow = new Arrow();
  private effects = new Effects();
  private time = 0;
  private smokeDue = 0;
  private menuSpot: ScreenSpot = CENTER;

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.stage = new Stage(canvas);
    const anisotropy = this.stage.maxAnisotropy;
    this.traffic = new TrafficView(game.traffic);
    this.stage.scene.add(
      makeGround(game.city.blocks, makeGroundTexture(anisotropy)),
      makeBuildings(game.city.buildings, makeWindowTexture(anisotropy)),
      makeProps(game.city),
      this.taxi.group,
      this.traffic.group,
      this.fares.group,
      this.effects.mesh,
      this.cam.camera,
    );
    this.cam.camera.add(this.arrow.group);
  }

  /** Where on screen the cab should sit while a menu is showing. */
  setMenuSpot(spot: ScreenSpot): void {
    this.menuSpot = spot;
  }

  /** Live GPU object counts, for spotting leaks while testing. */
  get gpuMemory(): { geometries: number; textures: number } {
    const { geometries, textures } = this.stage.renderer.info.memory;
    return { geometries, textures };
  }

  /** Switch to a new run in the same city. */
  reset(game: Game): void {
    this.traffic.repaint(game.traffic);
    this.fares.clear();
    this.cam.snap();
    this.smokeDue = 0;
  }

  resize(width: number, height: number): void {
    this.stage.resize(width, height);
    this.cam.resize(width, height);
    this.arrow.fit(width / height);
  }

  /** React to things that happened in the game with particles and camera shake. */
  handle(event: GameEvent, game: Game): void {
    const { x, y, z } = game.car;
    const at = { x, y: y + 0.6, z };
    if (event.type === 'crash' || event.type === 'bump') {
      this.cam.addShake(event.impact * SHAKE_PER_IMPACT);
      this.effects.burst({ ...at, count: 14, color: palette.SPARK, speed: 9, lift: 7, life: 0.6, size: 0.35, growth: 0, weight: 1 });
    }
    if (event.type === 'land') {
      this.cam.addShake(Math.min(0.6, event.airTime * 0.5));
      this.effects.burst({ ...at, y: 0.3, count: 16, color: palette.DUST, speed: 7, lift: 2, life: 0.7, size: 0.7, growth: 1.5, weight: 0.05 });
    }
    if (event.type === 'dropoff') {
      this.fares.cheer(event.payout.fare.to, event.payout.fare.look);
      this.effects.burst({ ...at, y: 2, count: 26, color: palette.COIN, speed: 6, lift: 12, life: 1.1, size: 0.4, growth: 0, weight: 1 });
    }
    if (event.type === 'pickup') {
      this.effects.burst({ ...at, y: 2, count: 12, color: palette.TIER_COLORS[event.fare.tier], speed: 5, lift: 8, life: 0.8, size: 0.35, growth: 0, weight: 0.8 });
    }
  }

  /** Draw one frame. In attract mode the camera circles and the arrow hides. */
  render(game: Game, dt: number, isAttract: boolean): void {
    this.time += dt;
    const { car } = game;
    const ground = groundHeight(game.city.ramps, car.x, car.z);
    this.taxi.update(car, ground, dt);
    this.traffic.update(game.traffic, dt);
    this.fares.update(game.fares, this.time, dt);
    this.smoke(game, dt);
    this.effects.update(dt);
    if (isAttract) this.cam.orbit(car.x, car.z, this.time, this.menuSpot);
    else this.cam.follow(car, dt);
    this.pointArrow(game, dt, isAttract);
    this.stage.center(car.x, car.z);
    this.stage.renderer.render(this.stage.scene, this.cam.camera);
  }

  private smoke(game: Game, dt: number): void {
    const { car } = game;
    this.smokeDue -= dt;
    const isSliding = car.grounded && Math.abs(car.slip) > SMOKE_SLIP;
    if (!isSliding || this.smokeDue > 0) return;
    this.smokeDue = SMOKE_RATE;
    const x = car.x - Math.sin(car.heading) * CAR_RADIUS;
    const z = car.z - Math.cos(car.heading) * CAR_RADIUS;
    this.effects.burst({ x, y: car.y + 0.3, z, count: 2, color: palette.SMOKE, speed: 1.5, lift: 1.6, life: 0.7, size: 0.7, growth: 2.2, weight: -0.02 });
  }

  private pointArrow(game: Game, dt: number, isAttract: boolean): void {
    const { car, fares } = game;
    if (isAttract || game.isOver) return this.arrow.hide();
    const view = this.cam.viewHeading;
    if (fares.active) {
      return this.arrow.update(car, fares.active.fare.to, view, palette.ARROW, this.time, dt);
    }
    let nearest = fares.waiting[0];
    for (const fare of fares.waiting) {
      const gap = Math.hypot(fare.from.x - car.x, fare.from.z - car.z);
      if (nearest && gap < Math.hypot(nearest.from.x - car.x, nearest.from.z - car.z)) nearest = fare;
    }
    if (!nearest) return this.arrow.hide();
    this.arrow.update(car, nearest.from, view, palette.ARROW_SEEKING, this.time, dt);
  }
}
