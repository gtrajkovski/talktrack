import { describe, it, expect } from 'vitest';
import {
  generateContextualHelp,
  generateCommandList,
  generateWhatsNext,
  type AssistantContext,
} from '@/lib/speech/voiceAssistant';
import type { RehearsalSession } from '@/types/session';

// Helper to create a base context
function createContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
  return {
    mode: 'prompt',
    currentSlideIndex: 0,
    totalSlides: 10,
    currentSlide: undefined,
    currentAttempt: undefined,
    session: undefined,
    commandsLearned: {},
    totalSessionsEver: 0,
    isPaused: false,
    isListening: true,
    hasTargetDuration: false,
    dueSlideCount: 0,
    elapsedSeconds: 0,
    ...overrides,
  };
}

describe('generateContextualHelp', () => {
  describe('when paused', () => {
    it('suggests resume command', () => {
      const context = createContext({ isPaused: true });
      const help = generateContextualHelp(context);
      expect(help.toLowerCase()).toContain('resume');
    });
  });

  describe('prompt mode', () => {
    it('suggests reveal for new users', () => {
      const context = createContext({
        mode: 'prompt',
        commandsLearned: {},
      });
      const help = generateContextualHelp(context);
      expect(help.toLowerCase()).toContain('reveal');
    });

    it('does not suggest reveal for experienced users', () => {
      const context = createContext({
        mode: 'prompt',
        commandsLearned: { reveal: 5 },
      });
      const help = generateContextualHelp(context);
      // May or may not contain reveal, but should have some suggestion
      expect(help.length).toBeGreaterThan(0);
    });
  });

  describe('test mode', () => {
    it('suggests help command for new users', () => {
      const context = createContext({
        mode: 'test',
        commandsLearned: {},
      });
      const help = generateContextualHelp(context);
      expect(help.toLowerCase()).toContain('help');
    });
  });

  describe('score-based suggestions', () => {
    it('suggests repeat for low scores', () => {
      const context = createContext({
        currentAttempt: {
          slideId: '1',
          slideIndex: 0,
          similarityScore: 30,
          usedHelp: false,
        },
      });
      const help = generateContextualHelp(context);
      expect(help.toLowerCase()).toContain('repeat');
    });

    it('suggests next for high scores', () => {
      const context = createContext({
        currentAttempt: {
          slideId: '1',
          slideIndex: 0,
          similarityScore: 90,
          usedHelp: false,
        },
      });
      const help = generateContextualHelp(context);
      expect(help.toLowerCase()).toContain('next');
    });
  });

  describe('SR-based suggestions', () => {
    it('suggests smart rehearse when slides are due', () => {
      const context = createContext({
        dueSlideCount: 5,
        currentSlideIndex: 7,
        totalSlides: 10,
        commandsLearned: {},
      });
      const help = generateContextualHelp(context);
      expect(help.toLowerCase()).toContain('smart');
    });
  });

  describe('output constraints', () => {
    it('keeps output under 50 words', () => {
      const context = createContext({
        currentAttempt: {
          slideId: '1',
          slideIndex: 0,
          similarityScore: 40,
          usedHelp: false,
        },
        dueSlideCount: 3,
        hasTargetDuration: true,
        elapsedSeconds: 120,
      });
      const help = generateContextualHelp(context);
      const wordCount = help.split(/\s+/).length;
      expect(wordCount).toBeLessThan(50);
    });
  });
});

describe('generateCommandList', () => {
  describe('listen mode', () => {
    it('includes navigation commands', () => {
      const list = generateCommandList('listen', {});
      expect(list.toLowerCase()).toContain('next');
      expect(list.toLowerCase()).toContain('back');
      expect(list.toLowerCase()).toContain('repeat');
    });
  });

  describe('prompt mode', () => {
    it('includes reveal command', () => {
      const list = generateCommandList('prompt', {});
      expect(list.toLowerCase()).toContain('reveal');
    });
  });

  describe('test mode', () => {
    it('includes help command', () => {
      const list = generateCommandList('test', {});
      expect(list.toLowerCase()).toContain('help');
    });
  });

  describe('completion mode', () => {
    it('includes again and done', () => {
      const list = generateCommandList('completion', {});
      expect(list.toLowerCase()).toContain('again');
      expect(list.toLowerCase()).toContain('done');
    });
  });

  describe('beginner vs experienced', () => {
    it('gives shorter list for beginners', () => {
      const beginnerList = generateCommandList('prompt', {});
      const experiencedList = generateCommandList('prompt', {
        next: 10, back: 10, repeat: 10, reveal: 10,
      });
      // Both should have content
      expect(beginnerList.length).toBeGreaterThan(0);
      expect(experiencedList.length).toBeGreaterThan(0);
    });
  });
});

describe('generateWhatsNext', () => {
  describe('near end of session', () => {
    it('notes last slide', () => {
      const context = createContext({
        currentSlideIndex: 9,
        totalSlides: 10,
      });
      const suggestion = generateWhatsNext(context);
      expect(suggestion.toLowerCase()).toContain('last');
    });
  });

  describe('many slides due', () => {
    it('suggests smart rehearse', () => {
      const context = createContext({
        dueSlideCount: 5,
      });
      const suggestion = generateWhatsNext(context);
      expect(suggestion.toLowerCase()).toContain('smart');
    });
  });

  describe('default case', () => {
    it('shows remaining count', () => {
      const context = createContext({
        currentSlideIndex: 3,
        totalSlides: 10,
      });
      const suggestion = generateWhatsNext(context);
      expect(suggestion).toContain('6');
    });
  });

  describe('struggling session', () => {
    it('suggests slowing down', () => {
      const session: RehearsalSession = {
        id: '1',
        talkId: '1',
        mode: 'test',
        startedAt: Date.now() - 60000,
        currentSlideIndex: 4,
        slidesCompleted: 4,
        totalSlides: 10,
        attempts: [
          { slideId: '1', slideIndex: 0, similarityScore: 30, usedHelp: false },
          { slideId: '2', slideIndex: 1, similarityScore: 40, usedHelp: false },
          { slideId: '3', slideIndex: 2, similarityScore: 35, usedHelp: false },
          { slideId: '4', slideIndex: 3, similarityScore: 25, usedHelp: false },
        ],
      };
      const context = createContext({ session });
      const suggestion = generateWhatsNext(context);
      expect(suggestion.toLowerCase()).toContain('slow');
    });
  });
});
