"use client";

import { useRehearsalStore, DEFAULT_SPEED } from "@/stores/rehearsalStore";

interface SpeedBadgeProps {
  className?: string;
}

/**
 * Visual indicator showing current playback speed multiplier.
 * Only visible when speed is modified from default (1.0x).
 * Designed to be unobtrusive but glanceable.
 */
export function SpeedBadge({ className = "" }: SpeedBadgeProps) {
  const speedMultiplier = useRehearsalStore((s) => s.speedMultiplier);

  // Only show when speed is modified
  if (speedMultiplier === DEFAULT_SPEED) {
    return null;
  }

  const isFaster = speedMultiplier > DEFAULT_SPEED;

  return (
    <div
      className={`
        inline-flex items-center gap-1
        px-2.5 py-1
        rounded-full
        text-xs font-semibold tracking-wide
        transition-all duration-200
        ${isFaster
          ? "bg-accent/20 text-accent"
          : "bg-blue/20 text-blue"
        }
        ${className}
      `}
      role="status"
      aria-label={`Playback speed: ${speedMultiplier.toFixed(1)}x`}
    >
      <span className="text-[10px]">
        {isFaster ? "▲" : "▼"}
      </span>
      <span>{speedMultiplier.toFixed(1)}x</span>
    </div>
  );
}

export default SpeedBadge;
