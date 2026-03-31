import { describe, it, expect } from 'vitest';
import { getMissedContentWords, calculateSimilarity } from '@/lib/scoring/similarity';

describe('getMissedContentWords', () => {
  describe('basic functionality', () => {
    it('finds words in original not in spoken', () => {
      const original = 'Our revenue grew by twenty percent this quarter';
      const spoken = 'Our revenue grew this quarter';
      const missed = getMissedContentWords(original, spoken);

      expect(missed).toContain('twenty');
      expect(missed).toContain('percent');
    });

    it('returns empty array when all words spoken', () => {
      const original = 'Revenue grew this quarter';
      const spoken = 'Revenue grew this quarter';
      const missed = getMissedContentWords(original, spoken);

      expect(missed).toHaveLength(0);
    });

    it('returns empty array for empty original', () => {
      const missed = getMissedContentWords('', 'some spoken words');
      expect(missed).toHaveLength(0);
    });

    it('filters out stop words', () => {
      const original = 'the revenue of the company is growing';
      const spoken = 'revenue company';
      const missed = getMissedContentWords(original, spoken);

      // "the", "of", "is" are stop words, shouldn't be in missed
      expect(missed).not.toContain('the');
      expect(missed).not.toContain('of');
      expect(missed).not.toContain('is');
      expect(missed).toContain('growing');
    });
  });

  describe('frequency-based ordering', () => {
    it('prioritizes more frequent words', () => {
      const original = 'revenue revenue revenue growth profit profit';
      const spoken = 'profit';
      const missed = getMissedContentWords(original, spoken);

      // 'revenue' appears 3x, 'growth' appears 1x
      expect(missed.indexOf('revenue')).toBeLessThan(missed.indexOf('growth'));
    });
  });

  describe('max words limit', () => {
    it('respects maxWords parameter', () => {
      const original = 'one two three four five six seven eight nine ten';
      const spoken = '';
      const missed = getMissedContentWords(original, spoken, 3);

      expect(missed.length).toBeLessThanOrEqual(3);
    });

    it('defaults to 5 max words', () => {
      const original = 'one two three four five six seven eight nine ten';
      const spoken = '';
      const missed = getMissedContentWords(original, spoken);

      expect(missed.length).toBeLessThanOrEqual(5);
    });
  });

  describe('case insensitivity', () => {
    it('treats different cases as same word', () => {
      const original = 'Revenue REVENUE revenue';
      const spoken = 'revenue';
      const missed = getMissedContentWords(original, spoken);

      expect(missed).toHaveLength(0);
    });
  });

  describe('integration with scoring', () => {
    it('correlates with low similarity scores', () => {
      const original = 'Our quarterly revenue exceeded projections by a significant margin';
      const spoken = 'Revenue was good';

      const score = calculateSimilarity(original, spoken);
      const missed = getMissedContentWords(original, spoken);

      // Low score should mean many missed words
      expect(score).toBeLessThan(50);
      expect(missed.length).toBeGreaterThan(0);
    });

    it('correlates with high similarity scores', () => {
      const original = 'Our quarterly revenue exceeded projections';
      const spoken = 'Our quarterly revenue exceeded all projections';

      const score = calculateSimilarity(original, spoken);
      const missed = getMissedContentWords(original, spoken);

      // High score should mean few/no missed words
      expect(score).toBeGreaterThan(80);
      expect(missed.length).toBeLessThan(2);
    });
  });

  describe('edge cases', () => {
    it('handles punctuation in original', () => {
      const original = 'Hello, world! How are you?';
      const spoken = 'Hello world';
      const missed = getMissedContentWords(original, spoken);

      // Should not include punctuation, but should find content words
      expect(missed).not.toContain(',');
      expect(missed).not.toContain('?');
    });

    it('handles numbers', () => {
      const original = 'We grew 20 percent in 2024';
      const spoken = 'We grew percent';
      const missed = getMissedContentWords(original, spoken);

      expect(missed).toContain('20');
      expect(missed).toContain('2024');
    });

    it('handles spoken text longer than original', () => {
      const original = 'Quick summary';
      const spoken = 'Here is a much longer spoken text with many extra words';
      const missed = getMissedContentWords(original, spoken);

      expect(missed).toContain('quick');
      expect(missed).toContain('summary');
    });
  });

  describe('de-duplication', () => {
    it('does not repeat the same missed word', () => {
      const original = 'revenue revenue revenue';
      const spoken = '';
      const missed = getMissedContentWords(original, spoken);

      // Should only appear once despite being in original 3 times
      const revenueCount = missed.filter(w => w === 'revenue').length;
      expect(revenueCount).toBe(1);
    });
  });
});
