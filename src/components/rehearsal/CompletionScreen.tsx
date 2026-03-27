"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AudioPlayerFromBlob } from "@/components/ui/AudioPlayer";
import { sessionComplete } from "@/lib/audio/chime";
import { getRecordingsBySession } from "@/lib/db/recordings";
import type { Recording } from "@/types/recording";

interface CompletionScreenProps {
  talkId: string;
  talkTitle: string;
  slidesCompleted: number;
  totalSlides: number;
  mode: string;
  sessionId: string | null;
}

export function CompletionScreen({
  talkId,
  talkTitle,
  slidesCompleted,
  totalSlides,
  mode,
  sessionId,
}: CompletionScreenProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [showRecordings, setShowRecordings] = useState(false);

  useEffect(() => {
    sessionComplete();
  }, []);

  // Load recordings for this session
  useEffect(() => {
    if (sessionId) {
      getRecordingsBySession(sessionId).then(setRecordings);
    }
  }, [sessionId]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-bg">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">Done!</div>
        <h1 className="text-2xl font-extrabold mb-2">Rehearsal Complete</h1>
        <p className="text-text-dim">{talkTitle}</p>
      </div>

      <Card className="w-full max-w-sm mb-8">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold">{slidesCompleted}</div>
            <div className="text-sm text-text-dim">Slides</div>
          </div>
          <div>
            <div className="text-3xl font-bold capitalize">{mode}</div>
            <div className="text-sm text-text-dim">Mode</div>
          </div>
        </div>
      </Card>

      {/* Recordings section */}
      {recordings.length > 0 && (
        <div className="w-full max-w-sm mb-6">
          <button
            onClick={() => setShowRecordings(!showRecordings)}
            className="w-full flex items-center justify-between p-3 bg-surface rounded-[var(--radius-sm)] text-left"
          >
            <span className="text-sm font-semibold">
              {recordings.length} Recording{recordings.length !== 1 ? "s" : ""}
            </span>
            <svg
              className={`w-5 h-5 text-text-dim transition-transform ${showRecordings ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showRecordings && (
            <div className="mt-3 space-y-3">
              {recordings
                .sort((a, b) => a.slideIndex - b.slideIndex)
                .map((rec) => (
                  <div key={rec.id} className="bg-surface rounded-[var(--radius-sm)] p-3">
                    <div className="text-xs text-text-dim mb-2">Slide {rec.slideIndex + 1}</div>
                    <AudioPlayerFromBlob blob={rec.audioBlob} duration={rec.duration / 1000} />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-sm space-y-3">
        <Link href={`/talk/${talkId}/rehearse?mode=${mode}`}>
          <Button>Practice Again</Button>
        </Link>
        <Link href={`/talk/${talkId}`}>
          <Button variant="secondary">Back to Talk</Button>
        </Link>
      </div>
    </div>
  );
}
