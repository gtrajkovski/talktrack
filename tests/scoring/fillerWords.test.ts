import { describe, it, expect } from 'vitest';
import { analyzeFillerWords, countFillerWords } from '@/lib/scoring/fillerWords';

describe('analyzeFillerWords', () => {
  describe('filler detection', () => {
    it('detects "um" and "uh"', () => {
      const result = analyzeFillerWords('so um I think uh we should um proceed');
      expect(result.count).toBe(4); // so, um, uh, um
      expect(result.words.some(w => w.word === 'um')).toBe(true);
      expect(result.words.some(w => w.word === 'uh')).toBe(true);
    });

    it('detects "like" as filler', () => {
      const result = analyzeFillerWords('it was like really like important');
      expect(result.count).toBe(2);
      expect(result.words.find(w => w.word === 'like')?.count).toBe(2);
    });

    it('detects "you know" phrase', () => {
      const result = analyzeFillerWords('the thing is you know we need to you know adjust');
      expect(result.words.find(w => w.word === 'you know')?.count).toBe(2);
    });

    it('detects "basically" and "actually"', () => {
      const result = analyzeFillerWords('basically what we actually need is basically a new approach');
      expect(result.words.find(w => w.word === 'basically')?.count).toBe(2);
      expect(result.words.find(w => w.word === 'actually')?.count).toBe(1);
    });

    it('detects "i mean" and "sort of"', () => {
      const result = analyzeFillerWords('I mean this is sort of what we expected');
      expect(result.words.some(w => w.word === 'i mean')).toBe(true);
      expect(result.words.some(w => w.word === 'sort of')).toBe(true);
    });
  });

  describe('clean speech', () => {
    it('returns 0 for clean speech', () => {
      const result = analyzeFillerWords('Our revenue grew twenty percent this quarter exceeding all projections');
      expect(result.count).toBe(0);
      expect(result.words).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = analyzeFillerWords('');
      expect(result.count).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('is case insensitive', () => {
      const result = analyzeFillerWords('UM UH LIKE');
      expect(result.count).toBe(3);
    });

    it('calculates percentage correctly', () => {
      // 9 total words, 2 fillers = ~22%
      const result = analyzeFillerWords('um we should uh proceed with the plan today');
      expect(result.percentage).toBeCloseTo(22.2, 0);
    });

    it('sorts results by count descending', () => {
      const result = analyzeFillerWords('um um um like like uh');
      expect(result.words[0].word).toBe('um');
      expect(result.words[0].count).toBe(3);
    });
  });
});

describe('countFillerWords', () => {
  it('returns simple count', () => {
    expect(countFillerWords('um uh like')).toBe(3);
  });

  it('returns 0 for clean speech', () => {
    expect(countFillerWords('This is clean professional speech')).toBe(0);
  });
});
