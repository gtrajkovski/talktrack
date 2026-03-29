/**
 * VoiceBox - Unified playback controller with progress tracking
 *
 * Provides a consistent interface for audio playback regardless of backend
 * (Web Speech API or ElevenLabs). Tracks progress, estimates duration,
 * and exposes callbacks for UI updates.
 */

import * as synthesis from "./synthesis";

// Re-export types from synthesis for convenience
export type { SpeakOptions } from "./synthesis";

export interface PlaybackProgress {
  currentTime: number; // Seconds elapsed
  duration: number; // Total duration (estimated or actual)
  position: number; // 0-100 percentage
  remainingTime: number; // Seconds left
  isAccurate: boolean; // true if from HTML Audio, false if estimated
  currentSentenceIndex: number; // Current sentence (0-based)
  totalSentences: number; // Total sentence count
  text: string; // The text being spoken
}

export interface VoiceBoxState {
  isPlaying: boolean;
  isPaused: boolean;
  progress: PlaybackProgress | null;
}

type ProgressCallback = (progress: PlaybackProgress) => void;
type StateCallback = (state: VoiceBoxState) => void;

// State
let currentText = "";
let sentences: string[] = [];
let currentSentenceIndex = 0;
let estimatedDuration = 0;
let startTime = 0;
let pausedTime = 0;
let isPaused = false;
let isPlaying = false;
let progressInterval: ReturnType<typeof setInterval> | null = null;
let usingElevenLabs = false;
let usingVoiceBoxClone = false;

// Callbacks
const progressCallbacks: Set<ProgressCallback> = new Set();
const stateCallbacks: Set<StateCallback> = new Set();

// Constants
const DEFAULT_WPM = 150; // Words per minute for estimation
const PROGRESS_UPDATE_INTERVAL = 100; // ms

/**
 * Split text into sentences (same logic as synthesis.ts)
 */
const ABBREVIATIONS =
  /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|Inc|Ltd|Corp|vs|etc|e\.g|i\.e|al|St|Rd|Ave|Blvd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.$/i;

