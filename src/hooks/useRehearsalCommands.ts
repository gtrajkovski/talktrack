"use client";

import { useCallback, useRef } from "react";
import { useRehearsalStore, DEFAULT_SPEED, HARD_SCORE_THRESHOLD } from "@/stores/rehearsalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  getCommands,
  matchCommand,
  parseGoToSlideNumber,
} from "@/lib/i18n/voiceCommands";
import * as earcons from "@/lib/audio/earcons";
import * as voicebox from "@/lib/speech/voicebox";
import * as synthesis from "@/lib/speech/synthesis";

export type RehearsalMode = "listen" | "prompt" | "test" | "completion";

export interface RehearsalCommandHandlers {
  onNext: () => void;
  onPrev: () => void;
  onRepeat: () => void;
  onReveal?: () => void;  // Prompt mode only
  onHelp?: () => void;    // Test mode only
  onStop: () => void;
  onResume: () => void;
  onAgain?: () => void;   // Completion screen only
  onDone?: () => void;    // Completion screen only
}

export interface RehearsalCommandOptions {
  mode: RehearsalMode;
  handlers: RehearsalCommandHandlers;
  totalSlides: number;
  onGoToSlide?: (index: number) => void;  // 0-indexed
  speakInfo?: (text: string, onEnd?: () => void) => void;  // For info queries
  onRepeatSlowly?: () => void;  // Repeat at 0.7x speed
  onRepeatTitle?: () => void;   // Repeat just the title
}

/**
 * Hook for handling voice commands in rehearsal modes.
 * Includes speed control, navigation, and info queries.
 *
 * Usage:
 * ```tsx
 * const { checkAndExecuteCommand, getEffectiveSpeed } = useRehearsalCommands({
 *   mode: "prompt",
 *   handlers: { onNext, onPrev, onRepeat, onReveal, onStop, onResume },
 *   totalSlides: slides.length,
 *   onGoToSlide: (index) => goToSlide(index),
 *   speakInfo: (text, onEnd) => voicebox.play(text, { onEnd }),
 * });
 * ```
 */
