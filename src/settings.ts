import { clampBpm, PRESETS, parseOffsets } from './rhythm';

export type Settings = { bpm: number; preset: string; custom: string; volume: number; muted: boolean };
export const DEFAULT_SETTINGS: Settings = { bpm: 100, preset: 'quarter', custom: '', volume: 65, muted: false };
const KEY = 'paidian.settings.v1';

export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_SETTINGS };
    const custom = typeof saved.custom === 'string' && !parseOffsets(saved.custom).error ? saved.custom : '';
    return {
      bpm: typeof saved.bpm === 'number' && Number.isFinite(saved.bpm) ? clampBpm(saved.bpm) : 100,
      preset: saved.preset === 'custom' || PRESETS.some((p) => p.id === saved.preset) ? saved.preset : 'quarter',
      custom,
      volume: typeof saved.volume === 'number' && Number.isFinite(saved.volume) ? Math.min(100, Math.max(0, saved.volume)) : 65,
      muted: saved.muted === true,
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(settings: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Playback works when storage is unavailable. */ }
}
