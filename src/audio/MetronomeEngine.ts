import { clampBpm } from '../rhythm';

export type EngineSettings = { bpm: number; offsets: number[]; volume: number; muted: boolean };
export type BeatFrame = { progress: number; active: number; beat: number };
type Beat = { start: number; duration: number; offsets: number[]; index: number };

/** Timers only fill the queue; AudioContext's clock determines every onset. */
export class MetronomeEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private animation = 0;
  private generation = 0;
  private running = false;
  private nextBeat = 0;
  private beatIndex = 0;
  private pending: Beat | null = null;
  private eventIndex = 0;
  private beats: Beat[] = [];
  private voices = new Set<OscillatorNode>();
  private settings: EngineSettings = { bpm: 100, offsets: [], volume: 65, muted: false };

  constructor(private onFrame: (frame: BeatFrame) => void, private onInterruption: () => void) {}

  configure(settings: EngineSettings) {
    this.settings = { ...settings, bpm: clampBpm(settings.bpm), offsets: [...settings.offsets] };
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(settings.muted ? 0 : settings.volume / 100, this.context.currentTime, 0.015);
    }
  }

  async start(): Promise<boolean> {
    if (this.running) return true;
    const generation = ++this.generation;
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
      this.context.onstatechange = () => {
        if (this.running && this.context?.state !== 'running') {
          this.stop();
          this.onInterruption();
        }
      };
    }
    await this.context.resume();
    if (generation !== this.generation) return false;
    if (this.context.state !== 'running') throw new Error('AudioContext did not resume');
    this.master!.gain.value = this.settings.muted ? 0 : this.settings.volume / 100;
    this.running = true;
    this.nextBeat = this.context.currentTime + 0.05;
    this.beatIndex = 0;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), 25);
    this.animate();
    return true;
  }

  stop() {
    ++this.generation;
    this.running = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    cancelAnimationFrame(this.animation);
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
    this.pending = null;
    this.beats = [];
    this.eventIndex = 0;
    this.onFrame({ progress: 0, active: -1, beat: 0 });
  }

  dispose() {
    this.stop();
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => {});
    }
    this.context = null;
    this.master = null;
  }

  private schedule() {
    if (!this.running || !this.context) return;
    const now = this.context.currentTime;
    while (this.beats.length > 2 && this.beats[1].start < now - 1) this.beats.shift();
    // Recover from a throttled/suspended main thread without playing a backlog.
    if (this.nextBeat < now - 0.1 && (!this.pending || this.pending.start + this.pending.duration < now)) {
      this.pending = null;
      this.nextBeat = now + 0.025;
      this.beats = [];
    }
    while (true) {
      if (!this.pending) {
        if (this.nextBeat >= now + 0.1) break;
        this.pending = {
          start: this.nextBeat,
          duration: 60 / this.settings.bpm,
          offsets: [0, ...this.settings.offsets],
          index: this.beatIndex++,
        };
        this.eventIndex = 0;
        this.beats.push(this.pending);
      }
      const beat = this.pending;
      const time = beat.start + beat.offsets[this.eventIndex] * beat.duration;
      if (time >= now + 0.1) break;
      if (time >= now - 0.005) this.click(time, this.eventIndex === 0);
      this.eventIndex++;
      if (this.eventIndex === beat.offsets.length) {
        this.nextBeat = beat.start + beat.duration;
        this.pending = null;
      }
    }
  }

  private click(time: number, main: boolean) {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(main ? 1320 : 880, time);
    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(main ? 0.7 : 0.35, time + 0.0015);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + (main ? 0.045 : 0.03));
    oscillator.connect(envelope);
    envelope.connect(this.master!);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + 0.055);
  }

  private animate = () => {
    if (!this.running || !this.context) return;
    const context = this.context;
    const stamp = context.getOutputTimestamp?.();
    const now = stamp && stamp.contextTime !== undefined && stamp.performanceTime !== undefined && stamp.contextTime > 0
      ? stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000
      : context.currentTime - (context.outputLatency || 0);
    while (this.beats.length > 1 && this.beats[1].start <= now) this.beats.shift();
    const beat = this.beats[0];
    if (beat && now >= beat.start) {
      const progress = Math.min((now - beat.start) / beat.duration, 1);
      let active = 0;
      beat.offsets.forEach((offset, index) => { if (offset <= progress) active = index; });
      this.onFrame({ progress, active, beat: beat.index });
    }
    this.animation = requestAnimationFrame(this.animate);
  };
}
