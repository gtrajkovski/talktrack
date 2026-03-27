"use client";

import { useState, useEffect } from "react";
import { getVolume, isMutedState, DEFAULT_VOLUME } from "@/lib/speech/synthesis";

interface VolumeBadgeProps {
  className?: string;
}

/**
 * Visual indicator showing current volume level.
 * Shows mute icon when muted, volume percentage when not at default.
 */
export function VolumeBadge({ className = "" }: VolumeBadgeProps) {
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [muted, setMuted] = useState(false);

  // Poll volume state (since it's not in Zustand)
  useEffect(() => {
    const interval = setInterval(() => {
      setVolumeState(getVolume());
      setMuted(isMutedState());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Don't show if at default and not muted
  if (!muted && volume === DEFAULT_VOLUME) {
    return null;
  }

  const volumePercent = Math.round(volume * 100);

  return (
    <div
      className={`
        inline-flex items-center gap-1
        px-2.5 py-1
        rounded-full
        text-xs font-semibold tracking-wide
        transition-all duration-200
        ${muted
          ? "bg-danger/20 text-danger"
          : volume < DEFAULT_VOLUME
            ? "bg-text-dim/20 text-text-dim"
            : "bg-success/20 text-success"
        }
        ${className}
      `}
      role="status"
      aria-label={muted ? "Audio muted" : `Volume: ${volumePercent}%`}
    >
      {muted ? (
        <>
          <span className="text-[10px]">🔇</span>
          <span>Muted</span>
        </>
      ) : (
        <>
          <span className="text-[10px]">
            {volume > 0.7 ? "🔊" : volume > 0.3 ? "🔉" : "🔈"}
          </span>
          <span>{volumePercent}%</span>
        </>
      )}
    </div>
  );
}

export default VolumeBadge;
