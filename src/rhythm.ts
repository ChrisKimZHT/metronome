export const MIN_BPM = 20;
export const MAX_BPM = 300;
export const clampBpm = (value: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));

const divisions = (count: number) => Array.from({ length: count - 1 }, (_, i) => (i + 1) / count);
export const PRESETS = [
  { id: 'quarter', name: '四分音符', detail: '每拍一下', offsets: [] },
  { id: 'eighth', name: '八分音符', detail: '均分 2 份', offsets: divisions(2) },
  { id: 'triplet', name: '三连音', detail: '均分 3 份', offsets: divisions(3) },
  { id: 'sixteenth', name: '十六分音符', detail: '均分 4 份', offsets: divisions(4) },
  { id: 'dotted', name: '附点节奏', detail: '长短 3 : 1', offsets: [0.75] },
  { id: 'swing', name: '66% Swing', detail: '长短 2 : 1', offsets: [2 / 3] },
  { id: 'quintuplet', name: '五连音', detail: '均分 5 份', offsets: divisions(5) },
  { id: 'sextuplet', name: '六连音', detail: '均分 6 份', offsets: divisions(6) },
  { id: 'septuplet', name: '七连音', detail: '均分 7 份', offsets: divisions(7) },
  { id: 'polyrhythm', name: '二对三', detail: '交叠的律动', offsets: [1 / 3, 0.5, 2 / 3] },
  { id: 'polyrhythm-3-4', name: '三对四', detail: '三等分与四等分交叠', offsets: [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4] },
] as const;

export function parseOffsets(input: string): { offsets: number[]; error?: string } {
  if (!input.trim()) return { offsets: [] };
  const parts = input.trim().split(/[,，]/);
  if (parts.length > 16) return { offsets: [], error: '最多添加 16 个细分点。' };
  const values = parts.map((part) => {
    const token = part.trim();
    if (!/^(?:\d*\.?\d+)(?:\s*\/\s*\d*\.?\d+)?$/.test(token)) return NaN;
    const [numerator, denominator = '1'] = token.split('/');
    return Number(numerator) / Number(denominator);
  });
  if (values.some((n) => !Number.isFinite(n) || n <= 0 || n >= 1)) {
    return { offsets: [], error: '请输入大于 0、小于 1 的小数或分数，用逗号分隔。' };
  }
  return { offsets: [...new Set(values)].sort((a, b) => a - b) };
}

export function tapBpm(taps: number[]): number | null {
  if (taps.length < 2) return null;
  const intervals = taps.slice(1).map((time, i) => time - taps[i]);
  const average = intervals.reduce((sum, n) => sum + n, 0) / intervals.length;
  return average > 0 ? clampBpm(60000 / average) : null;
}

export function tempoName(bpm: number): string {
  if (bpm < 60) return 'Largo · 广板';
  if (bpm < 76) return 'Adagio · 柔板';
  if (bpm < 108) return 'Andante · 行板';
  if (bpm < 120) return 'Moderato · 中板';
  if (bpm < 168) return 'Allegro · 快板';
  if (bpm < 200) return 'Presto · 急板';
  return 'Prestissimo · 最急板';
}
