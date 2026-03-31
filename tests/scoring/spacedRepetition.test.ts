import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  computeSRUpdate,
  isDue,
  getReviewPriority,
  sortByReviewPriority,
  countDueSlides,
  getBoxCounts,
  generateSRSummary,
  getMostOverdueSlide,
  initializeSRFields,
  applySRUpdate,
} from '@/lib/scoring/spacedRepetition';
import type { Slide } from '@/types/talk';

// Helper to create a mock slide
function createSlide(overrides: Partial<Slide> = {}): Slide {
  return {
    id: `slide-${Math.random().toString(36).slice(2)}`,
    index: 0,
    title: 'Test Slide',
    notes: 'Test notes content',
    wordCount: 10,
    estimatedSeconds: 6,
    timesRehearsed: 0,
    srBox: 1,
    ...overrides,
  };
}

describe('computeSRUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('promotion', () => {
    it('promotes to box 2 on score >= 75', () => {
      const result = computeSRUpdate(1, 75);
      expect(result.newBox).toBe(2);
      expect(result.promoted).toBe(true);
      expect(result.demoted).toBe(false);
    });

    it('promotes from box 4 to box 5', () => {
      const result = computeSRUpdate(4, 90);
      expect(result.newBox).toBe(5);
      expect(result.promoted).toBe(true);
    });

    it('stays at box 5 if already maxed', () => {
      const result = computeSRUpdate(5, 100);
      expect(result.newBox).toBe(5);
      expect(result.promoted).toBe(false);
    });
  });

  describe('demotion', () => {
    it('demotes on score < 50', () => {
      const result = computeSRUpdate(3, 49);
      expect(result.newBox).toBe(2);
      expect(result.demoted).toBe(true);
      expect(result.promoted).toBe(false);
    });

    it('stays at box 1 if already lowest', () => {
      const result = computeSRUpdate(1, 20);
      expect(result.newBox).toBe(1);
      expect(result.demoted).toBe(false);
    });
  });

  describe('stable', () => {
    it('stays in same box for scores 50-74', () => {
      const result = computeSRUpdate(3, 60);
      expect(result.newBox).toBe(3);
      expect(result.promoted).toBe(false);
      expect(result.demoted).toBe(false);
    });
  });

  describe('nextReviewAt', () => {
    it('sets immediate review for box 1', () => {
      const result = computeSRUpdate(1, 30); // demote/stay at 1
      const now = Date.now();
      expect(result.nextReviewAt).toBe(now);
    });

    it('sets 4 hour review for box 2', () => {
      const result = computeSRUpdate(1, 80); // promote to 2
      const now = Date.now();
      expect(result.nextReviewAt).toBe(now + 4 * 60 * 60 * 1000);
    });

    it('sets 24 hour review for box 3', () => {
      const result = computeSRUpdate(2, 80); // promote to 3
      const now = Date.now();
      expect(result.nextReviewAt).toBe(now + 24 * 60 * 60 * 1000);
    });
  });
});

describe('isDue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true if no srNextReviewAt set', () => {
    const slide = createSlide({ srNextReviewAt: undefined });
    expect(isDue(slide)).toBe(true);
  });

  it('returns true if past due', () => {
    const now = Date.now();
    const slide = createSlide({ srNextReviewAt: now - 1000 });
    expect(isDue(slide)).toBe(true);
  });

  it('returns true if exactly due', () => {
    const now = Date.now();
    const slide = createSlide({ srNextReviewAt: now });
    expect(isDue(slide)).toBe(true);
  });

  it('returns false if not yet due', () => {
    const now = Date.now();
    const slide = createSlide({ srNextReviewAt: now + 60000 });
    expect(isDue(slide)).toBe(false);
  });
});

describe('getReviewPriority', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives higher priority to lower boxes', () => {
    const now = Date.now();
    const box1 = createSlide({ srBox: 1, srNextReviewAt: now });
    const box5 = createSlide({ srBox: 5, srNextReviewAt: now });

    expect(getReviewPriority(box1)).toBeGreaterThan(getReviewPriority(box5));
  });

  it('gives higher priority to more overdue slides', () => {
    const now = Date.now();
    const overdue1h = createSlide({ srBox: 1, srNextReviewAt: now - 3600000 });
    const overdue5h = createSlide({ srBox: 1, srNextReviewAt: now - 18000000 });

    expect(getReviewPriority(overdue5h)).toBeGreaterThan(getReviewPriority(overdue1h));
  });
});

