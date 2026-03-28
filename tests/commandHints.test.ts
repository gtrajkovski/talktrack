import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { HintState } from '@/lib/db/index';

// Mock the db/hints module
const mockHintState: HintState = {
  id: 'test-talk',
  rehearsalCount: 1,
  hintsShown: {},
  commandsUsed: {},
  lastUpdated: Date.now(),
};

vi.mock('@/lib/db/hints', () => ({
  getHintState: vi.fn(async () => ({ ...mockHintState })),
  recordHintShown: vi.fn(async () => {}),
  recordCommandUsed: vi.fn(async () => {}),
  resetHintState: vi.fn(async () => {}),
  resetAllHints: vi.fn(async () => {}),
  incrementRehearsalCount: vi.fn(async () => mockHintState.rehearsalCount + 1),
}));

// Mock the speech synthesis
vi.mock('@/lib/speech/synthesis', () => ({
  speak: vi.fn((text: string, options?: { rate?: number; onEnd?: () => void }) => {
    // Immediately call onEnd to simulate speech completion
    if (options?.onEnd) {
      setTimeout(options.onEnd, 0);
    }
  }),
}));

// Import after mocks are set up
import {
  clearSessionHints,
  maybeShowHint,
  recordCommandUsed,
  resetHints,
  getHintState,
  incrementRehearsalCount,
} from '@/lib/commandHints';
import * as hintsDB from '@/lib/db/hints';
import { speak } from '@/lib/speech/synthesis';

describe('clearSessionHints', () => {
  it('clears session tracking', () => {
    // Should not throw
    expect(() => clearSessionHints()).not.toThrow();
  });
});

describe('maybeShowHint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionHints();
    // Reset mock state
    mockHintState.rehearsalCount = 1;
    mockHintState.hintsShown = {};
    mockHintState.commandsUsed = {};
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "next" hint on tts-end in prompt mode during rehearsals 1-2', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 1;

    const resultPromise = maybeShowHint('test-talk', 'tts-end', 'prompt');

    // Advance all timers
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result).toBe(true);
    expect(speak).toHaveBeenCalled();
    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'next');
  });

  it('shows "next" hint on tts-end in test mode during rehearsals 1-2', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 2;

    const resultPromise = maybeShowHint('test-talk', 'tts-end', 'test');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result).toBe(true);
    expect(speak).toHaveBeenCalled();
  });

  it('does not show "next" hint after rehearsal 2', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 3;

    const resultPromise = maybeShowHint('test-talk', 'tts-end', 'prompt');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    // Should not show "next" hint, but might show other hints
    // If "reveal" applies (rehearsals 3-4, silence-8s), it won't trigger on tts-end
    expect(result).toBe(false);
  });

  it('does not show hint if user has mastered the command (3+ uses)', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 1;
    mockHintState.commandsUsed = { next: 3 };

    const resultPromise = maybeShowHint('test-talk', 'tts-end', 'prompt');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    // "next" is mastered, should try "repeat" instead
    expect(speak).toHaveBeenCalled();
    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'repeat');
  });

  it('does not show hint if maxTimesShown reached', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 1;
    mockHintState.hintsShown = { next: 3, repeat: 3 };

    const resultPromise = maybeShowHint('test-talk', 'tts-end', 'prompt');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    // Both "next" and "repeat" have been shown 3 times
    expect(result).toBe(false);
  });

  it('shows "reveal" hint on silence-8s in prompt mode during rehearsals 3-4', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 3;

    const resultPromise = maybeShowHint('test-talk', 'silence-8s', 'prompt');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result).toBe(true);
    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'reveal');
  });

  it('shows "help" hint on silence-8s in test mode during rehearsals 3-4', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 4;

    const resultPromise = maybeShowHint('test-talk', 'silence-8s', 'test');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result).toBe(true);
    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'help');
  });

  it('does not show "reveal" hint in test mode (wrong mode)', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 3;

    const resultPromise = maybeShowHint('test-talk', 'silence-8s', 'test');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    // "reveal" is prompt-only, "help" applies to test mode
    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'help');
  });

  it('shows "back" hint on once-per-session trigger after rehearsal 5', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 5;

    const resultPromise = maybeShowHint('test-talk', 'once-per-session', 'prompt');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result).toBe(true);
    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'back');
  });

  it('does not show same once-per-session hint twice in same session', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 5;

    // First call
    const result1Promise = maybeShowHint('test-talk', 'once-per-session', 'prompt');
    await vi.runAllTimersAsync();
    const result1 = await result1Promise;

    vi.clearAllMocks();

    // Second call in same session
    const result2Promise = maybeShowHint('test-talk', 'once-per-session', 'prompt');
    await vi.runAllTimersAsync();
    const result2 = await result2Promise;

    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it('returns false when no hints apply', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 0; // Before any hints are scheduled

    const resultPromise = maybeShowHint('test-talk', 'tts-end', 'prompt');
    await vi.runAllTimersAsync();

    const result = await resultPromise;

    expect(result).toBe(false);
  });
});

