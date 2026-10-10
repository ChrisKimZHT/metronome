import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings';

afterEach(() => vi.unstubAllGlobals());

describe('saved settings', () => {
  it.each([null, 'invalid JSON', 'null', '42', '{}'])('uses defaults for missing or invalid data: %s', (saved) => {
    vi.stubGlobal('localStorage', { getItem: () => saved });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('preserves valid custom settings through a save and load', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    const settings = { bpm: 144, preset: 'custom', custom: '1/3, 2/3', volume: 42, muted: true };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });

  it('bounds numeric values and discards invalid rhythm data', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ bpm: 500, volume: -10, preset: 'unknown', custom: '1/0', muted: 'true' }),
    });
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, bpm: 300, volume: 0 });
  });

  it('keeps working when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Storage blocked'); },
      setItem: () => { throw new Error('Storage blocked'); },
    });
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
  });
});
