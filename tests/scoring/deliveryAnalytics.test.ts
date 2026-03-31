import { describe, it, expect } from 'vitest';
import {
  analyzeFillers,
  assessPace,
  getPaceDescription,
  generateDeliverySpeech,
  generatePaceFeedback,
  type DetailedFillerAnalysis,
  type DeliveryFeedback,
} from '@/lib/scoring/deliveryAnalytics';

describe('analyzeFillers', () => {
  describe('category detection', () => {
    it('categorizes hesitation fillers', () => {
      const result = analyzeFillers('um uh er ah hmm');
      expect(result.byCategory.hesitation).toBe(5);
      expect(result.byCategory.hedge).toBe(0);
      expect(result.byCategory.verbal_crutch).toBe(0);
    });

    it('categorizes hedge words', () => {
      const result = analyzeFillers('I think maybe probably I guess');
      expect(result.byCategory.hedge).toBeGreaterThan(0);
    });

    it('categorizes verbal crutches', () => {
      const result = analyzeFillers('like you know basically actually');
      expect(result.byCategory.verbal_crutch).toBe(4);
    });
  });

  describe('multi-word filler detection', () => {
    it('detects "you know" as single filler', () => {
      const result = analyzeFillers('so you know what I mean');
      expect(result.byWord['you know']).toBe(1);
    });

    it('detects "sort of" and "kind of"', () => {
      const result = analyzeFillers('it was sort of like a kind of experiment');
      expect(result.byWord['sort of']).toBe(1);
      expect(result.byWord['kind of']).toBe(1);
    });

    it('detects "i mean" phrase', () => {
      const result = analyzeFillers('I mean that is what I mean to say');
      expect(result.byWord['i mean']).toBe(2);
    });
  });

  describe('topFillers', () => {
    it('returns top 5 fillers sorted by count', () => {
      const result = analyzeFillers('um um um um like like like uh uh so');
      expect(result.topFillers.length).toBeLessThanOrEqual(5);
      expect(result.topFillers[0].word).toBe('um');
      expect(result.topFillers[0].count).toBe(4);
    });

    it('includes category for each top filler', () => {
      const result = analyzeFillers('um like um');
      expect(result.topFillers.every(f => f.category !== undefined)).toBe(true);
    });
  });

  describe('percentage calculation', () => {
    it('calculates filler percentage of total words', () => {
      // "um we should um proceed" = 5 words, 2 fillers = 40%
      const result = analyzeFillers('um we should um proceed');
      expect(result.percentage).toBeCloseTo(40, 0);
    });

    it('returns 0% for empty string', () => {
      const result = analyzeFillers('');
      expect(result.percentage).toBe(0);
    });

    it('returns 0% for clean speech', () => {
      const result = analyzeFillers('Clear professional speech without fillers');
      expect(result.percentage).toBe(0);
    });
  });
});

describe('assessPace', () => {
  it('returns too_slow for < 100 WPM', () => {
    expect(assessPace(80)).toBe('too_slow');
    expect(assessPace(99)).toBe('too_slow');
  });

  it('returns good for 100-160 WPM', () => {
    expect(assessPace(100)).toBe('good');
    expect(assessPace(130)).toBe('good');
    expect(assessPace(160)).toBe('good');
  });

  it('returns slightly_fast for 161-180 WPM', () => {
    expect(assessPace(165)).toBe('slightly_fast');
    expect(assessPace(180)).toBe('slightly_fast');
  });

  it('returns too_fast for > 180 WPM', () => {
    expect(assessPace(181)).toBe('too_fast');
    expect(assessPace(220)).toBe('too_fast');
  });
});

describe('getPaceDescription', () => {
  it('returns human-readable descriptions', () => {
    expect(getPaceDescription('too_slow')).toBe('a bit slow');
    expect(getPaceDescription('good')).toBe('good pace');
    expect(getPaceDescription('slightly_fast')).toBe('slightly fast');
    expect(getPaceDescription('too_fast')).toBe('too fast');
  });
});

