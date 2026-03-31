import type { CommandLanguage } from "@/lib/i18n/voiceCommands";
import type { Granularity } from "@/lib/utils/chunker";

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
  // Granularity (Prompt 06)
  defaultGranularity: Granularity;
  // VoiceBox Clone settings (local TTS server)
  useVoiceBoxClone: boolean;
  voiceBoxCloneUrl: string;
  voiceBoxCloneVoiceId: string;
  // Voice intelligence tracking
  commandsLearned: Record<string, number>; // command -> usage count
  totalSessionsEver: number;
  // AI Coach settings
  aiProvider: 'free' | 'anthropic' | 'openai' | 'google';
  aiApiKey: string | null;        // BYOK key (null = use free tier)
  aiModel: string | null;         // Custom model override (null = use default)
  enableAiCoach: boolean;         // Master toggle (default: true)
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
  // Granularity default
  defaultGranularity: "slide",
  // VoiceBox Clone defaults
  useVoiceBoxClone: false,
  voiceBoxCloneUrl: "http://localhost:5000",
  voiceBoxCloneVoiceId: "",
  // Voice intelligence defaults
  commandsLearned: {},
  totalSessionsEver: 0,
  // AI Coach defaults
  aiProvider: 'free',
  aiApiKey: null,
  aiModel: null,
  enableAiCoach: true,
};
