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
  // Earcon settings
  enableEarcons: boolean;
  earconVolume: number; // 0-1, default 0.3
  // Hint settings
  enableHints: boolean;
  // ElevenLabs settings
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  useElevenLabs: boolean;
  // Voice picker
  hasSelectedVoice: boolean;
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
  // Earcon defaults
  enableEarcons: true,
  earconVolume: 0.3,
  // Hint defaults
  enableHints: true,
  // ElevenLabs defaults
  elevenLabsApiKey: "",
  elevenLabsVoiceId: "",
  useElevenLabs: false,
  // Voice picker
  hasSelectedVoice: false,
};
