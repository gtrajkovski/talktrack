import { describe, it, expect } from 'vitest';
import { calculateSimilarity, extractKeyPhrases } from '@/lib/scoring/similarity';

describe('calculateSimilarity', () => {
  describe('basic scoring', () => {
    it('returns 100 for identical text', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      expect(calculateSimilarity(text, text)).toBe(100);
    });

    it('returns 0 for completely different text', () => {
      const original = 'machine learning neural networks';
      const spoken = 'basketball football soccer tennis';
      expect(calculateSimilarity(original, spoken)).toBe(0);
    });

    it('returns 100 for empty original', () => {
      expect(calculateSimilarity('', 'any text')).toBe(100);
    });

    it('returns 0 for empty spoken text', () => {
      expect(calculateSimilarity('some content', '')).toBe(0);
    });
  });

  describe('case and punctuation handling', () => {
    it('is case insensitive', () => {
      const original = 'Hello World';
      const spoken = 'HELLO WORLD';
      expect(calculateSimilarity(original, spoken)).toBe(100);
    });

    it('ignores punctuation', () => {
      const original = 'Hello, world! How are you?';
      const spoken = 'hello world how are you';
      expect(calculateSimilarity(original, spoken)).toBe(100);
    });
  });

  describe('stop word filtering', () => {
    it('filters out stop words when scoring', () => {
      // "the" and "is" are stop words
      const original = 'the cat is sleeping';
      const spoken = 'a dog was running';
      // Both have only stop words removed, leaving content words
      // "cat sleeping" vs "dog running" - 0 overlap
      expect(calculateSimilarity(original, spoken)).toBe(0);
    });

    it('scores based on content words', () => {
      const original = 'the important presentation slides';
      const spoken = 'the important presentation material';
      // Content words: "important presentation slides" vs "important presentation material"
      // 2/3 match = ~67
      const score = calculateSimilarity(original, spoken);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(100);
    });
  });

  describe('partial matches', () => {
    it('scores partial content match', () => {
      const original = 'apple banana cherry date elderberry';
      const spoken = 'apple banana cherry grape kiwi';
      // 3/5 content words match = 60
      const score = calculateSimilarity(original, spoken);
      expect(score).toBe(60);
    });

    it('handles word order independence', () => {
      const original = 'first second third fourth fifth';
      const spoken = 'fifth fourth third second first';
      // All words match regardless of order
      expect(calculateSimilarity(original, spoken)).toBe(100);
    });

    it('handles repeated words correctly', () => {
      const original = 'important very important extremely important';
      const spoken = 'important';
      // Original has "important" (stop words removed), spoken has "important"
      // Should score based on unique content words
      const score = calculateSimilarity(original, spoken);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles whitespace variations', () => {
      const original = 'hello   world';
      const spoken = 'hello world';
      expect(calculateSimilarity(original, spoken)).toBe(100);
    });

    it('handles only stop words in original', () => {
      const original = 'the a an is was were';
      const spoken = 'something else entirely';
      // All words in original are stop words, filtered to empty = 100
      expect(calculateSimilarity(original, spoken)).toBe(100);
    });

    it('caps score at 100', () => {
      const original = 'test';
      const spoken = 'test test test test test';
      expect(calculateSimilarity(original, spoken)).toBeLessThanOrEqual(100);
    });
  });
});

describe('extractKeyPhrases', () => {
  it('extracts most frequent content words', () => {
    const text = 'The important project is really important and the project matters';
    const phrases = extractKeyPhrases(text, 3);
    expect(phrases).toContain('important');
    expect(phrases).toContain('project');
  });

  it('respects maxPhrases limit', () => {
    const text = 'one two three four five six seven eight nine ten';
    const phrases = extractKeyPhrases(text, 3);
    expect(phrases).toHaveLength(3);
  });

  it('returns empty array for empty text', () => {
    expect(extractKeyPhrases('')).toEqual([]);
  });

  it('filters stop words from results', () => {
    const text = 'the the the a a a important';
    const phrases = extractKeyPhrases(text, 5);
    expect(phrases).not.toContain('the');
    expect(phrases).not.toContain('a');
    expect(phrases).toContain('important');
  });

  it('handles text with only stop words', () => {
    const text = 'the a an is was were are';
    const phrases = extractKeyPhrases(text, 5);
    expect(phrases).toEqual([]);
  });

  it('uses default maxPhrases of 5', () => {
    const text = 'one two three four five six seven eight nine ten different words here';
    const phrases = extractKeyPhrases(text);
    expect(phrases.length).toBeLessThanOrEqual(5);
  });
});
