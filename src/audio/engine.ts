import { MAX_SPEED } from '../game/constants.ts';
import type { Vehicle } from '../game/vehicle.ts';
import type { Sound } from './sound.ts';

const GEARS = 5;
const IDLE_HZ = 46;
const REV_RANGE_HZ = 105;
const GEAR_LIFT_HZ = 9;
const ENGINE_LEVEL = 0.14;
const SKID_LEVEL = 0.2;
const SKID_SLIP = 6;
const SKID_FULL_SLIP = 20;
const SMOOTH = 0.05;

/** Pitch of the engine for a speed, with a rev drop at each gear change. */
export function engineHz(speed: number): number {
  const pace = Math.min(1, Math.abs(speed) / MAX_SPEED) * GEARS;
  const gear = Math.min(GEARS - 1, Math.floor(pace));
  const revs = pace - gear;
  return IDLE_HZ + gear * GEAR_LIFT_HZ + revs * REV_RANGE_HZ;
}

/** The running sounds of the cab: engine note and tire squeal. */
export class EngineSound {
  private sound: Sound;
  private low: OscillatorNode;
  private high: OscillatorNode;
  private filter: BiquadFilterNode;
  private level: GainNode;
  private skid: GainNode;

  constructor(sound: Sound) {
    const { context } = sound;
    this.sound = sound;
    this.low = context.createOscillator();
    this.high = context.createOscillator();
    this.low.type = 'sawtooth';
    this.high.type = 'square';
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 2;
    this.level = context.createGain();
    this.level.gain.value = 0;
    const highLevel = context.createGain();
    highLevel.gain.value = 0.35;
    this.low.connect(this.filter);
    this.high.connect(highLevel).connect(this.filter);
    this.filter.connect(this.level).connect(sound.master);
    this.skid = this.makeSkid();
    this.low.start();
    this.high.start();
  }

  private makeSkid(): GainNode {
    const { context, noise, master } = this.sound;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 1700;
    filter.Q.value = 3.5;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(master);
    source.start();
    return gain;
  }

  /** Follow the car. Throttle is the driver's input, -1 to 1. */
  update(car: Vehicle, throttle: number): void {
    const now = this.sound.context.currentTime;
    const hz = engineHz(car.grounded ? car.speed : car.speed * 1.25);
    const push = Math.abs(throttle);
    this.low.frequency.setTargetAtTime(hz, now, SMOOTH);
    this.high.frequency.setTargetAtTime(hz * 2.01, now, SMOOTH);
    this.filter.frequency.setTargetAtTime(380 + hz * 5 + push * 900, now, SMOOTH);
    this.level.gain.setTargetAtTime(ENGINE_LEVEL * (0.45 + push * 0.55), now, SMOOTH);
    const slide = car.grounded ? (Math.abs(car.slip) - SKID_SLIP) / (SKID_FULL_SLIP - SKID_SLIP) : 0;
    this.skid.gain.setTargetAtTime(SKID_LEVEL * Math.max(0, Math.min(1, slide)), now, SMOOTH);
  }

  /** Fade everything out, for menus and the end of a run. */
  silence(): void {
    const now = this.sound.context.currentTime;
    this.level.gain.setTargetAtTime(0, now, 0.1);
    this.skid.gain.setTargetAtTime(0, now, 0.1);
  }
}
