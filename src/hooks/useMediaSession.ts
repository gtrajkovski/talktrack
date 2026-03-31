"use client";

import { useEffect } from "react";
import {
  initMediaSession,
  updateMediaSession,
  clearMediaSession,
  setMediaSessionPlaybackState,
  isMediaSessionSupported,
} from "@/lib/audio/mediaSession";
import type { Talk } from "@/types/talk";

interface UseMediaSessionOptions {
  talk: Talk | null;
  currentIndex: number;
  mode: "listen" | "prompt" | "test";
  isPlaying: boolean;
  onNext: () => void;
  onPrev: () => void;
  onTogglePause: () => void;
  onStop: () => void;
}

/**
 * Hook to integrate MediaSession API with rehearsal modes.
 * Shows talk info in car dashboards and system media controls.
 */
export function useMediaSession({
  talk,
  currentIndex,
  mode,
  isPlaying,
  onNext,
  onPrev,
  onTogglePause,
  onStop,
}: UseMediaSessionOptions): void {
  // Initialize MediaSession on mount
  useEffect(() => {
    if (!isMediaSessionSupported()) return;

    initMediaSession({
      onPlay: onTogglePause,
      onPause: onTogglePause,
      onNext,
      onPrev,
      onStop,
    });

    return () => {
      clearMediaSession();
    };
  }, [onNext, onPrev, onTogglePause, onStop]);

  // Update metadata when slide changes
  useEffect(() => {
    if (!talk || !isMediaSessionSupported()) return;

    const currentSlide = talk.slides[currentIndex];
    if (!currentSlide) return;

    updateMediaSession({
      talkTitle: talk.title,
      slideNumber: currentIndex + 1,
      totalSlides: talk.slides.length,
      slideTitle: currentSlide.title,
      isPlaying,
      mode,
    });
  }, [talk, currentIndex, mode, isPlaying]);

  // Update playback state separately (more frequent)
  useEffect(() => {
    setMediaSessionPlaybackState(isPlaying);
  }, [isPlaying]);
}

export default useMediaSession;
