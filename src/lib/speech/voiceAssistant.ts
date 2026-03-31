/**
 * Voice Assistant Module
 *
 * Generates context-aware help suggestions based on session state.
 * Supports progressive disclosure — introduces commands as user learns.
 */

import type { RehearsalMode } from "@/hooks/useRehearsalCommands";
import type { Slide } from "@/types/talk";
import type { SlideAttempt, RehearsalSession } from "@/types/session";

export interface AssistantContext {
  mode: RehearsalMode;
  currentSlideIndex: number;
  totalSlides: number;
  currentSlide?: Slide;
  currentAttempt?: SlideAttempt;
  session?: RehearsalSession;
  commandsLearned: Record<string, number>;
  totalSessionsEver: number;
  isPaused: boolean;
  isListening: boolean;
  hasTargetDuration: boolean;
  dueSlideCount: number;
  elapsedSeconds: number;
}

interface Suggestion {
  text: string;
  command: string;
  priority: number; // Higher = more relevant
}

// Commands to introduce progressively (in order of teaching)
// Kept for future progressive disclosure feature
const _PROGRESSIVE_COMMANDS = [
  "next",
  "repeat",
  "reveal",     // Prompt mode
  "help",       // Test mode
  "back",
  "bookmark",
  "how did I do",
  "what did I miss",
  "summary",
  "smart rehearse",
  "set timer",
  "am I on pace",
];
void _PROGRESSIVE_COMMANDS; // Silence unused variable warning

/**
 * Check if user has learned a command (used it at least N times)
 */
function hasLearned(command: string, commandsLearned: Record<string, number>, threshold = 3): boolean {
  return (commandsLearned[command] || 0) >= threshold;
}

/**
 * Check if user is a beginner (few sessions)
 */
function isBeginner(context: AssistantContext): boolean {
  return context.totalSessionsEver < 3;
}

/**
 * Generate context-aware help suggestions
 * Returns max 3 suggestions, under 40 words total
 */
export function generateContextualHelp(context: AssistantContext): string {
  const suggestions = getSuggestions(context);

  // Sort by priority and take top 3
  const topSuggestions = suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);

  if (topSuggestions.length === 0) {
    return getGenericHelp(context);
  }

  // Build spoken response
  const parts = topSuggestions.map(s => s.text);
  return parts.join(" ");
}

function getSuggestions(context: AssistantContext): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { mode, currentAttempt, currentSlide, isPaused, commandsLearned } = context;

  // 1. If paused, suggest resume
  if (isPaused) {
    suggestions.push({
      text: "Say \"resume\" to continue.",
      command: "resume",
      priority: 100,
    });
    return suggestions; // Only this matters when paused
  }

  // 2. Mode-specific primary suggestions
  if (mode === "prompt") {
    if (!hasLearned("reveal", commandsLearned)) {
      suggestions.push({
        text: "Say \"reveal\" to hear the answer.",
        command: "reveal",
        priority: 90,
      });
    }
  }

  if (mode === "test") {
    if (!hasLearned("help", commandsLearned)) {
      suggestions.push({
        text: "Say \"help\" if you're stuck.",
        command: "help",
        priority: 90,
      });
    }
  }

  // 3. Score-based suggestions
  if (currentAttempt?.similarityScore !== undefined) {
    const score = currentAttempt.similarityScore;

    if (score < 50) {
      // Struggling
      suggestions.push({
        text: "Say \"repeat\" to practice again.",
        command: "repeat",
        priority: 80,
      });

      if (!hasLearned("what did I miss", commandsLearned)) {
        suggestions.push({
          text: "Ask \"what did I miss\" for feedback.",
          command: "what did I miss",
          priority: 75,
        });
      }
    } else if (score >= 85) {
      // Doing well
      suggestions.push({
        text: "Nice! Say \"next\" to continue.",
        command: "next",
        priority: 85,
      });
    }
  } else if (currentSlide?.lastScore !== undefined && currentSlide.lastScore < 50) {
    // Historical struggle with this slide
    suggestions.push({
      text: "You've found this slide tricky before. Take your time.",
      command: "",
      priority: 70,
    });
  }

  // 4. Navigation suggestions for beginners
  if (isBeginner(context)) {
    if (!hasLearned("next", commandsLearned)) {
      suggestions.push({
        text: "Say \"next\" to move forward.",
        command: "next",
        priority: 60,
      });
    }
    if (!hasLearned("back", commandsLearned)) {
      suggestions.push({
        text: "Say \"back\" to go to the previous slide.",
        command: "back",
        priority: 50,
      });
    }
  }

  // 5. SR-based suggestions
  if (context.dueSlideCount > 0 && context.currentSlideIndex > context.totalSlides / 2) {
    if (!hasLearned("smart rehearse", commandsLearned)) {
      suggestions.push({
        text: `${context.dueSlideCount} slides due. Try "smart rehearse".`,
        command: "smart rehearse",
        priority: 65,
      });
    }
  }

  // 6. Timing suggestions
  if (context.hasTargetDuration && context.elapsedSeconds > 60) {
    if (!hasLearned("am I on pace", commandsLearned)) {
      suggestions.push({
        text: "Ask \"am I on pace\" to check your timing.",
        command: "am I on pace",
        priority: 55,
      });
    }
  }

  // 7. Bookmark suggestion if doing well
  if (currentSlide && (currentSlide.lastScore === undefined || currentSlide.lastScore >= 70)) {
    if (!hasLearned("bookmark", commandsLearned) && context.totalSessionsEver >= 2) {
      suggestions.push({
        text: "Say \"bookmark\" to mark tricky slides.",
        command: "bookmark",
        priority: 40,
      });
    }
  }

  // 8. Summary suggestion mid-session
  if (context.currentSlideIndex >= context.totalSlides / 2) {
    if (!hasLearned("summary", commandsLearned)) {
      suggestions.push({
        text: "Ask \"summary\" to hear your progress.",
        command: "summary",
        priority: 45,
      });
    }
  }

  return suggestions;
}

