import * as elevenLabs from "./elevenlabs";

type SpeechCallback = () => void;

let currentUtterance: SpeechSynthesisUtterance | null = null;
let onEndCallback: SpeechCallback | null = null;
let usingElevenLabs = false;

// Volume control (0-1, default 1.0)
let currentVolume = 1.0;
let isMuted = false;
let volumeBeforeMute = 1.0;

// Volume constants
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1;
export const DEFAULT_VOLUME = 1.0;
export const VOLUME_STEP = 0.1;

// Common abbreviations that shouldn't trigger sentence breaks
const ABBREVIATIONS = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Inc|Ltd|Corp|vs|etc|e\.g|i\.e|al|St|Rd|Ave|Blvd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.$/i;

/**
 * Split text into sentences for TTS, avoiding breaks on abbreviations.
 * Handles: "Dr. Smith said hello. He was happy." -> ["Dr. Smith said hello.", "He was happy."]
 */
function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [text];

  const sentences: string[] = [];
  let current = "";

  // Split on sentence-ending punctuation followed by space
  const parts = text.split(/([.!?]+\s+)/);

  for (let i = 0; i < parts.length; i++) {
    current += parts[i];

    // Check if this part ends with sentence-ending punctuation + space
    if (/[.!?]+\s+$/.test(parts[i])) {
      // Check if previous content ends with an abbreviation
      const contentBeforePunc = current.replace(/[.!?]+\s+$/, "");
      if (!ABBREVIATIONS.test(contentBeforePunc)) {
        sentences.push(current.trim());
        current = "";
      }
    }
  }

  // Add any remaining text
  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences.length > 0 ? sentences : [text];
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined") return [];
  return speechSynthesis.getVoices();
}

export function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
  });
}

/**
 * Check if the browser is online
 */
function isOnline(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.onLine;
}

export interface SpeakOptions {
  rate?: number;
  volume?: number;  // 0-1, overrides current volume if provided
  voiceName?: string;
  onEnd?: SpeechCallback;
  // ElevenLabs options (if provided, will attempt to use ElevenLabs)
  elevenLabs?: {
    apiKey: string;
    voiceId: string;
  };
}

/**
 * Speak text using either ElevenLabs (if configured and online) or Web Speech API
 */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (typeof window === "undefined") return;

  const { rate = 0.95, volume, voiceName, onEnd, elevenLabs: elevenLabsConfig } = options;

  // Use provided volume or current volume (affected by mute)
  const effectiveVolume = isMuted ? 0 : (volume ?? currentVolume);

  // Cancel any current speech
  stop();

  // Try ElevenLabs if configured and online
  if (
    elevenLabsConfig &&
    elevenLabsConfig.apiKey &&
    elevenLabsConfig.voiceId &&
    isOnline()
  ) {
    usingElevenLabs = true;
    onEndCallback = onEnd || null;

    // Convert speech rate (Web Speech 0.7-1.3) to ElevenLabs speed (0.25-4.0)
    // Web Speech: 1.0 = normal, ElevenLabs: 1.0 = normal
    const elevenLabsSpeed = rate;

    elevenLabs
      .speak(text, elevenLabsConfig.voiceId, elevenLabsConfig.apiKey, {
        speed: elevenLabsSpeed,
        volume: effectiveVolume,
        onEnd: () => {
          usingElevenLabs = false;
          onEndCallback = null;
          onEnd?.();
        },
      })
      .catch((e) => {
        console.warn("ElevenLabs failed, falling back to Web Speech:", e);
        usingElevenLabs = false;
        // Fall back to Web Speech API
        webSpeechSpeak(text, { rate, volume: effectiveVolume, voiceName, onEnd });
      });

    return;
  }

  // Use Web Speech API
  webSpeechSpeak(text, { rate, volume: effectiveVolume, voiceName, onEnd });
}

/**
 * Internal: Speak using Web Speech API
 */