function splitIntoSentences(text: string): string[] {
  if (!text.trim()) return [text];

  const result: string[] = [];
  let current = "";
  const parts = text.split(/([.!?]+\s+)/);

  for (let i = 0; i < parts.length; i++) {
    current += parts[i];
    if (/[.!?]+\s+$/.test(parts[i])) {
      const contentBeforePunc = current.replace(/[.!?]+\s+$/, "");
      if (!ABBREVIATIONS.test(contentBeforePunc)) {
        result.push(current.trim());
        current = "";
      }
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result.length > 0 ? result : [text];
}

/**
 * Estimate duration based on word count
 */
function estimateDurationFromText(text: string, wpm: number = DEFAULT_WPM): number {
  const words = text.trim().split(/\s+/).length;
  return (words / wpm) * 60;
}

/**
 * Get current progress
 */
function getProgress(): PlaybackProgress {
  if (!isPlaying && !isPaused) {
    return {
      currentTime: 0,
      duration: 0,
      position: 0,
      remainingTime: 0,
      isAccurate: false,
      currentSentenceIndex: 0,
      totalSentences: 0,
      text: "",
    };
  }

  let currentTime: number;
  const duration = estimatedDuration;
  let isAccurate = false;

  if (isPaused) {
    currentTime = pausedTime;
  } else {
    currentTime = (Date.now() - startTime) / 1000;
  }

  // For ElevenLabs, try to get actual duration from audio element
  if (usingElevenLabs && synthesis.isUsingElevenLabs()) {
    // ElevenLabs has actual duration - we could expose this
    // For now, use estimation
    isAccurate = false;
  }

  // Clamp current time to duration
  currentTime = Math.min(currentTime, duration);

  const position = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remainingTime = Math.max(0, duration - currentTime);

  return {
    currentTime,
    duration,
    position,
    remainingTime,
    isAccurate,
    currentSentenceIndex,
    totalSentences: sentences.length,
    text: currentText,
  };
}

/**
 * Get current state
 */
function getState(): VoiceBoxState {
  return {
    isPlaying,
    isPaused,
    progress: isPlaying || isPaused ? getProgress() : null,
  };
}

/**
 * Notify all callbacks
 */
function notifyProgress(): void {
  const progress = getProgress();
  progressCallbacks.forEach((cb) => cb(progress));
}

function notifyState(): void {
  const state = getState();
  stateCallbacks.forEach((cb) => cb(state));
}

/**
 * Start progress tracking interval
 */
function startProgressTracking(): void {
  stopProgressTracking();
  progressInterval = setInterval(() => {
    notifyProgress();
  }, PROGRESS_UPDATE_INTERVAL);
}

/**
 * Stop progress tracking interval
 */
function stopProgressTracking(): void {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

/**
 * Reset internal state
 */
function resetState(): void {
  currentText = "";
  sentences = [];
  currentSentenceIndex = 0;
  estimatedDuration = 0;
  startTime = 0;
  pausedTime = 0;
  isPaused = false;
  isPlaying = false;
  usingElevenLabs = false;
  usingVoiceBoxClone = false;
  stopProgressTracking();
}

/**
 * Play text with progress tracking
 */
export function play(
  text: string,
  options: {
    rate?: number;
    voiceName?: string;
    wordsPerMinute?: number;
    voiceBoxClone?: {
      serverUrl: string;
      voiceId: string;
    };
    elevenLabs?: {
      apiKey: string;
      voiceId: string;
    };
    onEnd?: () => void;
    onSentenceChange?: (index: number, sentence: string) => void;
  } = {}
): void {
  // Stop any current playback
  stop();

  const { rate = 0.95, voiceName, wordsPerMinute = DEFAULT_WPM, voiceBoxClone: vbcConfig, elevenLabs: elevenLabsConfig, onEnd, onSentenceChange } = options;

  // Initialize state
  currentText = text;
  sentences = splitIntoSentences(text);
  currentSentenceIndex = 0;
  estimatedDuration = estimateDurationFromText(text, wordsPerMinute) / rate;
  startTime = Date.now();
  isPaused = false;
  isPlaying = true;
  usingVoiceBoxClone = !!vbcConfig;
  usingElevenLabs = !vbcConfig && !!elevenLabsConfig;

  // Start progress tracking
  startProgressTracking();
  notifyState();
  notifyProgress();

  // Notify first sentence
  if (sentences.length > 0 && onSentenceChange) {
    onSentenceChange(0, sentences[0]);
  }

  // Use synthesis module to speak
  // Priority: VoiceBox Clone > ElevenLabs > Web Speech
  synthesis.speak(text, {
    rate,
    voiceName,
    voiceBoxClone: vbcConfig,
    elevenLabs: elevenLabsConfig,
    onEnd: () => {
      resetState();
      notifyState();
      notifyProgress();
      onEnd?.();
    },
  });

  // For Web Speech, track sentence changes by timing
  // This is an approximation based on word count per sentence
  if (!vbcConfig && !elevenLabsConfig) {
    trackSentenceChanges(onSentenceChange);
  }
}

/**
 * Track sentence changes for Web Speech API
 * Uses timing estimation based on word count
 */
function trackSentenceChanges(
  onSentenceChange?: (index: number, sentence: string) => void
): void {
  if (sentences.length <= 1) return;

  // Calculate cumulative time for each sentence
  const sentenceTimes: number[] = [];
  let cumulative = 0;

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).length;
    const duration = (words / DEFAULT_WPM) * 60;
    cumulative += duration;
    sentenceTimes.push(cumulative);
  }

  // Track sentence changes
  const checkSentence = () => {
    if (!isPlaying || isPaused) return;

    const elapsed = (Date.now() - startTime) / 1000;
    let newIndex = 0;

    for (let i = 0; i < sentenceTimes.length; i++) {
      if (elapsed >= sentenceTimes[i]) {
        newIndex = i + 1;
      } else {
        break;
      }
    }

    newIndex = Math.min(newIndex, sentences.length - 1);

    if (newIndex !== currentSentenceIndex) {
      currentSentenceIndex = newIndex;
      notifyProgress();
      if (onSentenceChange && sentences[newIndex]) {
        onSentenceChange(newIndex, sentences[newIndex]);
      }
    }

    if (isPlaying && !isPaused) {
      requestAnimationFrame(checkSentence);
    }
  };

  requestAnimationFrame(checkSentence);
}

/**
 * Stop playback
 */
export function stop(): void {
  synthesis.stop();
  resetState();
  notifyState();
  notifyProgress();
}

/**
 * Pause playback
 */
export function pause(): void {
  if (!isPlaying || isPaused) return;

  synthesis.pause();
  pausedTime = (Date.now() - startTime) / 1000;
  isPaused = true;
  stopProgressTracking();
  notifyState();
  notifyProgress();
}

/**
 * Resume playback
 */
export function resume(): void {
  if (!isPaused) return;

  synthesis.resume();
  // Adjust start time to account for paused duration
  startTime = Date.now() - pausedTime * 1000;
  isPaused = false;
  startProgressTracking();
  notifyState();
  notifyProgress();
}

/**
 * Toggle pause/resume
 */
export function togglePause(): void {
  if (isPaused) {
    resume();
  } else if (isPlaying) {
    pause();
  }
}

/**
 * Check if currently playing
 */
export function getIsPlaying(): boolean {
  return isPlaying;
}

/**
 * Check if currently paused
 */
export function getIsPaused(): boolean {
  return isPaused;
}

/**
 * Get current playback progress
 */
export function getPlaybackProgress(): PlaybackProgress {
  return getProgress();
}

/**
 * Get current state
 */
export function getVoiceBoxState(): VoiceBoxState {
  return getState();
}

/**
 * Subscribe to progress updates
 * Returns unsubscribe function
 */
export function onProgress(callback: ProgressCallback): () => void {
  progressCallbacks.add(callback);
  return () => progressCallbacks.delete(callback);
}

/**
 * Subscribe to state changes
 * Returns unsubscribe function
 */
export function onStateChange(callback: StateCallback): () => void {
  stateCallbacks.add(callback);
  return () => stateCallbacks.delete(callback);
}

/**
 * Format time as M:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format remaining time as "Xm Ys left" or "Xs left"
 */
export function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}m ${secs}s left`;
  }
  return `${secs}s left`;
}
