"use client";

import { BigTapButton } from "@/components/ui/BigTapButton";

interface RehearsalControlsProps {
  onBack: () => void;
  onRepeat: () => void;
  onNext: () => void;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  nextLabel?: string;
}

export function RehearsalControls({
  onBack,
  onRepeat,
  onNext,
  isFirstSlide,
  isLastSlide,
  nextLabel = "Next",
}: RehearsalControlsProps) {
  return (
    <div className="flex gap-3">
      <BigTapButton
        onClick={onBack}
        disabled={isFirstSlide}
        className="flex-1"
        size="lg"
      >
        Back
      </BigTapButton>
      <BigTapButton
        onClick={onRepeat}
        className="flex-1"
        size="lg"
      >
        Repeat
      </BigTapButton>
      <BigTapButton
        onClick={onNext}
        variant="primary"
        className="flex-1"
        size="lg"
      >
        {isLastSlide ? "Finish" : nextLabel}
      </BigTapButton>
    </div>
  );
}
