"use client";

import { BigTapButton } from "@/components/ui/BigTapButton";

interface RehearsalControlsProps {
  onBack: () => void;
  onRepeat: () => void;
  onNext: () => void;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  nextLabel?: string;
  /** When true, show only icons (←, ↻, →) instead of text labels */
  iconOnly?: boolean;
}

export function RehearsalControls({
  onBack,
  onRepeat,
  onNext,
  isFirstSlide,
  isLastSlide,
  nextLabel = "Next",
  iconOnly = false,
}: RehearsalControlsProps) {
  if (iconOnly) {
    return (
      <div className="flex gap-3">
        <BigTapButton
          onClick={onBack}
          disabled={isFirstSlide}
          className="flex-1"
          size="lg"
          aria-label="Go back to previous slide"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </BigTapButton>
        <BigTapButton
          onClick={onRepeat}
          className="flex-1"
          size="lg"
          aria-label="Repeat current slide"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </BigTapButton>
        <BigTapButton
          onClick={onNext}
          variant="primary"
          className="flex-1"
          size="lg"
          aria-label={isLastSlide ? "Finish rehearsal" : "Go to next slide"}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </BigTapButton>
      </div>
    );
  }

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
