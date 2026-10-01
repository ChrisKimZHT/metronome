import { describe, expect, it } from 'vitest';
import { clampBpm, parseOffsets, PRESETS, tapBpm } from './rhythm';

describe('custom rhythm parsing', () => {
  it('accepts decimals, fractions and Chinese commas; sorts and deduplicates', () => {
    expect(parseOffsets('2/3，0.5, 1/3, 1/2').offsets).toEqual([1 / 3, 0.5, 2 / 3]);
    expect(parseOffsets('')).toEqual({ offsets: [] });
  });
  it.each(['0', '1', '-0.5', '0.5,', 'NaN', '1/0', '0.5x', '1/2/3', 'Infinity', '0x1'])('rejects invalid point %s', (input) => {
    expect(parseOffsets(input).error).toBeTruthy();
  });
  it('bounds complexity and preserves precise tuplets', () => {
    expect(parseOffsets(Array(17).fill('0.5').join(',')).error).toBeTruthy();
    expect(PRESETS.find((p) => p.id === 'septuplet')?.offsets[5]).toBe(6 / 7);
    expect(PRESETS.find((p) => p.id === 'polyrhythm')?.offsets).toEqual([1 / 3, 0.5, 2 / 3]);
  });
});

describe('tempo', () => {
  it('averages tap intervals', () => {
    expect(tapBpm([0])).toBeNull();
    expect(tapBpm([0, 500, 1000, 1500])).toBe(120);
    expect(tapBpm([0, 490, 1000, 1510])).toBe(119);
    expect(tapBpm([0, 0])).toBeNull();
  });
  it('clamps and rounds user tempo', () => {
    expect(clampBpm(500)).toBe(300);
    expect(clampBpm(1)).toBe(20);
    expect(clampBpm(120.7)).toBe(121);
  });
});
