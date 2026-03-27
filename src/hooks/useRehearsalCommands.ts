"use client";

import { useCallback, useRef, useEffect } from "react";
import { useRehearsalStore, DEFAULT_SPEED } from "@/stores/rehearsalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  getCommands,
  matchCommand,
  parseGoToSlideNumber,
  type VoiceCommandSet,
} from "@/lib/i18n/voiceCommands";
import * as earcons from "@/lib/audio/earcons";
import * as voicebox from "@/lib/speech/voicebox";

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
  const { mode, handlers, totalSlides, onGoToSlide, speakInfo } = options;

  const { commandLanguage, speechRate } = useSettingsStore();
  const {
    currentSlideIndex,
    speedMultiplier,
    increaseSpeed,
    decreaseSpeed,
    resetSpeed,
    setLastCommand,
    talk,
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
    if (handleNavigationCommand(command, transcript)) return command;
    if (handleInfoCommand(command)) return command;
    if (handleBaseCommand(command)) return command;

    return command;
  }, [commands, mode, setLastCommand, handleSpeedCommand, handleNavigationCommand, handleInfoCommand, handleBaseCommand]);

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
  };
}

export default useRehearsalCommands;
