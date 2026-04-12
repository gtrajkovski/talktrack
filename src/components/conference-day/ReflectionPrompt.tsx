"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConferenceDayStore } from "@/stores/conferenceDayStore";
import { Button } from "@/components/ui/Button";
import * as voicebox from "@/lib/speech/voicebox";
import { useSettingsStore } from "@/stores/settingsStore";

interface ReflectionPromptProps {
  talkTitle: string;
}

type Rating = "great" | "okay" | "rough";

export function ReflectionPrompt({ talkTitle }: ReflectionPromptProps) {
  const router = useRouter();
  const { speechRate, voiceName } = useSettingsStore();
  const { submitReflection, talkId } = useConferenceDayStore();

  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"rating" | "notes">("rating");

  const handleRating = (rating: Rating) => {
    setSelectedRating(rating);
    setStep("notes");

    const messages = {
      great: "Fantastic! Any highlights you want to remember?",
      okay: "Good job getting through it. Anything you'd do differently?",
      rough: "Every talk is a learning experience. What would you change?",
    };

    voicebox.play(messages[rating], {
      rate: speechRate,
      voiceName: voiceName || undefined,
    });
  };

  const handleSubmit = async () => {
    if (!selectedRating) return;

    await submitReflection(selectedRating, notes || undefined);

    voicebox.play("Reflection saved. Great work today.", {
      rate: speechRate,
      voiceName: voiceName || undefined,
    });

    router.push(`/talk/${talkId}`);
  };

  const handleSkip = async () => {
    if (!selectedRating) return;
    await submitReflection(selectedRating);
    router.push(`/talk/${talkId}`);
  };

  if (step === "rating") {
    return (
      <div className="flex flex-col items-center space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">How did it go?</h2>
          <p className="text-text-dim">{talkTitle}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
          <button
            onClick={() => handleRating("great")}
            className="flex flex-col items-center p-4 rounded-xl bg-success/20 border-2 border-success/30 hover:bg-success/30 transition-colors min-h-[100px]"
          >
            <span className="text-4xl mb-2">😊</span>
            <span className="font-bold text-success">Great</span>
          </button>

          <button
            onClick={() => handleRating("okay")}
            className="flex flex-col items-center p-4 rounded-xl bg-warning/20 border-2 border-warning/30 hover:bg-warning/30 transition-colors min-h-[100px]"
          >
            <span className="text-4xl mb-2">😐</span>
            <span className="font-bold text-warning">Okay</span>
          </button>

          <button
            onClick={() => handleRating("rough")}
            className="flex flex-col items-center p-4 rounded-xl bg-error/20 border-2 border-error/30 hover:bg-error/30 transition-colors min-h-[100px]"
          >
            <span className="text-4xl mb-2">😓</span>
            <span className="font-bold text-error">Rough</span>
          </button>
        </div>
      </div>
    );
  }

  // Notes step
  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Any notes?</h2>
        <p className="text-text-dim">Optional reflection for future reference</p>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What would you do differently? Any highlights?"
        className="w-full h-32 p-4 bg-surface border border-surface-light rounded-lg resize-none"
      />

      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleSkip} className="flex-1">
          Skip
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          Save
        </Button>
      </div>
    </div>
  );
}