describe('sortByReviewPriority', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts most urgent first', () => {
    const now = Date.now();
    const slides = [
      createSlide({ id: 'box5', srBox: 5, srNextReviewAt: now }),
      createSlide({ id: 'box1-overdue', srBox: 1, srNextReviewAt: now - 3600000 }),
      createSlide({ id: 'box3', srBox: 3, srNextReviewAt: now }),
    ];

    const sorted = sortByReviewPriority(slides);
    expect(sorted[0].id).toBe('box1-overdue');
  });
});

describe('countDueSlides', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts only due slides', () => {
    const now = Date.now();
    const slides = [
      createSlide({ srNextReviewAt: now - 1000 }), // due
      createSlide({ srNextReviewAt: now + 60000 }), // not due
      createSlide({ srNextReviewAt: undefined }), // due (no time set)
    ];

    expect(countDueSlides(slides)).toBe(2);
  });

  it('returns 0 for empty array', () => {
    expect(countDueSlides([])).toBe(0);
  });
});

describe('getBoxCounts', () => {
  it('counts slides per box', () => {
    const slides = [
      createSlide({ srBox: 1 }),
      createSlide({ srBox: 1 }),
      createSlide({ srBox: 3 }),
      createSlide({ srBox: 5 }),
    ];

    const counts = getBoxCounts(slides);
    expect(counts[1]).toBe(2);
    expect(counts[2]).toBe(0);
    expect(counts[3]).toBe(1);
    expect(counts[5]).toBe(1);
  });

  it('defaults undefined srBox to 1', () => {
    const slides = [
      createSlide({ srBox: undefined as unknown as number }),
    ];

    const counts = getBoxCounts(slides);
    expect(counts[1]).toBe(1);
  });
});

describe('generateSRSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports due slides count', () => {
    const now = Date.now();
    const slides = [
      createSlide({ srBox: 1, srNextReviewAt: now - 1000 }),
      createSlide({ srBox: 1, srNextReviewAt: now - 1000 }),
    ];

    const summary = generateSRSummary(slides);
    expect(summary).toContain('2 slides are due');
  });

  it('reports singular for 1 slide', () => {
    const now = Date.now();
    const slides = [
      createSlide({ srBox: 1, srNextReviewAt: now - 1000 }),
    ];

    const summary = generateSRSummary(slides);
    expect(summary).toContain('1 slide is due');
  });

  it('reports mastery progress', () => {
    const now = Date.now();
    const slides = [
      createSlide({ srBox: 5, srNextReviewAt: now + 100000 }),
      createSlide({ srBox: 4, srNextReviewAt: now + 100000 }),
      createSlide({ srBox: 1, srNextReviewAt: now + 100000 }),
    ];

    const summary = generateSRSummary(slides);
    expect(summary).toContain('well-learned');
    expect(summary).toContain('mastery');
  });
});

describe('getMostOverdueSlide', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns most overdue slide', () => {
    const now = Date.now();
    const slides = [
      createSlide({ id: 'a', srBox: 3, srNextReviewAt: now - 1000 }),
      createSlide({ id: 'b', srBox: 1, srNextReviewAt: now - 10000 }),
      createSlide({ id: 'c', srBox: 2, srNextReviewAt: now + 10000 }),
    ];

    const result = getMostOverdueSlide(slides);
    expect(result?.id).toBe('b'); // box 1 and more overdue
  });

  it('returns null if no slides due', () => {
    const now = Date.now();
    const slides = [
      createSlide({ srNextReviewAt: now + 60000 }),
    ];

    expect(getMostOverdueSlide(slides)).toBeNull();
  });
});

describe('initializeSRFields', () => {
  it('adds default srBox of 1', () => {
    const slides = [
      { id: '1', index: 0, title: 'Test', notes: '', wordCount: 5, estimatedSeconds: 3, timesRehearsed: 0 },
    ] as Slide[];

    const result = initializeSRFields(slides);
    expect(result[0].srBox).toBe(1);
  });

  it('preserves existing srBox', () => {
    const slides = [
      createSlide({ srBox: 3 }),
    ];

    const result = initializeSRFields(slides);
    expect(result[0].srBox).toBe(3);
  });
});

describe('applySRUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates slide with new SR state', () => {
    const slide = createSlide({ srBox: 1 });
    const updated = applySRUpdate(slide, 85);

    expect(updated.srBox).toBe(2); // promoted
    expect(updated.srLastReviewedAt).toBe(Date.now());
    expect(updated.srNextReviewAt).toBeDefined();
  });

  it('preserves other slide properties', () => {
    const slide = createSlide({ title: 'Important Slide', notes: 'Content here' });
    const updated = applySRUpdate(slide, 50);

    expect(updated.title).toBe('Important Slide');
    expect(updated.notes).toBe('Content here');
  });
});
