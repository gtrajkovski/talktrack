"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import * as precache from "@/lib/speech/precache";
import * as elevenlabs from "@/lib/speech/elevenlabs";
import * as voiceboxClone from "@/lib/speech/voiceboxClone";

/**
 * Hook that manages audio pre-caching for upcoming chunks.
 *
 * Features:
 * - Configures precache based on active TTS backend (VoiceBox Clone or ElevenLabs)
 * - Triggers pre-caching when chunk index changes
 * - Clears pre-cache on granularity change
 * - Cleans up on unmount
 *
 * Call this at the top of rehearsal mode components (PromptMode, TestMode, ListenMode).
 */
export function usePrecache(): void {
  const chunks = useRehearsalStore((s) => s.chunks);
  const currentChunkIndex = useRehearsalStore((s) => s.currentChunkIndex);
  const granularity = useRehearsalStore((s) => s.granularity);

  const {
    useElevenLabs,
    elevenLabsApiKey,
    elevenLabsVoiceId,
    useVoiceBoxClone,
    voiceBoxCloneUrl,
    voiceBoxCloneVoiceId,
  } = useSettingsStore();

  // Track previous granularity to detect changes
  const prevGranularityRef = useRef(granularity);
  const isConfiguredRef = useRef(false);

  // Create generator function based on active TTS backend
  const createGenerator = useCallback(() => {
    if (useVoiceBoxClone && voiceBoxCloneUrl && voiceBoxCloneVoiceId) {
      return (text: string, signal?: AbortSignal) =>
        voiceboxClone.generateSpeech(text, voiceBoxCloneVoiceId, voiceBoxCloneUrl, { signal });
    }

    if (useElevenLabs && elevenLabsApiKey && elevenLabsVoiceId) {
      return (text: string, signal?: AbortSignal) =>
        elevenlabs.generateSpeech(text, elevenLabsVoiceId, elevenLabsApiKey, { signal });
    }

    return null;
  }, [
    useVoiceBoxClone,
    voiceBoxCloneUrl,
    voiceBoxCloneVoiceId,
    useElevenLabs,
    elevenLabsApiKey,
    elevenLabsVoiceId,
  ]);

  // Configure precache when TTS settings change
  useEffect(() => {
    const generator = createGenerator();

    if (generator) {
      precache.configure({
        generateAudio: generator,
        lookahead: 2, // Pre-cache next 2 chunks
      });
      isConfiguredRef.current = true;
    } else {
      // No TTS backend configured, deactivate precache
      precache.deactivate();
      isConfiguredRef.current = false;
    }

    // Cleanup on unmount or when deps change
    return () => {
      precache.deactivate();
      isConfiguredRef.current = false;
    };
  }, [createGenerator]);

  // Clear precache on granularity change
  useEffect(() => {
    if (prevGranularityRef.current !== granularity) {
      precache.clear();
      prevGranularityRef.current = granularity;
    }
  }, [granularity]);

  // Trigger pre-caching when chunk index changes
  useEffect(() => {
    if (!isConfiguredRef.current) return;
    if (chunks.length === 0) return;
    if (currentChunkIndex < 0) return;

    // Queue upcoming chunks for pre-caching
    precache.queueChunks(chunks, currentChunkIndex);
  }, [chunks, currentChunkIndex]);
}

export default usePrecache;
