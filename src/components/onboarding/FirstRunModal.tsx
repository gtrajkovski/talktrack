"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface FirstRunModalProps {
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome to TalkTrack",
    description:
      "Rehearse presentations, speeches, and pitches completely hands-free. Perfect for practicing while driving or walking.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
    ),
  },
  {
    title: "Three Practice Modes",
    description:
      "Listen mode reads slides aloud. Prompt mode reads titles, you recite the rest. Test mode is full recall - ultimate practice.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    title: "Control with Voice",
    description:
      "Say 'next', 'back', 'repeat'. In Prompt mode say 'reveal', in Test mode say 'help'. Buttons work too - voice is just faster.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
];

export function FirstRunModal({ onClose }: FirstRunModalProps) {
  const [step, setStep] = useState(0);
  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface rounded-t-[24px] sm:rounded-[24px] w-full sm:max-w-md p-6 pb-8 animate-slide-up">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-accent" : "bg-surface-light"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 text-accent mb-4">
            {currentStep.icon}
          </div>
          <h2 className="text-xl font-bold mb-2">{currentStep.title}</h2>
          <p className="text-text-dim leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              onClick={() => setStep(step - 1)}
              variant="secondary"
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? "Get Started" : "Next"}
          </Button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-text-dim mt-4 py-2"
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}
