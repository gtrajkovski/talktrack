"use client";

import { useRehearsalStore, type AudioState } from "@/stores/rehearsalStore";
import { SpeedBadge } from "./SpeedBadge";
import { VolumeBadge } from "./VolumeBadge";

interface StateOrbProps {
  onTap?: () => void;
}

interface StateConfig {
  bgColor: string;
  animation: string;
  shadowColor: string;
  label: string;
}

const stateConfigs: Record<AudioState, StateConfig> = {
  idle: {
    bgColor: "bg-surface-light",
    animation: "",
    shadowColor: "shadow-surface-light/30",
    label: "Ready",
  },
  speaking: {
    bgColor: "bg-accent",
    animation: "animate-pulse-slow",
    shadowColor: "shadow-accent/50",
    label: "Speaking...",
  },
  listening: {
    bgColor: "bg-success",
    animation: "animate-scale-pulse",
    shadowColor: "shadow-success/50",
    label: "Listening...",
  },
  processing: {
    bgColor: "bg-blue",
    animation: "animate-glow",
    shadowColor: "shadow-blue/50",
    label: "Processing...",
  },
  paused: {
    bgColor: "bg-text-dim",
    animation: "",
    shadowColor: "shadow-text-dim/30",
    label: "Paused",
  },
  error: {
    bgColor: "bg-danger",
    animation: "animate-double-pulse",
    shadowColor: "shadow-danger/50",
    label: "Tap to retry",
  },
};

/**
 * Large pulsing circle that shows audio state through color.
 * Designed for glanceable, eyes-free use while driving.
 * Minimum 120px diameter, acts as a giant tap target.
 */
export function StateOrb({ onTap }: StateOrbProps) {
  const audioState = useRehearsalStore((s) => s.audioState);
  const currentSlideIndex = useRehearsalStore((s) => s.currentSlideIndex);
  const talk = useRehearsalStore((s) => s.talk);

  const config = stateConfigs[audioState];
  const totalSlides = talk?.slides.length ?? 0;

  // Check reduced motion preference (also handled in CSS)
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* The orb - giant tap target */}
      <button
        onClick={onTap}
        role="status"
        aria-label={`State: ${config.label}. Tap to toggle pause.`}
        aria-live="polite"
        className={`
          w-[120px] h-[120px] min-w-[120px] min-h-[120px]
          rounded-full
          transition-all duration-300
          shadow-2xl
          ${config.bgColor}
          ${config.shadowColor}
          ${!prefersReducedMotion ? config.animation : ""}
          active:scale-95
          focus:outline-none focus:ring-4 focus:ring-accent/50
        `}
      />

      {/* Slide counter - large and glanceable */}
      <div
        className="text-2xl font-extrabold text-text tracking-tight"
        aria-label={`Slide ${currentSlideIndex + 1} of ${totalSlides}`}
      >
        {currentSlideIndex + 1} / {totalSlides}
      </div>

      {/* Speed and volume badges - only visible when modified */}
      <div className="flex gap-2">
        <SpeedBadge />
        <VolumeBadge />
      </div>
    </div>
  );
}

export default StateOrb;
