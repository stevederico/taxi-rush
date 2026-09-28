const MASTER_LEVEL = 0.55;
const NOISE_SECONDS = 1;

/** One tone in a sound effect. */
export interface Note {
  /** Hz at the start of the note. */
  from: number;
  /** Hz at the end of the note. Defaults to the start. */
  to?: number;
  /** Seconds after the effect starts. */
  at: number;
  length: number;
  level: number;
  wave: OscillatorType;
}

/** Shared audio output, created on the first tap or key press. */
export class Sound {
  readonly context: AudioContext;
  readonly master: GainNode;
  readonly noise: AudioBuffer;
  private muted = false;

  constructor() {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = MASTER_LEVEL;
    this.master.connect(this.context.destination);
    this.noise = this.makeNoise();
  }

  private makeNoise(): AudioBuffer {
    const { sampleRate } = this.context;
    const buffer = this.context.createBuffer(1, sampleRate * NOISE_SECONDS, sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return buffer;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setMuted(isMuted: boolean): void {
    this.muted = isMuted;
    this.master.gain.setTargetAtTime(isMuted ? 0 : MASTER_LEVEL, this.context.currentTime, 0.03);
  }

  /** Browsers suspend audio until a gesture, and again when the tab hides. */
  resume(): void {
    if (this.context.state === 'suspended') void this.context.resume();
  }

  suspend(): void {
    if (this.context.state === 'running') void this.context.suspend();
  }

  /** Play a short run of tones. */
  play(notes: readonly Note[], out: AudioNode = this.master): void {
    const now = this.context.currentTime;
    for (const note of notes) {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const start = now + note.at;
      const end = start + note.length;
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.from, start);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, end);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(note.level, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(out);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }

  /** Play a burst of filtered noise, for crashes and thumps. */
  thud(level: number, length: number, cutoff: number, at = 0): void {
    const start = this.context.currentTime + at;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noise;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * 0.2), start + length);
    gain.gain.setValueAtTime(level, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + length + 0.02);
  }
}
