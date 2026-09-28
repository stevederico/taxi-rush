import type { GameEvent } from '../game/game.ts';
import type { DriveInput, Vehicle } from '../game/vehicle.ts';
import { EngineSound } from './engine.ts';
import { Music } from './music.ts';
import { Sfx } from './sfx.ts';
import { Sound } from './sound.ts';

const MUTE_KEY = 'taxi-rush-muted';

function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * All game audio. Nothing is created until unlock() runs inside a tap or key
 * press, because browsers block sound before that.
 */
export class Audio {
  private sound: Sound | null = null;
  private engine: EngineSound | null = null;
  private music: Music | null = null;
  private sfx: Sfx | null = null;
  private muted = loadMuted();

  get isMuted(): boolean {
    return this.muted;
  }

  unlock(): void {
    if (!this.sound) {
      this.sound = new Sound();
      this.engine = new EngineSound(this.sound);
      this.music = new Music(this.sound);
      this.sfx = new Sfx(this.sound);
      this.sound.setMuted(this.muted);
    }
    this.sound.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.sound?.setMuted(this.muted);
    try {
      window.localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      return this.muted;
    }
    return this.muted;
  }

  startRun(): void {
    this.sfx?.start();
    this.music?.start();
  }

  endRun(): void {
    this.music?.stop();
    this.engine?.silence();
  }

  /** Quiet everything while paused or while the tab is hidden. */
  setPaused(isPaused: boolean): void {
    if (isPaused) this.sound?.suspend();
    else this.sound?.resume();
  }

  tick(): void {
    this.sfx?.tick();
  }

  handle(event: GameEvent): void {
    this.sfx?.handle(event);
  }

  update(car: Vehicle, input: DriveInput): void {
    this.engine?.update(car, input.throttle);
    this.music?.update();
  }
}
