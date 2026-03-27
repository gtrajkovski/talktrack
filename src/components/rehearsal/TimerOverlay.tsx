"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { timerWarning, timerExpired } from "@/lib/audio/chime";

interface TimerOverlayProps {
  totalSeconds: number;
  warningSeconds: number;
  isActive: boolean;
  onExpired?: () => void;
}

export function TimerOverlay({
  totalSeconds,
  warningSeconds,
  isActive,
  onExpired,
}: TimerOverlayProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastWarningRef = useRef(0);
  const hasExpiredRef = useRef(false);

  // Reset timer when totalSeconds changes (new slide)
  // Note: This setState-in-effect is intentional - resetting state when prop changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional prop sync
    setRemainingSeconds(totalSeconds);
    setIsExpired(false);
    hasExpiredRef.current = false;
    lastWarningRef.current = 0;
  }, [totalSeconds]);

  // Timer tick
  useEffect(() => {
    if (!isActive || isExpired) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;

        // Warning ticks in the last N seconds
        if (next <= warningSeconds && next > 0 && next !== lastWarningRef.current) {
          lastWarningRef.current = next;
          timerWarning();
        }

        // Timer expired
        if (next <= 0 && !hasExpiredRef.current) {
          hasExpiredRef.current = true;
          setIsExpired(true);
          timerExpired();
          onExpired?.();
          return 0;
        }

        return Math.max(0, next);
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isExpired, warningSeconds, onExpired]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;
  const isWarning = remainingSeconds <= warningSeconds && remainingSeconds > 0;

  return (
    <div className="mb-4">
      {/* Timer display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 ${isExpired ? "text-danger" : isWarning ? "text-accent animate-pulse" : "text-text-dim"}`}
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
          <span
            className={`text-sm font-medium tabular-nums ${
              isExpired ? "text-danger" : isWarning ? "text-accent" : "text-text-dim"
            }`}
          >
            {isExpired ? "Time's up!" : formatTime(remainingSeconds)}
          </span>
        </div>

        {/* Estimated time label */}
        <span className="text-xs text-text-dim">
          Target: {formatTime(totalSeconds)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isExpired
              ? "bg-danger"
              : isWarning
              ? "bg-accent animate-pulse"
              : "bg-blue"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
