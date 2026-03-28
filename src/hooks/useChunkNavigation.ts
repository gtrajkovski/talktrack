"use client";

import { useCallback, useMemo } from "react";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import { formatPositionLabel, type Chunk } from "@/lib/utils/chunker";
import * as earcons from "@/lib/audio/earcons";

export interface ChunkNavigationResult {
  // Current content
  currentChunk: Chunk | null;
  currentContent: string;
  currentCue: string | null;      // First 3 words for sentence mode
  currentLabel: string | null;    // "Paragraph 1" for paragraph mode

  // Navigation
  onNextChunk: () => boolean;     // Returns true if advanced, false if at end
  onPrevChunk: () => boolean;     // Returns true if went back, false if at start

  // Progress
  progress: number;               // 0-100 based on chunks
  positionLabel: string;          // "1/5 • S 3/12"

  // State
  granularity: "slide" | "paragraph" | "sentence";
  isChunkMode: boolean;           // True if granularity !== "slide"
  isLastChunk: boolean;
  isFirstChunk: boolean;

  // Slide boundary detection
  isSlideTransition: (direction: "next" | "prev") => boolean;

  // Chunk counts
  totalChunks: number;
  currentChunkIndex: number;
  chunksInCurrentSlide: number;
  currentChunkInSlide: number;
}

/**
 * Hook for chunk-aware navigation in rehearsal modes.
 *
 * Provides content and navigation that respects the current granularity setting.
 * When in sentence/paragraph mode, navigation advances chunks instead of slides.
 * When crossing a slide boundary, plays slideAdvance/slideBack earcon.
 *
 * Usage:
 * ```tsx
 * const {
 *   currentContent,
 *   currentCue,
 *   onNextChunk,
 *   progress,
 *   positionLabel,
 *   isChunkMode,
 * } = useChunkNavigation();
 *
 * // In ListenMode: speak currentContent
 * // In PromptMode: speak currentCue or currentLabel
 * // In TestMode: speak just the chunk number
 * ```
 */
export function useChunkNavigation(): ChunkNavigationResult {
  const {
    talk,
    granularity,
    chunks,
    currentChunkIndex,
    currentSlideIndex,
    advanceChunk,
    goBackChunk,
    getCurrentChunk,
    isLastChunk: storeIsLastChunk,
    isFirstChunk: storeIsFirstChunk,
    getChunkProgress,
    getProgress,
  } = useRehearsalStore();

  const currentChunk = getCurrentChunk();
  const isChunkMode = granularity !== "slide";

  // Get current content to speak/display
  const currentContent = useMemo(() => {
    if (isChunkMode && currentChunk) {
      return currentChunk.text;
    }
    // Slide mode: return full notes
    const slide = talk?.slides[currentSlideIndex];
    return slide?.notes || slide?.title || "";
  }, [isChunkMode, currentChunk, talk, currentSlideIndex]);

  // Get cue text (for sentence mode)
  const currentCue = useMemo(() => {
    if (granularity === "sentence" && currentChunk?.cueText) {
      return currentChunk.cueText;
    }
    return null;
  }, [granularity, currentChunk]);

  // Get label (for paragraph mode)
  const currentLabel = useMemo(() => {
    if (granularity === "paragraph" && currentChunk?.label) {
      return currentChunk.label;
    }
    return null;
  }, [granularity, currentChunk]);

  // Calculate chunks in current slide
  const chunksInCurrentSlide = useMemo(() => {
    return chunks.filter(c => c.slideIndex === currentSlideIndex).length;
  }, [chunks, currentSlideIndex]);

  // Current chunk index within the slide
  const currentChunkInSlide = useMemo(() => {
    if (!currentChunk) return 0;
    const slideChunks = chunks.filter(c => c.slideIndex === currentSlideIndex);
    const idx = slideChunks.findIndex(c => c.globalIndex === currentChunk.globalIndex);
    return idx >= 0 ? idx : 0;
  }, [chunks, currentSlideIndex, currentChunk]);

  // Check if next/prev will cross a slide boundary
  const isSlideTransition = useCallback((direction: "next" | "prev"): boolean => {
    if (!isChunkMode || chunks.length === 0) return true;

    const targetIndex = direction === "next"
      ? currentChunkIndex + 1
      : currentChunkIndex - 1;

    if (targetIndex < 0 || targetIndex >= chunks.length) return true;

    const targetChunk = chunks[targetIndex];
    return targetChunk.slideIndex !== currentSlideIndex;
  }, [isChunkMode, chunks, currentChunkIndex, currentSlideIndex]);

  // Navigate to next chunk with earcon
  const onNextChunk = useCallback((): boolean => {
    if (!isChunkMode) {
      // In slide mode, return false to let the mode handle slide navigation
      return false;
    }

    // Check if this will cross a slide boundary
    const willCrossSlide = isSlideTransition("next");

    const advanced = advanceChunk();

    if (advanced) {
      if (willCrossSlide) {
        earcons.slideAdvance();
      } else if (granularity === "paragraph") {
        earcons.paragraphBreak();
      } else {
        earcons.sentenceAdvance();
      }
    }

    return advanced;
  }, [isChunkMode, advanceChunk, isSlideTransition, granularity]);

  // Navigate to previous chunk with earcon
  const onPrevChunk = useCallback((): boolean => {
    if (!isChunkMode) {
      return false;
    }

    const willCrossSlide = isSlideTransition("prev");

    const wentBack = goBackChunk();

    if (wentBack) {
      if (willCrossSlide) {
        earcons.slideBack();
      } else if (granularity === "paragraph") {
        earcons.paragraphBreak();
      } else {
        earcons.sentenceAdvance();
      }
    }

    return wentBack;
  }, [isChunkMode, goBackChunk, isSlideTransition, granularity]);

  // Progress (chunk-aware)
  const progress = useMemo(() => {
    if (isChunkMode) {
      return getChunkProgress();
    }
    return getProgress();
  }, [isChunkMode, getChunkProgress, getProgress]);

  // Position label
  const positionLabel = useMemo(() => {
    if (!talk) return "";
    return formatPositionLabel(chunks, currentChunkIndex, talk.slides.length);
  }, [chunks, currentChunkIndex, talk]);

  const isLastChunk = storeIsLastChunk();
  const isFirstChunk = storeIsFirstChunk();

  return {
    currentChunk,
    currentContent,
    currentCue,
    currentLabel,
    onNextChunk,
    onPrevChunk,
    progress,
    positionLabel,
    granularity,
    isChunkMode,
    isLastChunk,
    isFirstChunk,
    isSlideTransition,
    totalChunks: chunks.length,
    currentChunkIndex,
    chunksInCurrentSlide,
    currentChunkInSlide,
  };
}

export default useChunkNavigation;