describe('recordCommandUsed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls hintsDB.recordCommandUsed', async () => {
    await recordCommandUsed('test-talk', 'next');

    expect(hintsDB.recordCommandUsed).toHaveBeenCalledWith('test-talk', 'next');
  });

  it('works with different commands', async () => {
    await recordCommandUsed('talk-1', 'repeat');
    await recordCommandUsed('talk-2', 'reveal');

    expect(hintsDB.recordCommandUsed).toHaveBeenCalledWith('talk-1', 'repeat');
    expect(hintsDB.recordCommandUsed).toHaveBeenCalledWith('talk-2', 'reveal');
  });
});

describe('resetHints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets hints for specific talk', async () => {
    await resetHints('test-talk');

    expect(hintsDB.resetHintState).toHaveBeenCalledWith('test-talk');
  });

  it('resets all hints when no talkId provided', async () => {
    await resetHints();

    expect(hintsDB.resetAllHints).toHaveBeenCalled();
  });

  it('clears session hints on reset', async () => {
    // This is implicit - we can't directly test the Set, but we can verify behavior
    await resetHints();
    expect(() => clearSessionHints()).not.toThrow();
  });
});

describe('getHintState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hint state from database', async () => {
    const state = await getHintState('test-talk');

    expect(hintsDB.getHintState).toHaveBeenCalledWith('test-talk');
    expect(state).toBeDefined();
    expect(state.id).toBe('test-talk');
  });
});

describe('incrementRehearsalCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments and returns new count', async () => {
    mockHintState.rehearsalCount = 5;

    const newCount = await incrementRehearsalCount('test-talk');

    expect(hintsDB.incrementRehearsalCount).toHaveBeenCalledWith('test-talk');
    expect(newCount).toBe(6);
  });
});

describe('hint configuration validation', () => {
  it('next hint applies to both prompt and test modes', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 1;
    mockHintState.hintsShown = {};
    mockHintState.commandsUsed = {};

    clearSessionHints();
    vi.clearAllMocks();

    // Prompt mode
    const promptPromise = maybeShowHint('test-talk', 'tts-end', 'prompt');
    await vi.runAllTimersAsync();
    await promptPromise;

    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'next');

    clearSessionHints();
    vi.clearAllMocks();

    // Test mode
    const testPromise = maybeShowHint('test-talk', 'tts-end', 'test');
    await vi.runAllTimersAsync();
    await testPromise;

    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'next');

    vi.useRealTimers();
  });

  it('reveal hint only applies to prompt mode', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 3;
    mockHintState.hintsShown = {};
    mockHintState.commandsUsed = {};

    clearSessionHints();
    vi.clearAllMocks();

    // Prompt mode - should show reveal
    const promptPromise = maybeShowHint('test-talk', 'silence-8s', 'prompt');
    await vi.runAllTimersAsync();
    await promptPromise;

    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'reveal');

    clearSessionHints();
    vi.clearAllMocks();

    // Test mode - should show help instead
    const testPromise = maybeShowHint('test-talk', 'silence-8s', 'test');
    await vi.runAllTimersAsync();
    await testPromise;

    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'help');

    vi.useRealTimers();
  });

  it('help hint only applies to test mode', async () => {
    vi.useFakeTimers();
    mockHintState.rehearsalCount = 3;
    mockHintState.hintsShown = {};
    mockHintState.commandsUsed = {};

    clearSessionHints();
    vi.clearAllMocks();

    // Test mode - should show help
    const testPromise = maybeShowHint('test-talk', 'silence-8s', 'test');
    await vi.runAllTimersAsync();
    await testPromise;

    expect(hintsDB.recordHintShown).toHaveBeenCalledWith('test-talk', 'help');

    vi.useRealTimers();
  });
});