describe('generateDeliverySpeech', () => {
  const baseAnalysis: DetailedFillerAnalysis = {
    totalCount: 0,
    byCategory: { hesitation: 0, hedge: 0, verbal_crutch: 0 },
    byWord: {},
    topFillers: [],
    percentage: 0,
  };

  it('generates positive feedback for high scores', () => {
    const feedback: DeliveryFeedback = {
      score: 90,
      paceAssessment: 'good',
      wordsPerMinute: 130,
      fillerAnalysis: baseAnalysis,
    };
    const speech = generateDeliverySpeech(feedback);
    expect(speech).toContain('Great recall');
    expect(speech).toContain('90');
  });

  it('mentions pace when not good', () => {
    const feedback: DeliveryFeedback = {
      score: 75,
      paceAssessment: 'too_fast',
      wordsPerMinute: 200,
      fillerAnalysis: baseAnalysis,
    };
    const speech = generateDeliverySpeech(feedback);
    expect(speech).toContain('too fast');
  });

  it('mentions top filler when significant', () => {
    const fillerAnalysis: DetailedFillerAnalysis = {
      totalCount: 5,
      byCategory: { hesitation: 5, hedge: 0, verbal_crutch: 0 },
      byWord: { um: 5 },
      topFillers: [{ word: 'um', count: 5, category: 'hesitation' }],
      percentage: 10,
    };
    const feedback: DeliveryFeedback = {
      score: 70,
      paceAssessment: 'good',
      wordsPerMinute: 130,
      fillerAnalysis,
    };
    const speech = generateDeliverySpeech(feedback);
    expect(speech).toContain('um');
    expect(speech).toContain('5 times');
  });

  it('includes missed words when provided', () => {
    const feedback: DeliveryFeedback = {
      score: 60,
      paceAssessment: 'good',
      wordsPerMinute: 130,
      fillerAnalysis: baseAnalysis,
      missedWords: ['revenue', 'projections', 'quarterly'],
    };
    const speech = generateDeliverySpeech(feedback);
    expect(speech).toContain('missed');
    expect(speech).toContain('revenue');
  });

  it('keeps output under reasonable length', () => {
    const fillerAnalysis: DetailedFillerAnalysis = {
      totalCount: 10,
      byCategory: { hesitation: 5, hedge: 3, verbal_crutch: 2 },
      byWord: { um: 5, like: 3, maybe: 2 },
      topFillers: [
        { word: 'um', count: 5, category: 'hesitation' },
        { word: 'like', count: 3, category: 'verbal_crutch' },
      ],
      percentage: 15,
    };
    const feedback: DeliveryFeedback = {
      score: 50,
      paceAssessment: 'too_slow',
      wordsPerMinute: 80,
      fillerAnalysis,
      missedWords: ['word1', 'word2', 'word3', 'word4', 'word5'],
    };
    const speech = generateDeliverySpeech(feedback);
    // Under 50 words = about 20 seconds of speech
    const wordCount = speech.split(/\s+/).length;
    expect(wordCount).toBeLessThan(60);
  });
});

describe('generatePaceFeedback', () => {
  it('reports no target when not set', () => {
    const feedback = generatePaceFeedback(120, 5, 10, undefined);
    expect(feedback).toContain('No target set');
  });

  it('reports on pace when within 30 seconds', () => {
    // 10 slides, 15 min target = 90s per slide
    // At slide 5, should be at 450s. If at 460s, that's on pace.
    const feedback = generatePaceFeedback(460, 4, 10, 15);
    expect(feedback).toContain('on pace');
  });

  it('reports behind when over expected time', () => {
    // 10 slides, 10 min target = 60s per slide
    // At slide 5 (halfway), should be at 300s. If at 400s, behind.
    const feedback = generatePaceFeedback(400, 4, 10, 10);
    expect(feedback).toContain('behind');
    expect(feedback).toContain('speed');
  });

  it('reports ahead when under expected time', () => {
    // 10 slides, 10 min target = 60s per slide
    // At slide 5 (halfway), should be at 300s. If at 200s, ahead.
    const feedback = generatePaceFeedback(200, 4, 10, 10);
    expect(feedback).toContain('ahead');
    expect(feedback).toContain('slow down');
  });
});
