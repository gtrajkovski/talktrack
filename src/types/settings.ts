export interface UserSettings {
  voiceName: string;
  speechRate: number;
  autoAdvance: boolean;
  autoAdvanceDelay: number;
  showWordCount: boolean;
  enableVoiceCommands: boolean;
  theme: "dark" | "light";
  wordsPerMinute: number;
  hasSeenOnboarding: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  voiceName: "",
  speechRate: 0.95,
  autoAdvance: true,
  autoAdvanceDelay: 1,
  showWordCount: true,
  enableVoiceCommands: true,
  theme: "dark",
  wordsPerMinute: 100,
  hasSeenOnboarding: false,
};
