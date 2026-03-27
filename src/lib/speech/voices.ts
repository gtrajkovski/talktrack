import { getVoices, waitForVoices } from "./synthesis";

export type VoiceQuality = "premium" | "good" | "acceptable" | "unknown";

export interface VoiceOption {
  name: string;
  lang: string;
  isDefault: boolean;
  isLocal: boolean;
  quality: VoiceQuality;
}

// Known high-quality voices by platform
// These are curated based on naturalness and clarity
const VOICE_QUALITY_TIERS: Record<VoiceQuality, string[]> = {
  premium: [
    // macOS/iOS premium voices
    "Samantha",
    "Karen",
    "Daniel",
    "Moira",
    "Tessa",
    "Fiona",
    // Google Cloud voices (Android/Chrome)
    "Google US English",
    "Google UK English Female",
    "Google UK English Male",
    // Microsoft Azure Neural voices (Edge/Windows 11)
    "Microsoft Aria Online (Natural)",
    "Microsoft Guy Online (Natural)",
    "Microsoft Jenny Online (Natural)",
  ],
  good: [
    // macOS/iOS standard voices
    "Alex",
    "Victoria",
    "Tom",
    "Kate",
    // Windows 10+ voices
    "Microsoft David",
    "Microsoft Mark",
    "Microsoft Zira",
    // Android voices
    "English United States",
    "English United Kingdom",
  ],
  acceptable: [
    // Older but usable voices
    "Microsoft David Desktop",
    "Microsoft Zira Desktop",
    "Microsoft Mark Desktop",
    // Generic system voices
    "en-US",
    "en-GB",
    "en-AU",
  ],
  unknown: [],
};

// Voices to filter out entirely (broken, robotic, or unusable)
const BLOCKED_VOICES: string[] = [
  // Novelty/joke voices
  "Whisper",
  "Bells",
  "Boing",
  "Bubbles",
  "Cellos",
  "Zarvox",
  "Trinoids",
  "Bad News",
  "Good News",
  "Pipe Organ",
  // Non-English voices that shouldn't appear in English filter
  "Google Deutsch",
  "Google Espanol",
  "Google Francais",
  "Google Italiano",
  // Known broken/low-quality
  "Microsoft Hazel Desktop",
  "Microsoft Heera Desktop",
];

function getQuality(voiceName: string): VoiceQuality {
  for (const [quality, names] of Object.entries(VOICE_QUALITY_TIERS) as [
    VoiceQuality,
    string[]
  ][]) {
    if (names.some((name) => voiceName.includes(name))) {
      return quality;
    }
  }
  return "unknown";
}

function isBlocked(voiceName: string): boolean {
  return BLOCKED_VOICES.some(
    (blocked) =>
      voiceName.toLowerCase().includes(blocked.toLowerCase())
  );
}

const QUALITY_ORDER: Record<VoiceQuality, number> = {
  premium: 0,
  good: 1,
  acceptable: 2,
  unknown: 3,
};

export async function getAvailableVoices(): Promise<VoiceOption[]> {
  const voices = await waitForVoices();

  return voices
    .filter((v) => v.lang.startsWith("en"))
    .filter((v) => !isBlocked(v.name))
    .map((v) => ({
      name: v.name,
      lang: v.lang,
      isDefault: v.default,
      isLocal: v.localService,
      quality: getQuality(v.name),
    }))
    .sort((a, b) => {
      // Sort by quality tier first
      const qualityDiff = QUALITY_ORDER[a.quality] - QUALITY_ORDER[b.quality];
      if (qualityDiff !== 0) return qualityDiff;

      // Within same tier, prefer local voices (faster, work offline)
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;

      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
}

export function getBestVoice(): string {
  const voices = getVoices().filter((v) => v.lang.startsWith("en"));

  // Try premium voices first
  for (const name of VOICE_QUALITY_TIERS.premium) {
    const voice = voices.find((v) => v.name.includes(name));
    if (voice) return voice.name;
  }

  // Then good voices
  for (const name of VOICE_QUALITY_TIERS.good) {
    const voice = voices.find((v) => v.name.includes(name));
    if (voice) return voice.name;
  }

  // Fall back to any English voice
  const englishVoice = voices.find((v) => v.lang.startsWith("en"));
  if (englishVoice) return englishVoice.name;

  // Fall back to default
  const defaultVoice = voices.find((v) => v.default);
  return defaultVoice?.name || "";
}

export function getTopVoices(count: number = 5): VoiceOption[] {
  const voices = getVoices()
    .filter((v) => v.lang.startsWith("en"))
    .filter((v) => !isBlocked(v.name));

  const mapped = voices.map((v) => ({
    name: v.name,
    lang: v.lang,
    isDefault: v.default,
    isLocal: v.localService,
    quality: getQuality(v.name),
  }));

  // Sort and return top N
  return mapped
    .sort((a, b) => {
      const qualityDiff = QUALITY_ORDER[a.quality] - QUALITY_ORDER[b.quality];
      if (qualityDiff !== 0) return qualityDiff;
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, count);
}
