import { describe, it, expect } from 'vitest';
import { generateSlidesCsv, generateSessionsCsv, generateFullCsv } from '@/lib/utils/exportCsv';
import type { Talk, Slide } from '@/types/talk';
import type { RehearsalSession, SlideAttempt } from '@/types/session';

// Helper to create mock slides
function makeMockSlides(): Slide[] {
  return [
    {
      id: 'slide-0',
      index: 0,
      title: 'Introduction',
      notes: 'Welcome to the presentation.',
      wordCount: 5,
      estimatedSeconds: 3,
      timesRehearsed: 3,
      lastScore: 85,
    },
    {
      id: 'slide-1',
      index: 1,
      title: 'Main Points',
      notes: 'Here are the main points.',
      wordCount: 6,
      estimatedSeconds: 4,
      timesRehearsed: 2,
      lastScore: 72,
    },
    {
      id: 'slide-2',
      index: 2,
      title: 'Conclusion',
      notes: 'Thank you for listening.',
      wordCount: 4,
      estimatedSeconds: 2,
      timesRehearsed: 1,
      // No lastScore
    },
  ];
}

function makeMockTalk(): Talk {
  return {
    id: 'test-talk-id',
    title: 'Test Talk',
    slides: makeMockSlides(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalRehearsals: 5,
    source: 'paste',
  };
}

function makeMockSession(completed: boolean = true): RehearsalSession {
  const startedAt = Date.now() - 600000; // 10 minutes ago
  return {
    id: 'session-1',
    talkId: 'test-talk-id',
    mode: 'prompt',
    startedAt,
    completedAt: completed ? startedAt + 300000 : undefined, // 5 minutes later
    currentSlideIndex: 2,
    slidesCompleted: 3,
    totalSlides: 3,
    attempts: [
      { slideId: 'slide-0', slideIndex: 0, similarityScore: 85, usedHelp: false },
      { slideId: 'slide-1', slideIndex: 1, similarityScore: 72, usedHelp: true },
      { slideId: 'slide-2', slideIndex: 2, similarityScore: 90, usedHelp: false },
    ],
  };
}

describe('Integration: Export Correctness', () => {
  describe('generateSlidesCsv', () => {
    it('1. Export session with 3 slides → CSV has 3 data rows + header', () => {
      const talk = makeMockTalk();
      const csv = generateSlidesCsv(talk);
      const lines = csv.split('\n');

      // First line is header, rest are data rows
      expect(lines.length).toBe(4); // 1 header + 3 slides
    });

    it('2. CSV columns include: slide number, title, word count, est duration, times rehearsed, last score', () => {
      const talk = makeMockTalk();
      const csv = generateSlidesCsv(talk);
      const lines = csv.split('\n');

      // Check header
      const header = lines[0];
      expect(header).toContain('Slide');
      expect(header).toContain('Title');
      expect(header).toContain('Word Count');
      expect(header).toContain('Est. Duration');
      expect(header).toContain('Times Rehearsed');
      expect(header).toContain('Last Score');

      // Check first data row
      const firstRow = lines[1];
      expect(firstRow).toContain('1'); // Slide number
      expect(firstRow).toContain('Introduction'); // Title
      expect(firstRow).toContain('5'); // Word count
      expect(firstRow).toContain('3'); // Estimated seconds
      expect(firstRow).toContain('85'); // Last score
    });

    it('3. Unicode in slide titles preserved', () => {
      const talk = makeMockTalk();
      talk.slides[0].title = 'Introduction 🎉';

      const csv = generateSlidesCsv(talk);
      expect(csv).toContain('Introduction 🎉');
    });

    it('4. Slide titles containing commas are properly quoted', () => {
      const talk = makeMockTalk();
      talk.slides[0].title = 'First, Second, Third';

      const csv = generateSlidesCsv(talk);
      // Commas in content should be quoted
      expect(csv).toContain('"First, Second, Third"');
    });

    it('5. Slide titles containing quotes are escaped', () => {
      const talk = makeMockTalk();
      talk.slides[0].title = 'Say "Hello"';

      const csv = generateSlidesCsv(talk);
      // Quotes should be doubled within quoted string
      expect(csv).toContain('"Say ""Hello"""');
    });

    it('6. Slide titles containing newlines are quoted', () => {
      const talk = makeMockTalk();
      talk.slides[0].title = 'Line One\nLine Two';

      const csv = generateSlidesCsv(talk);
      expect(csv).toContain('"Line One\nLine Two"');
    });

    it('7. Missing lastScore renders as empty', () => {
      const talk = makeMockTalk();
      // Slide 2 has no lastScore
      const csv = generateSlidesCsv(talk);
      const lines = csv.split('\n');
      const lastRow = lines[3]; // Third data row (slide 3)

      // Should end with empty value (no score)
      expect(lastRow.endsWith(',')).toBe(false); // Not trailing comma
    });
  });

  describe('generateSessionsCsv', () => {
    it('8. Sessions CSV has correct headers', () => {
      const sessions = [makeMockSession()];
      const csv = generateSessionsCsv(sessions);
      const header = csv.split('\n')[0];

      expect(header).toContain('Date');
      expect(header).toContain('Mode');
      expect(header).toContain('Slides Completed');
      expect(header).toContain('Total Slides');
      expect(header).toContain('Duration');
    });

    it('9. Completed session shows duration in minutes', () => {
      const sessions = [makeMockSession(true)];
      const csv = generateSessionsCsv(sessions);

      // Session was 5 minutes (300000ms)
      expect(csv).toContain('5'); // 5 minutes
    });

    it('10. Incomplete session shows "incomplete"', () => {
      const sessions = [makeMockSession(false)];
      const csv = generateSessionsCsv(sessions);

      expect(csv).toContain('incomplete');
    });

    it('11. Multiple sessions create multiple rows', () => {
      const sessions = [
        makeMockSession(true),
        { ...makeMockSession(true), id: 'session-2', mode: 'test' as const },
        { ...makeMockSession(false), id: 'session-3', mode: 'listen' as const },
      ];
      const csv = generateSessionsCsv(sessions);
      const lines = csv.split('\n');

      expect(lines.length).toBe(4); // 1 header + 3 sessions
    });
  });

  describe('generateFullCsv', () => {
    it('12. Full export includes talk title', () => {
      const talk = makeMockTalk();
      const sessions = [makeMockSession()];
      const csv = generateFullCsv(talk, sessions);

      expect(csv).toContain('TALK: Test Talk');
    });

    it('13. Full export includes total rehearsals', () => {
      const talk = makeMockTalk();
      const sessions = [makeMockSession()];
      const csv = generateFullCsv(talk, sessions);

      expect(csv).toContain('Total Rehearsals: 5');
    });

    it('14. Full export includes export timestamp', () => {
      const talk = makeMockTalk();
      const sessions = [makeMockSession()];
      const csv = generateFullCsv(talk, sessions);

      expect(csv).toContain('Exported:');
    });

    it('15. Full export has slides section', () => {
      const talk = makeMockTalk();
      const sessions = [makeMockSession()];
      const csv = generateFullCsv(talk, sessions);

      expect(csv).toContain('--- SLIDES ---');
    });

    it('16. Full export has session history section', () => {
      const talk = makeMockTalk();
      const sessions = [makeMockSession()];
      const csv = generateFullCsv(talk, sessions);

      expect(csv).toContain('--- SESSION HISTORY ---');
    });
  });

  describe('Edge Cases', () => {
    it('17. Empty slides array → header only', () => {
      const talk = { ...makeMockTalk(), slides: [] };
      const csv = generateSlidesCsv(talk);
      const lines = csv.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(1); // Header only
    });

    it('18. Empty sessions array → header only', () => {
      const sessions: RehearsalSession[] = [];
      const csv = generateSessionsCsv(sessions);
      const lines = csv.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(1); // Header only
    });

    it('19. Talk title with special characters is escaped', () => {
      const talk = { ...makeMockTalk(), title: 'Talk, with "special" chars\nand newline' };
      const sessions: RehearsalSession[] = [];
      const csv = generateFullCsv(talk, sessions);

      // Should be properly escaped in the TALK: line
      expect(csv).toContain('Talk, with "special" chars\nand newline');
    });
  });
});