function webSpeechSpeak(
  text: string,
  options: { rate?: number; volume?: number; voiceName?: string; onEnd?: SpeechCallback }
): void {
  const { rate = 0.95, volume = 1.0, voiceName, onEnd } = options;

  // Break long text into sentences to avoid Chrome Android bug
  const sentences = splitIntoSentences(text);

  let sentenceIndex = 0;

  const speakNextSentence = () => {
    if (sentenceIndex >= sentences.length) {
      currentUtterance = null;
      onEndCallback = null;
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[sentenceIndex].trim());
    utterance.rate = rate;
    utterance.volume = volume;

    if (voiceName) {
      const voices = speechSynthesis.getVoices();
      const voice = voices.find((v) => v.name === voiceName);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => {
      sentenceIndex++;
      speakNextSentence();
    };

    utterance.onerror = (e) => {
      // Ignore "interrupted" and "canceled" errors - these are expected when stopping
      const error = e as SpeechSynthesisErrorEvent;
      if (error.error === "interrupted" || error.error === "canceled") {
        return;
      }
      console.warn("Speech synthesis error:", error.error);
      currentUtterance = null;
      onEndCallback = null;
      // Still call onEnd so the app can continue
      onEnd?.();
    };

    currentUtterance = utterance;
    onEndCallback = onEnd || null;
    speechSynthesis.speak(utterance);
  };

  speakNextSentence();
}

export function stop(): void {
  if (typeof window === "undefined") return;

  // Stop both engines
  if (usingElevenLabs) {
    elevenLabs.stop();
    usingElevenLabs = false;
  }

  speechSynthesis.cancel();
  currentUtterance = null;
  onEndCallback = null;
}

export function pause(): void {
  if (typeof window === "undefined") return;

  if (usingElevenLabs) {
    elevenLabs.pause();
  } else {
    speechSynthesis.pause();
  }
}

export function resume(): void {
  if (typeof window === "undefined") return;

  if (usingElevenLabs) {
    elevenLabs.resume();
  } else {
    speechSynthesis.resume();
  }
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined") return false;

  if (usingElevenLabs) {
    return elevenLabs.isSpeaking();
  }

  return speechSynthesis.speaking;
}

export function isPaused(): boolean {
  if (typeof window === "undefined") return false;

  if (usingElevenLabs) {
    return elevenLabs.isPaused();
  }

  return speechSynthesis.paused;
}

/**
 * Check if currently using ElevenLabs
 */
export function isUsingElevenLabs(): boolean {
  return usingElevenLabs;
}

// ============================================================================
// VOLUME CONTROL
// ============================================================================

/**
 * Get current volume level (0-1)
 */
export function getVolume(): number {
  return currentVolume;
}

/**
 * Set volume level (0-1)
 */
export function setVolume(vol: number): number {
  currentVolume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, vol));
  // Update ElevenLabs volume too
  elevenLabs.setVolume(isMuted ? 0 : currentVolume);
  return currentVolume;
}

/**
 * Increase volume by one step
 */
export function increaseVolume(): number {
  if (isMuted) {
    unmute();
  }
  return setVolume(Math.round((currentVolume + VOLUME_STEP) * 10) / 10);
}

/**
 * Decrease volume by one step
 */
export function decreaseVolume(): number {
  return setVolume(Math.round((currentVolume - VOLUME_STEP) * 10) / 10);
}

/**
 * Set volume to maximum
 */
export function maxVolume(): number {
  if (isMuted) {
    unmute();
  }
  return setVolume(MAX_VOLUME);
}

/**
 * Mute audio (remember current volume)
 */
export function mute(): void {
  if (!isMuted) {
    volumeBeforeMute = currentVolume;
    isMuted = true;
    elevenLabs.setVolume(0);
  }
}

/**
 * Unmute audio (restore previous volume)
 */
export function unmute(): void {
  if (isMuted) {
    isMuted = false;
    elevenLabs.setVolume(volumeBeforeMute);
  }
}

/**
 * Toggle mute state
 */
export function toggleMute(): boolean {
  if (isMuted) {
    unmute();
  } else {
    mute();
  }
  return isMuted;
}

/**
 * Check if audio is muted
 */
export function isMutedState(): boolean {
  return isMuted;
}

/**
 * Get effective volume (0 if muted, current volume otherwise)
 */
export function getEffectiveVolume(): number {
  return isMuted ? 0 : currentVolume;
}
