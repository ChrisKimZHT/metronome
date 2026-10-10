export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));

const divisions = (count: number) => Array.from({ length: count - 1 }, (_, i) => (i + 1) / count);
export const PRESETS = [
  { id: 'quarter', nameKey: 'presets.quarter.name', detailKey: 'presets.quarter.detail', offsets: [] },
  { id: 'eighth', nameKey: 'presets.eighth.name', detailKey: 'presets.eighth.detail', offsets: divisions(2) },
  { id: 'triplet', nameKey: 'presets.triplet.name', detailKey: 'presets.triplet.detail', offsets: divisions(3) },
  { id: 'sixteenth', nameKey: 'presets.sixteenth.name', detailKey: 'presets.sixteenth.detail', offsets: divisions(4) },
  { id: 'dotted', nameKey: 'presets.dotted.name', detailKey: 'presets.dotted.detail', offsets: [0.75] },
  { id: 'swing', nameKey: 'presets.swing.name', detailKey: 'presets.swing.detail', offsets: [2 / 3] },
  { id: 'quintuplet', nameKey: 'presets.quintuplet.name', detailKey: 'presets.quintuplet.detail', offsets: divisions(5) },
  { id: 'sextuplet', nameKey: 'presets.sextuplet.name', detailKey: 'presets.sextuplet.detail', offsets: divisions(6) },
  { id: 'septuplet', nameKey: 'presets.septuplet.name', detailKey: 'presets.septuplet.detail', offsets: divisions(7) },
  { id: 'polyrhythm', nameKey: 'presets.polyrhythm.name', detailKey: 'presets.polyrhythm.detail', offsets: [1 / 3, 0.5, 2 / 3] },
  { id: 'polyrhythm-3-4', nameKey: 'presets.polyrhythm-3-4.name', detailKey: 'presets.polyrhythm-3-4.detail', offsets: [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4] },
] as const;

export function parseOffsets(input: string): { offsets: number[]; error?: 'validation.tooMany' | 'validation.invalidPosition' } {
  if (!input.trim()) return { offsets: [] };
  const parts = input.trim().split(/[,，]/);
  if (parts.length > 16) return { offsets: [], error: 'validation.tooMany' };
  const values = parts.map((part) => {
    const token = part.trim();
    if (!/^(?:\d*\.?\d+)(?:\s*\/\s*\d*\.?\d+)?$/.test(token)) return NaN;
    const [numerator, denominator = '1'] = token.split('/');
    return Number(numerator) / Number(denominator);
  });
  if (values.some((n) => !Number.isFinite(n) || n <= 0 || n >= 1)) {
    return { offsets: [], error: 'validation.invalidPosition' };
  }
  return { offsets: [...new Set(values)].sort((a, b) => a - b) };
}

export function tapBpm(taps: number[]): number | null {
  if (taps.length < 2) return null;
  const intervals = taps.slice(1).map((time, i) => time - taps[i]);
  const average = intervals.reduce((sum, n) => sum + n, 0) / intervals.length;
  return average > 0 ? clampBpm(60000 / average) : null;
}

export function tempoNameKey(bpm: number) {
  if (bpm < 60) return 'tempoNames.largo';
  if (bpm < 76) return 'tempoNames.adagio';
  if (bpm < 108) return 'tempoNames.andante';
  if (bpm < 120) return 'tempoNames.moderato';
  if (bpm < 168) return 'tempoNames.allegro';
  if (bpm < 200) return 'tempoNames.presto';
  return 'tempoNames.prestissimo';
}
