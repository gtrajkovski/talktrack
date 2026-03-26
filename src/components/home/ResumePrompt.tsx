"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RehearsalSession } from "@/types/session";
import type { Talk } from "@/types/talk";
import { formatDuration } from "@/lib/utils/formatDuration";

interface ResumePromptProps {
  session: RehearsalSession;
  talk: Talk;
  onResume: () => void;
  onDiscard: () => void;
}

const modeLabels: Record<string, string> = {
  listen: "Listen Mode",
  prompt: "Prompt Mode",
  test: "Test Mode",
};

export function ResumePrompt({
  session,
  talk,
  onResume,
  onDiscard,
}: ResumePromptProps) {
  const slidesRemaining = session.totalSlides - session.currentSlideIndex;
  const timeAgo = formatTimeAgo(session.pausedAt || session.startedAt);

  return (
    <Card className="border border-accent/30 bg-surface">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base">Resume Session?</h3>
          <p className="text-sm text-text-dim mt-0.5">
            You have an unfinished rehearsal from {timeAgo}
          </p>
        </div>
      </div>

      <div className="bg-surface-light rounded-[var(--radius-sm)] p-3 mb-4">
        <div className="font-semibold truncate">{talk.title}</div>
        <div className="text-sm text-text-dim mt-1">
          {modeLabels[session.mode]} &middot; Slide{" "}
          {session.currentSlideIndex + 1} of {session.totalSlides}
          {slidesRemaining > 0 && ` (${slidesRemaining} remaining)`}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onResume} className="flex-1">
          Resume
        </Button>
        <Button onClick={onDiscard} variant="secondary" className="flex-1">
          Start Fresh
        </Button>
      </div>
    </Card>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

export function ResumePromptSkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-surface-light" />
        <div className="flex-1">
          <div className="h-4 bg-surface-light rounded w-32 mb-2" />
          <div className="h-3 bg-surface-light rounded w-48" />
        </div>
      </div>
      <div className="h-16 bg-surface-light rounded-[var(--radius-sm)] mb-4" />
      <div className="flex gap-3">
        <div className="h-12 bg-surface-light rounded flex-1" />
        <div className="h-12 bg-surface-light rounded flex-1" />
      </div>
    </Card>
  );
}
