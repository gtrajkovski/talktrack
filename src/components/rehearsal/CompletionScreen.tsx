"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { sessionComplete } from "@/lib/audio/chime";

interface CompletionScreenProps {
  talkId: string;
  talkTitle: string;
  slidesCompleted: number;
  totalSlides: number;
  mode: string;
}

export function CompletionScreen({
  talkId,
  talkTitle,
  slidesCompleted,
  totalSlides,
  mode,
}: CompletionScreenProps) {
  useEffect(() => {
    sessionComplete();
  }, []);

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
