import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MetronomeEngine } from './MetronomeEngine';

const param = () => ({ value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
let context: FakeContext;
class FakeContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  onstatechange: (() => void) | null = null;
  voices: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  resume = vi.fn(async () => {});
  close = vi.fn(async () => { this.state = 'closed'; });
  constructor() { context = this; }
  createGain() { return { gain: param(), connect: vi.fn(), disconnect: vi.fn() }; }
  createOscillator() {
    const voice = { frequency: param(), type: 'sine', connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
    this.voices.push(voice);
    return voice;
  }
}

describe('audio scheduling', () => {
  let engine: MetronomeEngine;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('AudioContext', FakeContext);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    engine = new MetronomeEngine(vi.fn(), vi.fn());
  });
  afterEach(() => { engine.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('schedules subdivision on the audio clock without triggering it from a timer', async () => {
    engine.configure({ bpm: 120, offsets: [0.5], volume: 65, muted: false });
    await engine.start();
    expect(context.voices[0].start).toHaveBeenCalledWith(0.05);
    context.currentTime = 0.22;
    vi.advanceTimersByTime(25);
    expect(context.voices[1].start).toHaveBeenCalledWith(0.3);
    context.currentTime = 0.47;
    vi.advanceTimersByTime(25);
    expect(context.voices[2].start).toHaveBeenCalledWith(0.55);
  });

  it('applies new tempo at a beat boundary without resetting the current beat', async () => {
    engine.configure({ bpm: 120, offsets: [], volume: 65, muted: false });
    await engine.start();
    engine.configure({ bpm: 60, offsets: [], volume: 65, muted: false });
    context.currentTime = 0.47;
    vi.advanceTimersByTime(25);
    expect(context.voices[1].start).toHaveBeenCalledWith(0.55);
    context.currentTime = 1.47;
    vi.advanceTimersByTime(25);
    expect(context.voices[2].start).toHaveBeenCalledWith(1.55);
  });

  it('stops queued voices and cancels pending asynchronous starts', async () => {
    await engine.start();
    engine.stop();
    expect(context.voices[0].stop).toHaveBeenLastCalledWith();
    context.currentTime = 2;
    vi.advanceTimersByTime(1000);
    expect(context.voices).toHaveLength(1);
    const starting = engine.start();
    engine.stop();
    expect(await starting).toBe(false);
  });

  it('recovers after timer throttling without playing missed beats', async () => {
    await engine.start();
    context.currentTime = 30;
    vi.advanceTimersByTime(25);
    expect(context.voices).toHaveLength(2);
    expect(context.voices[1].start).toHaveBeenCalledWith(30.025);
  });
});
