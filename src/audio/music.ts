import type { Sound } from './sound.ts';

const BPM = 152;
const STEP = 60 / BPM / 4;
const LOOK_AHEAD = 0.12;
const MUSIC_LEVEL = 0.16;
const STEPS_PER_BAR = 16;

/** Root note of each bar, as semitones above low E. The loop is 8 bars. */
const BARS = [0, 0, 3, 3, 5, 5, 7, 10];
/** Bass rhythm inside a bar. 1 plays the root, 2 plays it an octave up. */
const BASS = [1, 0, 1, 2, 0, 1, 2, 0, 1, 0, 1, 2, 0, 1, 2, 2];
/** Lead riff inside a bar, as scale steps above the root. -1 is a rest. */
const LEAD = [7, -1, 12, -1, 10, 7, -1, 12, -1, 15, 12, -1, 10, -1, 7, 10];
const LOW_E = 82.41;

function pitch(semitones: number): number {
  return LOW_E * Math.pow(2, semitones / 12);
}

/** A driving synth loop, scheduled a little ahead of the audio clock. */
export class Music {
  private sound: Sound;
  private out: GainNode;
  private step = 0;
  private nextTime = 0;
  private isPlaying = false;

  constructor(sound: Sound) {
    this.sound = sound;
    this.out = sound.context.createGain();
    this.out.gain.value = MUSIC_LEVEL;
    this.out.connect(sound.master);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.step = 0;
    this.nextTime = this.sound.context.currentTime + 0.05;
  }

  stop(): void {
    this.isPlaying = false;
  }

  /** Call every frame. Queues any notes that fall inside the look-ahead window. */
  update(): void {
    if (!this.isPlaying) return;
    const now = this.sound.context.currentTime;
    if (this.nextTime < now - 0.5) this.nextTime = now;
    while (this.nextTime < now + LOOK_AHEAD) {
      this.queueStep(this.step, this.nextTime - now);
      this.step = (this.step + 1) % (STEPS_PER_BAR * BARS.length);
      this.nextTime += STEP;
    }
  }

  private queueStep(step: number, at: number): void {
    const root = BARS[Math.floor(step / STEPS_PER_BAR)]!;
    const beat = step % STEPS_PER_BAR;
    const bass = BASS[beat]!;
    const lead = LEAD[beat]!;
    if (bass > 0) {
      const from = pitch(root + (bass === 2 ? 12 : 0));
      this.sound.play([{ from, at, length: STEP * 1.6, level: 0.5, wave: 'sawtooth' }], this.out);
    }
    if (lead >= 0) {
      const from = pitch(root + lead + 12);
      this.sound.play([{ from, at, length: STEP * 1.2, level: 0.2, wave: 'square' }], this.out);
    }
    if (beat % 4 === 0) this.kick(at);
    if (beat % 8 === 4) this.sound.thud(0.22, 0.12, 5000, at);
    if (beat % 2 === 1) this.sound.thud(0.06, 0.04, 9000, at);
  }

  private kick(at: number): void {
    this.sound.play([{ from: 150, to: 42, at, length: 0.16, level: 0.9, wave: 'sine' }], this.out);
  }
}
