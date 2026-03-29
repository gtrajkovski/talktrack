"use client";

import { useEffect, useState } from "react";
import { useRehearsalStore } from "@/stores/rehearsalStore";

interface SessionTimerProps {
  /** Total estimated seconds for the entire talk (for progress comparison) */
  totalEstimatedSeconds?: number;
  /** Show compact version (just the time) */
  compact?: boolean;
}

/**
 * Displays elapsed session time as a count-up timer.
 * Shows how long the user has been practicing in the current session.
 */
export function SessionTimer({ totalEstimatedSeconds, compact = false }: SessionTimerProps) {
  const sessionStartTime = useRehearsalStore((s) => s.sessionStartTime);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!sessionStartTime) {
      setElapsedSeconds(0);
      return;
    }

    // Calculate initial elapsed
    const calcElapsed = () => Math.floor((Date.now() - sessionStartTime) / 1000);
    setElapsedSeconds(calcElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}:${remainingMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Determine if over target time
  const isOverTarget = totalEstimatedSeconds && elapsedSeconds > totalEstimatedSeconds;
  const progress = totalEstimatedSeconds
    ? Math.min(100, (elapsedSeconds / totalEstimatedSeconds) * 100)
    : 0;

  if (compact) {
    return (
      <span className={`text-sm font-medium tabular-nums ${isOverTarget ? "text-accent" : "text-text-dim"}`}>
        {formatTime(elapsedSeconds)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Clock icon */}
      <svg
        className={`w-4 h-4 ${isOverTarget ? "text-accent" : "text-text-dim"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Elapsed time */}
      <span className={`text-sm font-medium tabular-nums ${isOverTarget ? "text-accent" : "text-text-dim"}`}>
        {formatTime(elapsedSeconds)}
      </span>

      {/* Target time comparison */}
      {totalEstimatedSeconds && (
        <span className="text-xs text-text-dim">
          / {formatTime(totalEstimatedSeconds)}
        </span>
      )}

      {/* Mini progress indicator */}
      {totalEstimatedSeconds && (
        <div className="w-12 h-1 bg-surface-light rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 rounded-full ${
              isOverTarget ? "bg-accent" : "bg-blue"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
