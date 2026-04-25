"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Talk } from "@/types/talk";
import { useConferenceDayStore } from "@/stores/conferenceDayStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CountdownTimer } from "./CountdownTimer";
import { ReflectionPrompt } from "./ReflectionPrompt";
import { getBoxCounts } from "@/lib/scoring/spacedRepetition";
import * as voicebox from "@/lib/speech/voicebox";
import { useSettingsStore } from "@/stores/settingsStore";

interface ConferenceDayPageProps {
  talk: Talk;
}

export function ConferenceDayPage({ talk }: ConferenceDayPageProps) {
  const router = useRouter();
  const { speechRate, voiceName } = useSettingsStore();

  const {
    event,
    phase,
    createEvent,
    loadEvent,
    updateTime,
    getPhase,
  } = useConferenceDayStore();

  const [scheduledTime, setScheduledTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Count weak slides (box 1-2)
  const boxCounts = getBoxCounts(talk.slides);
  const weakSlideCount = boxCounts[1] + boxCounts[2];

  // Load existing event on mount
  useEffect(() => {
    async function load() {
      const hasEvent = await loadEvent(talk.id);
      if (!hasEvent) {
        // No event, stay in setup phase
      }
      setIsLoading(false);
    }
    load();
  }, [talk.id, loadEvent]);

  // Handle time input and event creation
  const handleSetTime = useCallback(async () => {
    if (!scheduledTime) return;

    // Parse time input (HH:MM format)
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    const now = new Date();
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );

    // If time is in the past, assume tomorrow
    if (target.getTime() < now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    if (event) {
      await updateTime(target.getTime());
    } else {
      await createEvent(talk.id, target.getTime());
    }

    voicebox.play("Event time set. Let's get you ready.", {
      rate: speechRate,
      voiceName: voiceName || undefined,
    });
  }, [scheduledTime, event, talk.id, createEvent, updateTime, speechRate, voiceName]);

  // Milestone announcements
  const handleMilestone = useCallback(
    (minutes: number) => {
      voicebox.play(`${minutes} minutes until your talk.`, {
        rate: speechRate,
        voiceName: voiceName || undefined,
      });
    },
    [speechRate, voiceName]
  );

  // Go time announcement
  const handleComplete = useCallback(() => {
    voicebox.play("It's go time! You've prepared well. Now go nail it.", {
      rate: speechRate,
      voiceName: voiceName || undefined,
    });
  }, [speechRate, voiceName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-dim">
        Loading...
      </div>
    );
  }

  const currentPhase = getPhase();

  // Setup phase: show time picker
  if (!event || currentPhase === "setup") {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">When is your talk?</h2>
          <p className="text-text-dim">
            Set your presentation start time for today
          </p>
        </div>

        <Card>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="23"
                placeholder="HH"
                value={scheduledTime.split(":")[0] || ""}
                onChange={(e) => {
                  const hr = e.target.value.padStart(2, "0");
                  const min = scheduledTime.split(":")[1] || "00";
                  setScheduledTime(`${hr}:${min}`);
                }}
                className="w-20 text-3xl font-mono bg-surface border border-surface-light rounded-lg px-3 py-3 text-center"
              />
              <span className="text-3xl font-mono">:</span>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="MM"
                value={scheduledTime.split(":")[1] || ""}
                onChange={(e) => {
                  const hr = scheduledTime.split(":")[0] || "00";
                  const min = e.target.value.padStart(2, "0");
                  setScheduledTime(`${hr}:${min}`);
                }}
                className="w-20 text-3xl font-mono bg-surface border border-surface-light rounded-lg px-3 py-3 text-center"
              />
            </div>
            <Button
              onClick={handleSetTime}
              disabled={!scheduledTime || !scheduledTime.includes(":")}
              className="w-full"
            >
              Set Time
            </Button>
          </div>
        </Card>

        <button
          onClick={() => router.back()}
          className="text-text-dim text-center w-full py-2"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Reflection phase: show reflection prompt
  if (currentPhase === "reflect" && !event.reflection) {
    return (
      <div className="px-4 py-6 space-y-6">
        <ReflectionPrompt talkTitle={talk.title} />
      </div>
    );
  }

  // Reflection complete: show summary
  if (currentPhase === "reflect" && event.reflection) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Talk Complete</h2>
          <p className="text-text-dim">
            You rated it: {event.reflection.rating}
          </p>
          {event.reflection.notes && (
            <p className="mt-4 text-sm italic">&ldquo;{event.reflection.notes}&rdquo;</p>
          )}
        </div>

        <Link href={`/talk/${talk.id}`}>
          <Button className="w-full">Back to Talk</Button>
        </Link>
      </div>
    );
  }

  // Countdown/Go-time phase: show countdown and actions
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Countdown Timer */}
      <Card>
        <CountdownTimer
          targetTime={event.scheduledAt}
          onMilestone={handleMilestone}
          onComplete={handleComplete}
        />
      </Card>

      {/* Change time */}
      <div className="flex items-center justify-center gap-2 text-sm text-text-dim">
        <span>
          {new Date(event.scheduledAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <button
          onClick={() =>
            useConferenceDayStore.setState({ event: null, phase: "setup" })
          }
          className="underline"
        >
          Change
        </button>
      </div>

      {/* Quick-Fire Card */}
      <Card className={event.quickFireCompleted ? "opacity-50" : ""}>
        <Link
          href={
            event.quickFireCompleted
              ? "#"
              : `/talk/${talk.id}/conference-day/quickfire`
          }
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
              <span className="text-2xl">
                {event.quickFireCompleted ? "✓" : "⚡"}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-bold text-warning">Quick-Fire Review</div>
              <div className="text-sm text-text-dim">
                {event.quickFireCompleted
                  ? "Completed"
                  : weakSlideCount > 0
                  ? `${weakSlideCount} slides need work`
                  : "All slides mastered!"}
              </div>
            </div>
            {!event.quickFireCompleted && (
              <svg
                className="w-5 h-5 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        </Link>
      </Card>

      {/* Calm Down Card */}
      <Card className={event.breathingCompleted ? "opacity-50" : ""}>
        <Link
          href={
            event.breathingCompleted
              ? "#"
              : `/talk/${talk.id}/conference-day/calm`
          }
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue/20 flex items-center justify-center">
              <span className="text-2xl">
                {event.breathingCompleted ? "✓" : "🧘"}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-bold text-blue">Calm Down</div>
              <div className="text-sm text-text-dim">
                {event.breathingCompleted
                  ? "Completed"
                  : "30-second breathing exercise"}
              </div>
            </div>
            {!event.breathingCompleted && (
              <svg
                className="w-5 h-5 text-blue"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        </Link>
      </Card>

      {/* Go-time encouragement */}
      {currentPhase === "go-time" && (
        <Card className="bg-success/10 border-success/30">
          <div className="text-center py-4">
            <p className="text-success font-bold text-lg">Almost time!</p>
            <p className="text-text-dim text-sm mt-1">
              You&apos;ve prepared well. Trust yourself.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
