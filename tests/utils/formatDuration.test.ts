import { describe, it, expect } from 'vitest';
import { formatDuration } from '@/lib/utils/formatDuration';

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats exact minutes', () => {
    expect(formatDuration(120)).toBe('2m');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s');
  });

  it('handles 0', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats with seconds component', () => {
    expect(formatDuration(65)).toBe('1m 5s');
  });

  it('handles large values', () => {
    expect(formatDuration(3661)).toBe('61m 1s');
  });
});
