"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/utils/formatDuration";
import type { Recording } from "@/types/recording";

interface RecordingPlayerProps {
  recording: Recording;
  slideTitle: string;
  onDelete?: () => void;
}

export function RecordingPlayer({ recording, slideTitle, onDelete }: RecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Create object URL for audio blob
  useEffect(() => {
    const url = URL.createObjectURL(recording.audioBlob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recording.audioBlob]);

  // Update current time during playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const durationSeconds = recording.duration / 1000;
  const dateStr = new Date(recording.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-surface rounded-lg p-4 space-y-3">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{slideTitle}</div>
          <div className="text-xs text-text-dim">
            Slide {recording.slideIndex + 1} • {dateStr}
          </div>
        </div>
        <div className="text-sm text-text-dim">
          {formatDuration(durationSeconds)}
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
        >
          {isPlaying ? (
            <svg className="w-5 h-5 text-bg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-bg ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={durationSeconds}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-surface-light rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-accent"
          />
          <div className="flex justify-between text-xs text-text-dim mt-1">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(durationSeconds)}</span>
          </div>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-full hover:bg-surface-light flex items-center justify-center text-text-dim hover:text-danger transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
