"use client";

import { useCallback, useRef } from "react";
import { getCommands, type VoiceCommandSet, type CommandLanguage } from "@/lib/i18n/voiceCommands";
import * as earcons from "@/lib/audio/earcons";

export type WarmupCommand =
  | "warmupStart"
  | "warmupNext"
  | "warmupRepeat"
  | "warmupQuit"
  | "warmupHelp";

interface UseWarmupCommandsOptions {
  commandLanguage: CommandLanguage;
  onStart?: () => void;
  onNext?: () => void;
  onRepeat?: () => void;
  onQuit?: () => void;
  onHelp?: () => void;
}

/**
 * Hook for handling voice commands during warm-up exercises
 */
export function useWarmupCommands({
  commandLanguage,
  onStart,
  onNext,
  onRepeat,
  onQuit,
  onHelp,
}: UseWarmupCommandsOptions) {
  const commands = getCommands(commandLanguage);
  const lastCommandTimeRef = useRef(0);

  /**
   * Match a transcript against warmup commands
   */
  const matchWarmupCommand = useCallback(
    (text: string): WarmupCommand | null => {
      const normalizedPhrase = text.toLowerCase().trim();
      const words = normalizedPhrase.split(/\s+/).slice(-5);
      const lastWords = words.join(" ");

      const warmupCommands: WarmupCommand[] = [
        "warmupStart",
        "warmupNext",
        "warmupRepeat",
        "warmupQuit",
        "warmupHelp",
      ];

      for (const commandName of warmupCommands) {
        const phrases = commands[commandName as keyof VoiceCommandSet];
        if (!phrases) continue;

        for (const p of phrases) {
          const normalizedCommand = p.toLowerCase();
          if (
            lastWords === normalizedCommand ||
            lastWords.endsWith(" " + normalizedCommand)
          ) {
            return commandName;
          }
        }
      }

      return null;
    },
    [commands]
  );

  /**
   * Check transcript for commands and execute handlers
   * Returns the matched command or null
   */
  const checkCommand = useCallback(
    (text: string): WarmupCommand | null => {
      const now = Date.now();
      // Debounce commands (500ms)
      if (now - lastCommandTimeRef.current < 500) return null;

      const command = matchWarmupCommand(text);
      if (command) {
        lastCommandTimeRef.current = now;
        earcons.commandRecognized();

        switch (command) {
          case "warmupStart":
            onStart?.();
            break;
          case "warmupNext":
            onNext?.();
            break;
          case "warmupRepeat":
            onRepeat?.();
            break;
          case "warmupQuit":
            onQuit?.();
            break;
          case "warmupHelp":
            onHelp?.();
            break;
        }
      }

      return command;
    },
    [matchWarmupCommand, onStart, onNext, onRepeat, onQuit, onHelp]
  );

  return {
    checkCommand,
    matchWarmupCommand,
    commands,
  };
}