function getGenericHelp(context: AssistantContext): string {
  if (context.mode === "prompt") {
    return "Say \"next\" to advance, \"reveal\" to hear the answer, or \"repeat\" to try again.";
  }
  if (context.mode === "test") {
    return "Recite what you remember. Say \"help\" if stuck, \"next\" when ready to continue.";
  }
  if (context.mode === "listen") {
    return "Say \"next\" to skip ahead, \"repeat\" to hear again, or \"back\" to go back.";
  }
  return "Say \"help\" anytime for suggestions.";
}

/**
 * Generate mode-specific command list for "what can I say"
 */
export function generateCommandList(mode: RehearsalMode, commandsLearned: Record<string, number>): string {
  const beginner = Object.values(commandsLearned).reduce((a, b) => a + b, 0) < 20;

  if (mode === "listen") {
    if (beginner) {
      return "In listen mode, you can say: next, back, repeat, stop, faster, slower.";
    }
    return "Listen mode commands: next, back, repeat, stop, resume, faster, slower, first slide, last slide, go to slide, where am I, how many left.";
  }

  if (mode === "prompt") {
    if (beginner) {
      return "In prompt mode, say: next when done, reveal for the answer, repeat to hear again, back, or stop.";
    }
    return "Prompt mode commands: next, back, repeat, reveal, stop, resume. Plus: how did I do, what did I miss, summary, bookmark, smart rehearse.";
  }

  if (mode === "test") {
    if (beginner) {
      return "In test mode, recite the slide, then say: next when done, help if stuck, repeat to try again, or back.";
    }
    return "Test mode commands: next, back, repeat, help, stop, resume. Plus: how did I do, what did I miss, summary, bookmark, smart rehearse.";
  }

  if (mode === "completion") {
    return "Session complete. Say \"again\" to practice more, or \"done\" to exit.";
  }

  return "Say \"help\" for suggestions.";
}

/**
 * Generate what's next suggestion based on context
 */
export function generateWhatsNext(context: AssistantContext): string {
  const { currentSlideIndex, totalSlides, session, dueSlideCount } = context;

  // If near end of session
  if (currentSlideIndex >= totalSlides - 1) {
    return "This is the last slide. Finish up and you'll hear your session summary.";
  }

  // If many slides due for SR
  if (dueSlideCount > 3) {
    return `You have ${dueSlideCount} slides overdue. Say "smart rehearse" to focus on those.`;
  }

  // If struggling (average score low this session)
  if (session && session.attempts.length >= 3) {
    const scores = session.attempts
      .filter(a => a.similarityScore !== undefined)
      .map(a => a.similarityScore!);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    if (avg < 50) {
      return "Consider slowing down. Say \"repeat slowly\" to hear slides at a slower pace.";
    }
  }

  // Default: just continue
  const remaining = totalSlides - currentSlideIndex - 1;
  return `${remaining} slide${remaining !== 1 ? "s" : ""} to go. Say "next" to continue.`;
}
