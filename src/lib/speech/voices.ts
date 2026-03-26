import { getVoices, waitForVoices } from "./synthesis";

export interface VoiceOption {
  name: string;
  lang: string;
  isDefault: boolean;
  isLocal: boolean;
}

export async function getAvailableVoices(): Promise<VoiceOption[]> {
  const voices = await waitForVoices();

  return voices
    .filter((v) => v.lang.startsWith("en"))
    .map((v) => ({
      name: v.name,
      lang: v.lang,
      isDefault: v.default,
      isLocal: v.localService,
    }))
    .sort((a, b) => {
      // Prefer local voices (faster, work offline)
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      // Then by name
      return a.name.localeCompare(b.name);
    });
}

export function getBestVoice(): string {
  const voices = getVoices().filter((v) => v.lang.startsWith("en"));

  // Prefer high-quality voices
  const preferredNames = [
    "Samantha",
    "Karen",
    "Daniel",
    "Google US English",
    "Microsoft Zira",
    "Microsoft David",
  ];

  for (const name of preferredNames) {
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
