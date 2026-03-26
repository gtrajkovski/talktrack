"use client";

import { useEffect, useCallback, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SlideHeader } from "./SlideHeader";
import { VoiceStatus } from "./VoiceStatus";
import { RehearsalControls } from "./RehearsalControls";
import { speak, stop } from "@/lib/speech/synthesis";
import { slideTransition } from "@/lib/audio/chime";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Slide } from "@/types/talk";

interface ListenModeProps {
  slides: Slide[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onComplete: () => void;
}

export function ListenMode({
  slides,
  currentIndex,
  onNext,
  onPrev,
  onComplete,
}: ListenModeProps) {
  const { speechRate, voiceName, autoAdvance, autoAdvanceDelay } = useSettingsStore();
  const [status, setStatus] = useState<"playing" | "paused" | "idle">("idle");

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;
  const isFirstSlide = currentIndex === 0;
  const progress = ((currentIndex + 1) / slides.length) * 100;

  const speakSlide = useCallback(() => {
    setStatus("playing");
    speak(currentSlide.notes, {
      rate: speechRate,
      voiceName: voiceName || undefined,
      onEnd: () => {
        setStatus("idle");
        if (autoAdvance) {
          setTimeout(() => {
            if (isLastSlide) {
              onComplete();
            } else {
              slideTransition();
              onNext();
            }
          }, autoAdvanceDelay * 1000);
        }
      },
    });
  }, [currentSlide.notes, speechRate, voiceName, autoAdvance, autoAdvanceDelay, isLastSlide, onComplete, onNext]);

  useEffect(() => {
    speakSlide();
    return () => stop();
  }, [speakSlide]);

  const handleRepeat = () => {
    stop();
    speakSlide();
  };

  const handleNext = () => {
    stop();
    if (isLastSlide) {
      onComplete();
    } else {
      slideTransition();
      onNext();
    }
  };

  const handleBack = () => {
    stop();
    onPrev();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <ProgressBar value={progress} size="lg" className="mb-6" />

      {/* Slide Info */}
      <SlideHeader
        currentSlide={currentIndex + 1}
        totalSlides={slides.length}
        title={currentSlide.title}
      />

      {/* Status */}
      <VoiceStatus status={status} />

      {/* Notes Display */}
      <div className="flex-1 overflow-y-auto mb-6">
        <div className="bg-surface rounded-[var(--radius)] p-4">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {currentSlide.notes}
          </p>
        </div>
      </div>

      {/* Controls */}
      <RehearsalControls
        onBack={handleBack}
        onRepeat={handleRepeat}
        onNext={handleNext}
        isFirstSlide={isFirstSlide}
        isLastSlide={isLastSlide}
      />
    </div>
  );
}
