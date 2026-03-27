// ElevenLabs Text-to-Speech API Client
// BYOK (Bring Your Own Key) integration with caching

const API_BASE = "https://api.elevenlabs.io/v1";

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

// In-memory audio cache for the current session
// Key: hash of text + voiceId, Value: audio blob URL
const audioCache = new Map<string, string>();

// Simple hash for cache keys
function hashKey(text: string, voiceId: string): string {
  const str = `${voiceId}:${text}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Test if an API key is valid by making a lightweight request
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/user`, {
      headers: {
        "xi-api-key": apiKey,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch available voices for the user's account
 */
export async function fetchVoices(
  apiKey: string
): Promise<ElevenLabsVoice[]> {
  const response = await fetch(`${API_BASE}/voices`, {
    headers: {
      "xi-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data: ElevenLabsVoicesResponse = await response.json();

  // Sort by category (premade first, then cloned)
  return data.voices.sort((a, b) => {
    if (a.category === "premade" && b.category !== "premade") return -1;
    if (a.category !== "premade" && b.category === "premade") return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Generate speech audio from text using ElevenLabs
 * Returns a blob URL that can be played with Audio element
 */
export async function generateSpeech(
  text: string,
  voiceId: string,
  apiKey: string,
  options: {
    stability?: number; // 0-1, default 0.5
    similarityBoost?: number; // 0-1, default 0.75
    speed?: number; // 0.25-4.0, default 1.0
  } = {}
): Promise<string> {
  // Check cache first
  const cacheKey = hashKey(text, voiceId);
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { stability = 0.5, similarityBoost = 0.75, speed = 1.0 } = options;

  const response = await fetch(
    `${API_BASE}/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          speed,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  // Cache the result
  audioCache.set(cacheKey, blobUrl);

  return blobUrl;
}

// Active audio element for playback control
let currentAudio: HTMLAudioElement | null = null;
let onEndCallback: (() => void) | null = null;

/**
 * Speak text using ElevenLabs TTS
 * Handles playback and provides stop/pause controls
 */
export async function speak(
  text: string,
  voiceId: string,
  apiKey: string,
  options: {
    speed?: number;
    onEnd?: () => void;
  } = {}
): Promise<void> {
  // Stop any current playback
  stop();

  const { speed = 1.0, onEnd } = options;
  onEndCallback = onEnd || null;

  try {
    const blobUrl = await generateSpeech(text, voiceId, apiKey, { speed });

    currentAudio = new Audio(blobUrl);
    currentAudio.onended = () => {
      currentAudio = null;
      onEndCallback?.();
      onEndCallback = null;
    };
    currentAudio.onerror = () => {
      console.warn("ElevenLabs audio playback error");
      currentAudio = null;
      onEndCallback?.();
      onEndCallback = null;
    };

    await currentAudio.play();
  } catch (e) {
    console.warn("ElevenLabs speak failed:", e);
    onEndCallback?.();
    onEndCallback = null;
    throw e;
  }
}

/**
 * Stop current ElevenLabs playback
 */
export function stop(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  onEndCallback = null;
}

/**
 * Pause current ElevenLabs playback
 */
export function pause(): void {
  if (currentAudio) {
    currentAudio.pause();
  }
}

/**
 * Resume paused ElevenLabs playback
 */
export function resume(): void {
  if (currentAudio) {
    currentAudio.play();
  }
}

/**
 * Check if ElevenLabs is currently playing
 */
export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * Check if ElevenLabs playback is paused
 */
export function isPaused(): boolean {
  return currentAudio !== null && currentAudio.paused;
}

/**
 * Clear the audio cache (call when switching voices or on low memory)
 */
export function clearCache(): void {
  for (const blobUrl of audioCache.values()) {
    URL.revokeObjectURL(blobUrl);
  }
  audioCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number } {
  return { entries: audioCache.size };
}
