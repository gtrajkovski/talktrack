import type { CommandLanguage } from "@/lib/i18n/voiceCommands";

export interface UserSettings {
  voiceName: string;
  speechRate: number;
  autoAdvance: boolean;
  autoAdvanceDelay: number;
  showWordCount: boolean;
  enableVoiceCommands: boolean;
  commandLanguage: CommandLanguage;
  theme: "dark" | "light";
  wordsPerMinute: number;
  hasSeenOnboarding: boolean;
  showTimer: boolean;
  timerWarningSeconds: number; // Warn when this many seconds remain
}

export const DEFAULT_SETTINGS: UserSettings = {
  voiceName: "",
  speechRate: 0.95,
  autoAdvance: true,
  autoAdvanceDelay: 1,
  showWordCount: true,
  enableVoiceCommands: true,
  commandLanguage: "en",
  theme: "dark",
  wordsPerMinute: 100,
  hasSeenOnboarding: false,
  showTimer: false,
  timerWarningSeconds: 10,
};