export function useRehearsalCommands(options: RehearsalCommandOptions) {
  const { mode, handlers, totalSlides, onGoToSlide, speakInfo, onRepeatSlowly, onRepeatTitle } = options;

  const { commandLanguage, speechRate } = useSettingsStore();
  const {
    currentSlideIndex,
    speedMultiplier,
    increaseSpeed,
    decreaseSpeed,
    resetSpeed,
    setLastCommand,
    talk,
    session,
    currentAttempt,
    // Bookmark actions
    toggleBookmark,
    clearBookmarks,
    isBookmarked,
    getBookmarkedSlideIndices,
    // Practice mode
    setPracticeMode,
    practiceMode,
    getHardSlideIndices,
  } = useRehearsalStore();

  const commands = getCommands(commandLanguage);
  const lastCommandTimeRef = useRef(0);

  // Get effective speech rate (base * multiplier)
  const getEffectiveSpeed = useCallback(() => {
    return speechRate * speedMultiplier;
  }, [speechRate, speedMultiplier]);

  // Speak info with earcon feedback
  const speakInfoWithFeedback = useCallback((text: string, onEnd?: () => void) => {
    earcons.infoQuery();
    if (speakInfo) {
      speakInfo(text, onEnd);
    } else {
      // Fallback: use voicebox directly
      voicebox.play(text, {
        rate: getEffectiveSpeed(),
        onEnd,
      });
    }
  }, [speakInfo, getEffectiveSpeed]);

  // Handle speed commands
  const handleSpeedCommand = useCallback((command: string): boolean => {
    switch (command) {
      case "faster": {
        const newSpeed = increaseSpeed();
        earcons.speedUp();
        speakInfoWithFeedback(`Speed ${newSpeed.toFixed(1)}x`);
        return true;
      }
      case "slower": {
        const newSpeed = decreaseSpeed();
        earcons.speedDown();
        speakInfoWithFeedback(`Speed ${newSpeed.toFixed(1)}x`);
        return true;
      }
      case "normalSpeed": {
        resetSpeed();
        earcons.speedDown();
        speakInfoWithFeedback("Normal speed");
        return true;
      }
    }
    return false;
  }, [increaseSpeed, decreaseSpeed, resetSpeed, speakInfoWithFeedback]);

  // Handle volume commands
  const handleVolumeCommand = useCallback((command: string): boolean => {
    switch (command) {
      case "louder": {
        const newVol = synthesis.increaseVolume();
        earcons.volumeUp();
        speakInfoWithFeedback(`Volume ${Math.round(newVol * 100)}%`);
        return true;
      }
      case "quieter": {
        const newVol = synthesis.decreaseVolume();
        earcons.volumeDown();
        speakInfoWithFeedback(`Volume ${Math.round(newVol * 100)}%`);
        return true;
      }
      case "maxVolume": {
        synthesis.maxVolume();
        earcons.volumeUp();
        speakInfoWithFeedback("Maximum volume");
        return true;
      }
      case "mute": {
        synthesis.mute();
        earcons.muteToggle();
        return true;
      }
      case "unmute": {
        synthesis.unmute();
        earcons.muteToggle();
        speakInfoWithFeedback("Sound on");
        return true;
      }
    }
    return false;
  }, [speakInfoWithFeedback]);

  // Handle navigation commands
  const handleNavigationCommand = useCallback((command: string, transcript: string): boolean => {
    switch (command) {
      case "firstSlide": {
        if (onGoToSlide) {
          earcons.navigationJump();
          onGoToSlide(0);
          return true;
        }
        break;
      }
      case "lastSlide": {
        if (onGoToSlide) {
          earcons.navigationJump();
          onGoToSlide(totalSlides - 1);
          return true;
        }
        break;
      }
      case "goToSlide": {
        const slideNum = parseGoToSlideNumber(transcript);
        if (slideNum !== null && onGoToSlide) {
          const targetIndex = slideNum - 1; // Convert to 0-indexed
          if (targetIndex >= 0 && targetIndex < totalSlides) {
            earcons.navigationJump();
            onGoToSlide(targetIndex);
            return true;
          } else {
            speakInfoWithFeedback(`Slide ${slideNum} doesn't exist. You have ${totalSlides} slides.`);
            return true;
          }
        }
        break;
      }
    }
    return false;
  }, [onGoToSlide, totalSlides, speakInfoWithFeedback]);

  // Handle info query commands
  const handleInfoCommand = useCallback((command: string): boolean => {
    switch (command) {
      case "whereAmI": {
        const slideTitle = talk?.slides[currentSlideIndex]?.title || "";
        const message = `Slide ${currentSlideIndex + 1} of ${totalSlides}${slideTitle ? `, ${slideTitle}` : ""}`;
        speakInfoWithFeedback(message);
        return true;
      }
      case "howManyLeft": {
        const remaining = totalSlides - currentSlideIndex - 1;
        const message = remaining === 0
          ? "This is the last slide"
          : remaining === 1
            ? "1 slide remaining"
            : `${remaining} slides remaining`;
        speakInfoWithFeedback(message);
        return true;
      }
      case "timeRemaining": {
        // Calculate total remaining time from current slide onwards
        if (talk?.slides) {
          const remainingSlides = talk.slides.slice(currentSlideIndex);
          const totalSeconds = remainingSlides.reduce((sum, slide) => sum + (slide.estimatedSeconds || 0), 0);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;

          let message: string;
          if (minutes === 0) {
            message = `About ${seconds} seconds remaining`;
          } else if (seconds === 0) {
            message = `About ${minutes} ${minutes === 1 ? "minute" : "minutes"} remaining`;
          } else {
            message = `About ${minutes} ${minutes === 1 ? "minute" : "minutes"} and ${seconds} seconds remaining`;
          }
          speakInfoWithFeedback(message);
        } else {
          speakInfoWithFeedback("Unable to estimate time");
        }
        return true;
      }
    }
    return false;
  }, [currentSlideIndex, totalSlides, talk, speakInfoWithFeedback]);

  // Handle bookmark commands
  const handleBookmarkCommand = useCallback((command: string): boolean => {
    const currentSlide = talk?.slides[currentSlideIndex];
    if (!currentSlide) return false;

    switch (command) {
      case "bookmark": {
        const wasBookmarked = isBookmarked(currentSlide.id);
        const nowBookmarked = toggleBookmark(currentSlide.id);
        if (nowBookmarked) {
          earcons.bookmarkAdded();
          speakInfoWithFeedback("Slide bookmarked");
        } else {
          earcons.bookmarkRemoved();
          speakInfoWithFeedback("Bookmark removed");
        }
        return true;
      }
      case "listBookmarks": {
        const bookmarkedIndices = getBookmarkedSlideIndices();
        if (bookmarkedIndices.length === 0) {
          speakInfoWithFeedback("No bookmarks yet. Say 'bookmark' to mark slides for extra practice.");
        } else if (bookmarkedIndices.length === 1) {
          speakInfoWithFeedback(`1 bookmarked slide: slide ${bookmarkedIndices[0] + 1}`);
        } else {
          const slideList = bookmarkedIndices.slice(0, 5).map(i => i + 1).join(", ");
          const more = bookmarkedIndices.length > 5 ? ` and ${bookmarkedIndices.length - 5} more` : "";
          speakInfoWithFeedback(`${bookmarkedIndices.length} bookmarked slides: ${slideList}${more}`);
        }
        return true;
      }
      case "practiceBookmarks": {
        const bookmarkedIndices = getBookmarkedSlideIndices();
        if (bookmarkedIndices.length === 0) {
          speakInfoWithFeedback("No bookmarks yet. Say 'bookmark' to mark slides first.");
        } else {
          setPracticeMode('bookmarksOnly');
          earcons.navigationJump();
          speakInfoWithFeedback(`Practicing ${bookmarkedIndices.length} bookmarked slides`);
          // Navigate to first bookmarked slide if not already on one
          if (onGoToSlide && !isBookmarked(currentSlide.id)) {
            onGoToSlide(bookmarkedIndices[0]);
          }
        }
        return true;
      }
      case "clearBookmarks": {
        const count = getBookmarkedSlideIndices().length;
        if (count === 0) {
          speakInfoWithFeedback("No bookmarks to clear");
        } else {
          clearBookmarks();
          earcons.bookmarkRemoved();
          speakInfoWithFeedback(`Cleared ${count} bookmark${count === 1 ? "" : "s"}`);
          // Reset to all slides mode if in bookmarks mode
          if (practiceMode === 'bookmarksOnly') {
            setPracticeMode('all');
          }
        }
        return true;
      }
    }
    return false;
  }, [talk, currentSlideIndex, isBookmarked, toggleBookmark, getBookmarkedSlideIndices, clearBookmarks, setPracticeMode, practiceMode, onGoToSlide, speakInfoWithFeedback]);

  // Handle score query commands
  const handleScoreCommand = useCallback((command: string): boolean => {
    switch (command) {
      case "howDidIDo": {
        // Report score for current attempt or last attempt on this slide
        const currentSlide = talk?.slides[currentSlideIndex];
        if (currentAttempt?.similarityScore !== undefined) {
          const score = Math.round(currentAttempt.similarityScore);
          const message = score >= 85 ? `Great job! ${score} percent`
            : score >= 70 ? `Good work, ${score} percent`
            : score >= 50 ? `${score} percent. Keep practicing!`
            : `${score} percent. You can do better!`;
          speakInfoWithFeedback(message);
        } else if (currentSlide?.lastScore !== undefined) {
          speakInfoWithFeedback(`Your last score on this slide was ${Math.round(currentSlide.lastScore)} percent`);
        } else {
          speakInfoWithFeedback("No score yet. Complete the slide to get a score.");
        }
        return true;
      }
      case "myAverage": {
        // Calculate average from session attempts
        if (session && session.attempts.length > 0) {
          const scores = session.attempts
            .filter(a => a.similarityScore !== undefined)
            .map(a => a.similarityScore!);
          if (scores.length > 0) {
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            speakInfoWithFeedback(`Your session average is ${avg} percent across ${scores.length} slides`);
          } else {
            speakInfoWithFeedback("No scores recorded yet this session");
          }
        } else {
          speakInfoWithFeedback("No scores recorded yet this session");
        }
        return true;
      }
      case "worstSlides": {
        // Find slides with lowest scores
        const hardIndices = getHardSlideIndices();
        if (hardIndices.length === 0) {
          speakInfoWithFeedback("No slides need extra practice. You're doing great!");
        } else if (hardIndices.length === 1) {
          speakInfoWithFeedback(`Slide ${hardIndices[0] + 1} needs more practice`);
        } else {
          const slideList = hardIndices.slice(0, 3).map(i => i + 1).join(", ");
          const more = hardIndices.length > 3 ? ` and ${hardIndices.length - 3} more` : "";
          speakInfoWithFeedback(`Slides needing practice: ${slideList}${more}`);
        }
        return true;
      }
    }
    return false;
  }, [talk, currentSlideIndex, currentAttempt, session, getHardSlideIndices, speakInfoWithFeedback]);

  // Handle repeat variation commands
  const handleRepeatVariationCommand = useCallback((command: string): boolean => {
    switch (command) {
      case "repeatSlowly": {
        if (onRepeatSlowly) {
          earcons.repeat();
          onRepeatSlowly();
          return true;
        }
        // Fallback: trigger regular repeat with feedback
        earcons.repeat();
        speakInfoWithFeedback("Repeating slowly");
        handlers.onRepeat();
        return true;
      }
      case "repeatTitle": {
        if (onRepeatTitle) {
          earcons.repeat();
          onRepeatTitle();
          return true;
        }
        // Fallback: speak the title directly
        const title = talk?.slides[currentSlideIndex]?.title;
        if (title) {
          earcons.repeat();
          speakInfoWithFeedback(title);
        } else {
          speakInfoWithFeedback("No title for this slide");
        }
        return true;
      }
    }
    return false;
  }, [onRepeatSlowly, onRepeatTitle, handlers, talk, currentSlideIndex, speakInfoWithFeedback]);

  // Handle practice mode commands
  const handlePracticeModeCommand = useCallback((command: string): boolean => {
    switch (command) {
      case "hardOnly": {
        const hardIndices = getHardSlideIndices();
        if (hardIndices.length === 0) {
          speakInfoWithFeedback("No hard slides found. All slides have good scores!");
        } else {
          setPracticeMode('hardOnly');
          earcons.navigationJump();
          speakInfoWithFeedback(`Practicing ${hardIndices.length} hard slides`);
          // Navigate to first hard slide if not already on one
          const currentSlide = talk?.slides[currentSlideIndex];
          const isOnHardSlide = currentSlide?.lastScore !== undefined && currentSlide.lastScore < HARD_SCORE_THRESHOLD;
          if (onGoToSlide && !isOnHardSlide) {
            onGoToSlide(hardIndices[0]);
          }
        }
        return true;
      }
      case "allSlides": {
        setPracticeMode('all');
        earcons.infoQuery();
        speakInfoWithFeedback("Practicing all slides");
        return true;
      }
    }
    return false;
  }, [getHardSlideIndices, setPracticeMode, talk, currentSlideIndex, onGoToSlide, speakInfoWithFeedback]);

  // Handle base navigation commands
  const handleBaseCommand = useCallback((command: string): boolean => {
    switch (command) {
      case "next":
        handlers.onNext();
        return true;
      case "back":
        handlers.onPrev();
        return true;
      case "repeat":
        handlers.onRepeat();
        return true;
      case "reveal":
        if (handlers.onReveal) {
          handlers.onReveal();
          return true;
        }
        break;
      case "help":
        if (handlers.onHelp) {
          handlers.onHelp();
          return true;
        }
        break;
      case "stop":
        handlers.onStop();
        return true;
      case "resume":
        handlers.onResume();
        return true;
      case "again":
        if (handlers.onAgain) {
          handlers.onAgain();
          return true;
        }
        break;
      case "done":
        if (handlers.onDone) {
          handlers.onDone();
          return true;
        }
        break;
    }
    return false;
  }, [handlers]);

  /**
   * Check if transcript contains a command and execute it.
   * Returns the command name if executed, null otherwise.
   */
  const checkAndExecuteCommand = useCallback((transcript: string): string | null => {
    // Debounce: ignore commands within 500ms of last command
    const now = Date.now();
    if (now - lastCommandTimeRef.current < 500) return null;

    const command = matchCommand(transcript, commands, mode);
    if (!command) return null;

    // Update timestamp and store
    lastCommandTimeRef.current = now;
    setLastCommand(command);
    earcons.commandRecognized();

    // Try handlers in order of specificity
    if (handleSpeedCommand(command)) return command;
    if (handleVolumeCommand(command)) return command;
    if (handleNavigationCommand(command, transcript)) return command;
    if (handleInfoCommand(command)) return command;
    if (handleBookmarkCommand(command)) return command;
    if (handleScoreCommand(command)) return command;
    if (handleRepeatVariationCommand(command)) return command;
    if (handlePracticeModeCommand(command)) return command;
    if (handleBaseCommand(command)) return command;

    return command;
  }, [commands, mode, setLastCommand, handleSpeedCommand, handleVolumeCommand, handleNavigationCommand, handleInfoCommand, handleBookmarkCommand, handleScoreCommand, handleRepeatVariationCommand, handlePracticeModeCommand, handleBaseCommand]);

  /**
   * Check command without executing (for preview/logging)
   */
  const detectCommand = useCallback((transcript: string): string | null => {
    return matchCommand(transcript, commands, mode);
  }, [commands, mode]);

  return {
    checkAndExecuteCommand,
    detectCommand,
    getEffectiveSpeed,
    speedMultiplier,
    isSpeedModified: speedMultiplier !== DEFAULT_SPEED,
    // Bookmark state
    isCurrentSlideBookmarked: talk?.slides[currentSlideIndex]
      ? isBookmarked(talk.slides[currentSlideIndex].id)
      : false,
    bookmarkCount: getBookmarkedSlideIndices().length,
    // Practice mode state
    practiceMode,
  };
}

export default useRehearsalCommands;
