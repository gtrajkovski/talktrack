"use client";

import { useEffect, useState } from "react";
import {
  onProgress,
  getPlaybackProgress,
  formatRemaining,
  type PlaybackProgress,
} from "@/lib/speech/voicebox";

interface PlaybackIndicatorProps {
  /** Show sentence dots below progress bar */
  showSentences?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

export function PlaybackIndicator({
  showSentences = false,
  compact = false,
  className = "",
}: PlaybackIndicatorProps) {
  const [progress, setProgress] = useState<PlaybackProgress | null>(null);

  useEffect(() => {
    // Get initial state
    const initial = getPlaybackProgress();
    if (initial.duration > 0) {
      setProgress(initial);
    }

    // Subscribe to updates
    const unsubscribe = onProgress((p) => {
      if (p.duration > 0) {
        setProgress(p);
      } else {
        setProgress(null);
      }
    });

    return unsubscribe;
  }, []);

  if (!progress || progress.duration === 0) {
    return null;
  }

  const { position, remainingTime, currentSentenceIndex, totalSentences } = progress;

  return (
    <div className={`${className}`}>
      {/* Progress bar */}
      <div
        className={`
          relative w-full bg-surface-light rounded-full overflow-hidden
          ${compact ? "h-1.5" : "h-2"}
        `}
      >
        <div
          className="absolute inset-y-0 left-0 bg-accent transition-all duration-100 ease-linear rounded-full"
          style={{ width: `${Math.min(100, position)}%` }}
        />
      </div>

      {/* Time remaining */}
      {!compact && remainingTime > 0 && (
        <div className="flex justify-between items-center mt-1.5 text-xs text-text-dim">
          <span>{formatRemaining(remainingTime)}</span>
          {totalSentences > 1 && (
            <span>
              {currentSentenceIndex + 1} / {totalSentences}
            </span>
          )}
        </div>
      )}

      {/* Sentence dots */}
      {showSentences && totalSentences > 1 && totalSentences <= 10 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {Array.from({ length: totalSentences }).map((_, i) => (
            <div
              key={i}
              className={`
                w-2 h-2 rounded-full transition-colors duration-200
                ${i < currentSentenceIndex
                  ? "bg-accent"
                  : i === currentSentenceIndex
                  ? "bg-accent animate-pulse"
                  : "bg-surface-light"
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Inline playback indicator for use in other components
 * Shows just the progress bar with no extra UI
 */
export function PlaybackBar({ className = "" }: { className?: string }) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const initial = getPlaybackProgress();
    setPosition(initial.position);

    const unsubscribe = onProgress((p) => {
      setPosition(p.position);
    });

    return unsubscribe;
  }, []);

  if (position === 0) {
    return null;
  }

  return (
    <div
      className={`h-1 bg-surface-light rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-accent transition-all duration-100 ease-linear"
        style={{ width: `${Math.min(100, position)}%` }}
      />
    </div>
  );
}
