import { describe, it, expect } from 'vitest';
import { countWords } from '@/lib/utils/wordCount';

describe('countWords', () => {
  it('counts words correctly', () => {
    expect(countWords('Hello world')).toBe(2);
  });

  it('handles multiple spaces', () => {
    expect(countWords('Hello   world')).toBe(2);
  });

  it('handles empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('handles whitespace only', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('handles newlines', () => {
    expect(countWords('Hello\nworld')).toBe(2);
  });

  it('handles tabs', () => {
    expect(countWords('Hello\tworld')).toBe(2);
  });
});
