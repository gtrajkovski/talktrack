"use client";

import { useEffect, useState, useCallback } from "react";

interface CountdownTimerProps {
  targetTime: number;
  onMilestone?: (minutesRemaining: number) => void;
  onComplete?: () => void;
}

/**
 * Large countdown timer display for Conference Day
 *
 * Color coding:
 * - Green: > 30 minutes
 * - Yellow: 5-30 minutes
 * - Red: < 5 minutes
 */
export function CountdownTimer({
  targetTime,
  onMilestone,
  onComplete,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    Math.max(0, targetTime - Date.now())
  );
  const [lastMilestone, setLastMilestone] = useState<number | null>(null);

  // Milestones to announce (in minutes)
  const milestones = [30, 15, 5, 1];

  const checkMilestones = useCallback(
    (remaining: number) => {
      const minutes = Math.floor(remaining / 60000);

      for (const milestone of milestones) {
        // Trigger when we cross the milestone threshold
        if (
          minutes === milestone &&
          lastMilestone !== milestone &&
          onMilestone
        ) {
          setLastMilestone(milestone);
          onMilestone(milestone);
          break;
        }
      }
    },
    [lastMilestone, onMilestone]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, targetTime - Date.now());
      setTimeRemaining(remaining);
      checkMilestones(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, checkMilestones, onComplete]);

  // Format time as H:MM:SS or MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Get color based on time remaining
  const getColorClass = () => {
    const minutes = timeRemaining / 60000;
    if (minutes <= 0) return "text-error";
    if (minutes <= 5) return "text-error";
    if (minutes <= 30) return "text-warning";
    return "text-success";
  };

  // Get urgency label
  const getUrgencyLabel = () => {
    const minutes = timeRemaining / 60000;
    if (minutes <= 0) return "Go time!";
    if (minutes <= 5) return "Almost time";
    if (minutes <= 30) return "Getting close";
    return "until your talk";
  };

  if (timeRemaining === 0) {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="text-5xl font-bold text-success animate-pulse">
          Go time!
        </div>
        <p className="text-text-dim mt-2">You&apos;ve got this.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8">
      <div className={`text-6xl font-mono font-bold ${getColorClass()}`}>
        {formatTime(timeRemaining)}
      </div>
      <p className="text-text-dim mt-2">{getUrgencyLabel()}</p>
    </div>
  );
}
