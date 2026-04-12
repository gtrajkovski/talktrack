import type { CommandLanguage } from "@/lib/i18n/voiceCommands";
import type { Granularity } from "@/lib/utils/chunker";
import type { Locale } from "@/i18n/config";
import type { WarmupDuration } from "@/types/warmup";

export interface UserSettings {
  // UI Language (i18n)
  uiLanguage: Locale;
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
  // AI Coach settings (BYOK only - user must provide their own API key)
  aiProvider: 'anthropic' | 'openai' | 'google' | null;
  aiApiKey: string | null;        // Required BYOK key
  aiModel: string | null;         // Custom model override (null = use default)
  enableAiCoach: boolean;         // Master toggle
  // Audio device settings (Phase 1B)
  preferredMicLabel: string;      // Device label (not ID - IDs rotate for privacy)
  preferredMicGroupId: string;    // For fuzzy matching
  preferredSpeakerLabel: string;
  preferredSpeakerGroupId: string;
  // Warm-up settings
  enableWarmups: boolean;         // Master toggle for warm-up feature
  warmupDuration: WarmupDuration; // 'short' | 'medium' | 'long'
  warmupAutoPrompt: boolean;      // Prompt to warm up before rehearsal
  // Audience simulation settings
  enableAudienceSimulation: boolean;  // Play ambient crowd sounds during rehearsal
  audienceVolume: number;             // 0-1, default 0.15
}

export const DEFAULT_SETTINGS: UserSettings = {
  uiLanguage: "en",
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
  // AI Coach defaults (BYOK only - disabled until user adds API key)
  aiProvider: null,
  aiApiKey: null,
  aiModel: null,
  enableAiCoach: false,
  // Audio device defaults
  preferredMicLabel: '',
  preferredMicGroupId: '',
  preferredSpeakerLabel: '',
  preferredSpeakerGroupId: '',
  // Warm-up defaults
  enableWarmups: true,
  warmupDuration: 'medium',
  warmupAutoPrompt: false,
  // Audience simulation defaults
  enableAudienceSimulation: false,
  audienceVolume: 0.15,
};
