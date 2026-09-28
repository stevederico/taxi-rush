import { Audio } from './audio/audio.ts';
import { createAutopilot, steerAutopilot } from './game/autopilot.ts';
import { START_CLOCK } from './game/constants.ts';
import { createGame, drainEvents, stepGame } from './game/game.ts';
import type { Game } from './game/game.ts';
import { stepTraffic } from './game/traffic.ts';
import { Controls } from './input/controls.ts';
import { WorldView } from './render/worldView.ts';
import { loadBest, saveBest } from './ui/bestScore.ts';
import { byId } from './ui/dom.ts';
import { Hud } from './ui/hud.ts';
import { Minimap } from './ui/minimap.ts';
import { Screens } from './ui/screens.ts';

const CITY_SEED = 2026;
const STEP = 1 / 60;
const MAX_FRAME = 0.1;
const LAST_SECONDS = 10;

type Mode = 'title' | 'playing' | 'paused' | 'over';

/** Owns the game, the views and the loop that ties them together. */
export class App {
  private game: Game = createGame(CITY_SEED);
  private pilot = createAutopilot();
  private view: WorldView;
  private hud = new Hud();
  private minimap: Minimap;
  private audio = new Audio();
  private controls: Controls;
  private screens: Screens;
  private muteButton = byId('mute-button');
  private mode: Mode = 'title';
  private lastFrame = 0;
  private backlog = 0;
  private time = 0;
  private runs = 0;
  /** When true the autopilot drives during a run. For demos and tests. */
  isSelfDriving = false;

  constructor(canvas: HTMLCanvasElement) {
    this.view = new WorldView(canvas, this.game);
    this.minimap = new Minimap(byId<HTMLCanvasElement>('minimap'), this.game.city);
    this.controls = new Controls(window, byId('touch'));
    this.screens = new Screens({
      start: () => this.start(),
      resume: () => this.resume(),
      quit: () => this.finish(),
    });
    this.screens.showBest(loadBest());
    this.muteButton.classList.toggle('is-muted', this.audio.isMuted);
    this.listen();
    this.resize();
    requestAnimationFrame((now) => this.frame(now));
  }

  /** Read-only peek at the current run, for tests and debugging. */
  get state(): { mode: Mode; game: Game } {
    return { mode: this.mode, game: this.game };
  }

  /** GPU object counts. Should stay flat once every kind of fare has been seen. */
  get gpuMemory(): { geometries: number; textures: number } {
    return this.view.gpuMemory;
  }

  private listen(): void {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (event) => this.handleKey(event));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    byId('pause-button').addEventListener('click', () => this.pause());
    this.muteButton.addEventListener('click', () => this.toggleMute());
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (event.code === 'KeyM') this.toggleMute();
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (this.mode === 'playing') this.pause();
      else if (this.mode === 'paused') this.resume();
    }
    const isOnButton = event.target instanceof HTMLButtonElement;
    const isOnMenu = this.mode === 'title' || this.mode === 'over';
    if (event.code === 'Enter' && isOnMenu && !isOnButton) this.start();
  }

  /** Drop keyboard focus, so Space drifts and does not press the last button. */
  private dropFocus(): void {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  private toggleMute(): void {
    this.audio.unlock();
    this.muteButton.classList.toggle('is-muted', this.audio.toggleMute());
    this.dropFocus();
  }

  private resize(): void {
    this.view.resize(window.innerWidth, window.innerHeight);
    this.frameMenu();
  }

  /** Keep the cab in view beside the menu card, not behind it. */
  private frameMenu(): void {
    this.view.setMenuSpot(this.screens.clearSpot());
  }

  private start(): void {
    this.runs++;
    this.game = createGame(CITY_SEED, Date.now() + this.runs);
    this.view.reset(this.game);
    this.hud.reset();
    this.hud.setVisible(true);
    this.screens.show('none');
    this.dropFocus();
    this.audio.unlock();
    this.audio.setPaused(false);
    this.audio.startRun();
    this.backlog = 0;
    this.mode = 'playing';
    this.hud.announce('Find A Fare', 'Stop In A Glowing Ring', 'info');
  }

  private pause(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.controls.releaseTouch();
    this.audio.setPaused(true);
    this.screens.show('pause');
  }

  private resume(): void {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.backlog = 0;
    this.audio.setPaused(false);
    this.screens.show('none');
    this.dropFocus();
  }

  /** End the run now and show the results. */
  private finish(): void {
    const isNewBest = saveBest(this.game.cash);
    this.mode = 'over';
    this.game.isOver = true;
    this.controls.releaseTouch();
    this.audio.setPaused(false);
    this.audio.endRun();
    this.hud.setVisible(false);
    this.screens.showResults(this.game, loadBest(), isNewBest);
    this.screens.showBest(loadBest());
    this.screens.show('over');
    this.frameMenu();
  }

  private play(dt: number): void {
    const input = this.isSelfDriving
      ? steerAutopilot(this.pilot, this.game, dt)
      : this.controls.read();
    const before = Math.ceil(this.game.clock);
    this.backlog = Math.min(this.backlog + dt, STEP * 6);
    while (this.backlog >= STEP) {
      stepGame(this.game, input, STEP);
      this.backlog -= STEP;
    }
    const after = Math.ceil(this.game.clock);
    if (after < before && after <= LAST_SECONDS && after > 0) this.audio.tick();
    for (const event of drainEvents(this.game)) {
      this.view.handle(event, this.game);
      this.hud.handle(event);
      this.audio.handle(event);
    }
    this.audio.update(this.game.car, input);
    this.hud.update(this.game);
    this.minimap.draw(this.game, this.time);
    if (this.game.isOver) this.finish();
  }

  /** Behind the title the cab drives itself. After a run only the traffic moves. */
  private idle(dt: number): void {
    const { traffic, car, world, rng } = this.game;
    if (this.mode === 'over') return stepTraffic(traffic, car, world, rng, dt);
    this.game.clock = START_CLOCK;
    stepGame(this.game, steerAutopilot(this.pilot, this.game, dt), Math.min(dt, STEP * 2));
    for (const event of drainEvents(this.game)) this.view.handle(event, this.game);
  }

  private tick(dt: number): void {
    this.time += dt;
    if (this.mode === 'playing') this.play(dt);
    else if (this.mode !== 'paused') this.idle(dt);
    const isAttract = this.mode === 'title' || this.mode === 'over';
    this.view.render(this.game, this.mode === 'paused' ? 0 : dt, isAttract);
  }

  /**
   * Run the loop by hand. Browsers stop sending frames to hidden tabs, so
   * automated tests use this to keep the game moving.
   */
  advance(seconds: number): void {
    for (let t = 0; t < seconds; t += STEP) this.tick(STEP);
  }

  private frame(now: number): void {
    const dt = Math.min(MAX_FRAME, (now - this.lastFrame) / 1000 || 0);
    this.lastFrame = now;
    this.tick(dt);
    requestAnimationFrame((next) => this.frame(next));
  }
}
