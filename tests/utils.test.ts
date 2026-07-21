import { describe, expect, it } from 'vitest';
import { formatDuration, slugify, formatCount } from '@/lib/utils';

describe('formatDuration', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatDuration(213_000)).toBe('3:33');
    expect(formatDuration(9_000)).toBe('0:09');
    expect(formatDuration(60_000)).toBe('1:00');
  });

  it('guards invalid input', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});

describe('slugify', () => {
  it('produces url-safe slugs and strips accents', () => {
    expect(slugify('Fally Ipupa')).toBe('fally-ipupa');
    expect(slugify('Rumba Congolaise — Été')).toBe('rumba-congolaise-ete');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });
});

describe('formatCount', () => {
  it('compacts large numbers', () => {
    expect(formatCount(1_500_000)).toMatch(/M/);
    expect(formatCount(2_400)).toMatch(/k/i);
  });
});
