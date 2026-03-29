import { describe, it, expect } from 'vitest';
import { analyzePacing, calculateWordsPerMinute } from '@/lib/scoring/pacing';

describe('analyzePacing', () => {
  it('calculates 100 WPM correctly', () => {
    const words = Array(100).fill('word').join(' ');
    const result = analyzePacing(words, 60);
    expect(result.wordsPerMinute).toBe(100);
    expect(result.totalWords).toBe(100);
    expect(result.assessment).toBe('good');
  });

  it('detects slow pacing', () => {
    const words = Array(50).fill('word').join(' ');
    const result = analyzePacing(words, 60); // 50 WPM
    expect(result.assessment).toBe('slow');
  });

  it('detects fast pacing', () => {
    const words = Array(200).fill('word').join(' ');
    const result = analyzePacing(words, 60); // 200 WPM
    expect(result.assessment).toBe('fast');
  });

  it('handles zero duration', () => {
    const result = analyzePacing('some words here', 0);
    expect(result.wordsPerMinute).toBe(0);
    expect(result.assessment).toBe('good');
  });

  it('handles empty text', () => {
    const result = analyzePacing('', 60);
    expect(result.wordsPerMinute).toBe(0);
    expect(result.totalWords).toBe(0);
  });
});

describe('calculateWordsPerMinute', () => {
  it('returns WPM directly', () => {
    const words = Array(120).fill('word').join(' ');
    expect(calculateWordsPerMinute(words, 60)).toBe(120);
  });
});
