"use client";

import { Card } from "@/components/ui/Card";
import type { WarmupExercise, ExerciseState } from "@/types/warmup";

interface ExerciseCardProps {
  exercise: WarmupExercise;
  exerciseState: ExerciseState;
  exerciseNumber: number;
  totalExercises: number;
  children: React.ReactNode;
}

/**
 * Wrapper component for individual exercises
 */
export function ExerciseCard({
  exercise,
  exerciseState,
  exerciseNumber,
  totalExercises,
  children,
}: ExerciseCardProps) {
  return (
    <Card className="flex flex-col h-full">
      {/* Exercise header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-dim uppercase tracking-wide">
            Exercise {exerciseNumber} of {totalExercises}
          </span>
          <ExerciseStateBadge state={exerciseState} />
        </div>
        <h2 className="text-xl font-bold">{exercise.name}</h2>
        <p className="text-sm text-text-dim mt-1">{exercise.description}</p>
      </div>

      {/* Exercise content */}
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function ExerciseStateBadge({ state }: { state: ExerciseState }) {
  const stateStyles: Record<ExerciseState, { bg: string; text: string }> = {
    idle: { bg: "bg-surface-light", text: "Ready" },
    instructing: { bg: "bg-blue", text: "Listening" },
    exercising: { bg: "bg-accent", text: "Your turn" },
    feedback: { bg: "bg-success", text: "Good job!" },
    complete: { bg: "bg-success", text: "Complete" },
  };

  const style = stateStyles[state];

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} text-bg`}
    >
      {style.text}
    </span>
  );
}
