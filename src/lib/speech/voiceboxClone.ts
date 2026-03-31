// VoiceBox Clone - Local TTS Server Client
// Generic interface for local TTS servers (VoiceBox, Coqui, etc.)

import { getCachedSpeakerPreference, applySpeakerToAudio } from "@/lib/audio/devices";

export interface VoiceBoxCloneVoice {
  id: string;
  name: string;
  language?: string;
  description?: string;
}

interface VoicesResponse {
  voices: VoiceBoxCloneVoice[];
}

interface HealthResponse {
  status: "ok" | "error";
  version?: string;
}

// In-memory audio cache for the current session
// Key: hash of text + voiceId, Value: audio blob URL
const audioCache = new Map<string, string>();

// Simple hash for cache keys (same as elevenlabs.ts)
function hashKey(text: string, voiceId: string): string {
  const str = `vbc:${voiceId}:${text}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Check if the VoiceBox Clone server is healthy
 */
export async function checkHealth(serverUrl: string): Promise<boolean> {
  if (!serverUrl || serverUrl.trim().length === 0) {
    return false;
  }

  try {
    const response = await fetch(`${serverUrl}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (!response.ok) {
      return false;
    }

    const data: HealthResponse = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Fetch available voices from the VoiceBox Clone server
 */
export async function fetchVoices(
  serverUrl: string
): Promise<VoiceBoxCloneVoice[]> {
  const response = await fetch(`${serverUrl}/api/voices`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  const data: VoicesResponse = await response.json();
  return data.voices.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generate speech audio from text using VoiceBox Clone
 * Returns a blob URL that can be played with Audio element
 */
export async function generateSpeech(
  text: string,
  voiceId: string,
  serverUrl: string,
  options: {
    speed?: number; // 0.5-2.0, default 1.0
    signal?: AbortSignal; // For cancellation (pre-cache support)
  } = {}
): Promise<string> {
  // Check cache first
  const cacheKey = hashKey(text, voiceId);
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { speed = 1.0, signal } = options;

  const response = await fetch(`${serverUrl}/api/synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      speed,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`VoiceBox Clone API error: ${response.status}`);
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
let currentVolumeLevel = 1.0;

/**
 * Speak text using VoiceBox Clone TTS
 * Handles playback and provides stop/pause controls
 */
export async function speak(
  text: string,
  voiceId: string,
  serverUrl: string,
  options: {
    speed?: number;
    volume?: number;
    onEnd?: () => void;
  } = {}
): Promise<void> {
  // Stop any current playback
  stop();

  const { speed = 1.0, volume, onEnd } = options;
  onEndCallback = onEnd || null;

  // Update volume level if provided
  if (volume !== undefined) {
    currentVolumeLevel = volume;
  }

  try {
    const blobUrl = await generateSpeech(text, voiceId, serverUrl, { speed });

    currentAudio = new Audio(blobUrl);
    currentAudio.volume = currentVolumeLevel;

    // Apply speaker preference if set
    const { label, groupId } = getCachedSpeakerPreference();
    if (label) {
      await applySpeakerToAudio(currentAudio, label, groupId);
    }

    currentAudio.onended = () => {
      currentAudio = null;
      onEndCallback?.();
      onEndCallback = null;
    };
    currentAudio.onerror = () => {
      console.warn("VoiceBox Clone audio playback error");
      currentAudio = null;
      onEndCallback?.();
      onEndCallback = null;
    };

    await currentAudio.play();
  } catch (e) {
    console.warn("VoiceBox Clone speak failed:", e);
    onEndCallback?.();
    onEndCallback = null;
    throw e;
  }
}

/**
 * Stop current VoiceBox Clone playback
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
 * Pause current VoiceBox Clone playback
 */
export function pause(): void {
  if (currentAudio) {
    currentAudio.pause();
  }
}

/**
 * Resume paused VoiceBox Clone playback
 */
export function resume(): void {
  if (currentAudio) {
    currentAudio.play();
  }
}

/**
 * Check if VoiceBox Clone is currently playing
 */
export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

/**
 * Check if VoiceBox Clone playback is paused
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

/**
 * Set volume level for current and future playback
 */
export function setVolume(vol: number): void {
  currentVolumeLevel = Math.max(0, Math.min(1, vol));
  if (currentAudio) {
    currentAudio.volume = currentVolumeLevel;
  }
}

/**
 * Get current volume level
 */
export function getVolume(): number {
  return currentVolumeLevel;
}

/**
 * Get cached audio URL by cache key (for pre-cache integration)
 */
export function getCachedByKey(cacheKey: string): string | null {
  return audioCache.get(cacheKey) || null;
}

/**
 * Set cached audio URL by cache key (for pre-cache integration)
 */
export function setCachedByKey(cacheKey: string, blobUrl: string): void {
  audioCache.set(cacheKey, blobUrl);
}

/**
 * Generate a cache key for a given text and voiceId
 */
export function generateCacheKey(text: string, voiceId: string): string {
  return hashKey(text, voiceId);
}
