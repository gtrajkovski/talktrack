/**
 * Progressive Command Disclosure System
 *
 * Teaches voice commands contextually during rehearsal.
 * Hints are spoken via TTS at a slightly lower rate, during natural pauses.
 * Commands stop being hinted once the user has successfully used them 3 times.
 */

import { speak } from "@/lib/speech/synthesis";
import * as hintsDB from "@/lib/db/hints";

export interface HintConfig {
  command: string;
  phrases: string[];
  showAfterRehearsals: [number, number]; // inclusive range
  triggerCondition: "tts-end" | "silence-8s" | "once-per-session";
  maxTimesShown: number;
  modes: ("prompt" | "test")[]; // which modes this hint applies to
}

const HINT_CONFIGS: HintConfig[] = [
  {
    command: "next",
    phrases: ['Say "next" to continue'],
    showAfterRehearsals: [1, 2],
    triggerCondition: "tts-end",
    maxTimesShown: 3,
    modes: ["prompt", "test"],
  },
  {
    command: "repeat",
    phrases: ['Say "repeat" to hear again'],
    showAfterRehearsals: [1, 2],
    triggerCondition: "tts-end",
    maxTimesShown: 3,
    modes: ["prompt", "test"],
  },
  {
    command: "reveal",
    phrases: ['Stuck? Say "reveal" to hear the answer'],
    showAfterRehearsals: [3, 4],
    triggerCondition: "silence-8s",
    maxTimesShown: 3,
    modes: ["prompt"],
  },
  {
    command: "help",
    phrases: ['Need help? Just say "help"'],
    showAfterRehearsals: [3, 4],
    triggerCondition: "silence-8s",
    maxTimesShown: 3,
    modes: ["test"],
  },
  {
    command: "back",
    phrases: ['You can say "go back" for the previous slide'],
    showAfterRehearsals: [5, 999],
    triggerCondition: "once-per-session",
    maxTimesShown: 2,
    modes: ["prompt", "test"],
  },
];

// Track hints shown this session (for once-per-session triggers)
const sessionHintsShown = new Set<string>();

/**
 * Clear session-level hint tracking (call at session start)
 */
export function clearSessionHints(): void {
  sessionHintsShown.clear();
}

/**
 * Check if a hint should be shown and show it if appropriate
 *
 * @param talkId - The talk being rehearsed
 * @param triggerType - What triggered this check
 * @param mode - Current rehearsal mode
 * @returns Promise<boolean> - Whether a hint was shown
 */
export async function maybeShowHint(
  talkId: string,
  triggerType: "tts-end" | "silence-8s" | "once-per-session",
  mode: "prompt" | "test"
): Promise<boolean> {
  const state = await hintsDB.getHintState(talkId);
  const rehearsalNumber = state.rehearsalCount;

  for (const config of HINT_CONFIGS) {
    // Check if this hint applies to the current mode
    if (!config.modes.includes(mode)) continue;

    // Check rehearsal range
    if (rehearsalNumber < config.showAfterRehearsals[0]) continue;
    if (rehearsalNumber > config.showAfterRehearsals[1]) continue;

    // Check trigger condition
    if (config.triggerCondition !== triggerType) continue;

    // Check once-per-session constraint
    if (triggerType === "once-per-session" && sessionHintsShown.has(config.command)) {
      continue;
    }

    // Check if user has already mastered this command
    const timesUsed = state.commandsUsed[config.command] || 0;
    if (timesUsed >= 3) continue;

    // Check if hint has been shown too many times
    const timesShown = state.hintsShown[config.command] || 0;
    if (timesShown >= config.maxTimesShown) continue;

    // Show the hint!
    await speakHint(config.phrases[0]);
    await hintsDB.recordHintShown(talkId, config.command);

    // Mark as shown this session
    sessionHintsShown.add(config.command);

    return true;
  }

  return false;
}

/**
 * Speak a hint with lower rate and pauses
 */
async function speakHint(text: string): Promise<void> {
  return new Promise((resolve) => {
    // 500ms pause before hint
    setTimeout(() => {
      speak(text, {
        rate: 0.9, // Slightly slower, feels like a whisper/aside
        onEnd: () => {
          // 500ms pause after hint
          setTimeout(resolve, 500);
        },
      });
    }, 500);
  });
}

/**
 * Record that a command was successfully used
 * Call this when a voice command is recognized and executed
 */
export async function recordCommandUsed(talkId: string, command: string): Promise<void> {
  await hintsDB.recordCommandUsed(talkId, command);
}

/**
 * Reset all hints for a talk (or all talks)
 */
export async function resetHints(talkId?: string): Promise<void> {
  if (talkId) {
    await hintsDB.resetHintState(talkId);
  } else {
    await hintsDB.resetAllHints();
  }
  sessionHintsShown.clear();
}

/**
 * Get the current hint state for debugging/display
 */
export async function getHintState(talkId: string) {
  return hintsDB.getHintState(talkId);
}

/**
 * Increment rehearsal count when starting a new session
 */
export async function incrementRehearsalCount(talkId: string): Promise<number> {
  return hintsDB.incrementRehearsalCount(talkId);
}
