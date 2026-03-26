"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTalksStore } from "@/stores/talksStore";
import { formatDuration } from "@/lib/utils/formatDuration";
import type { Talk } from "@/types/talk";

const modes = [
  {
    id: "listen",
    name: "Listen",
    description: "Hear your slides read aloud. Great for first pass.",
    color: "bg-blue",
  },
  {
    id: "prompt",
    name: "Prompt",
    description: "Hear the title, then recite from memory. Say 'reveal' if stuck.",
    color: "bg-accent",
  },
  {
    id: "test",
    name: "Test",
    description: "Full recall mode. Only the slide number, you do the rest.",
    color: "bg-success",
  },
] as const;

export default function TalkDetailPage() {
  const params = useParams();
  const { talks, loadTalks } = useTalksStore();
  const [talk, setTalk] = useState<Talk | null>(null);

  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  useEffect(() => {
    const found = talks.find((t) => t.id === params.id);
    if (found) setTalk(found);
  }, [talks, params.id]);

  if (!talk) {
    return (
      <AppShell>
        <Header title="Loading..." backHref="/" />
        <div className="flex items-center justify-center h-64 text-text-dim">
          Loading talk...
        </div>
      </AppShell>
    );
  }

  const totalTime = talk.slides.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  return (
    <AppShell>
      <Header title={talk.title} backHref="/" />

      <div className="px-4 py-4 space-y-6">
        {/* Stats */}
        <Card>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{talk.slides.length}</div>
              <div className="text-xs text-text-dim uppercase tracking-wide">
                Slides
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatDuration(totalTime)}
              </div>
              <div className="text-xs text-text-dim uppercase tracking-wide">
                Est. Time
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">{talk.totalRehearsals}</div>
              <div className="text-xs text-text-dim uppercase tracking-wide">
                Rehearsals
              </div>
            </div>
          </div>
        </Card>

        {/* Mode Selection */}
        <div>
          <h2 className="text-lg font-bold mb-3">Start Rehearsal</h2>
          <div className="space-y-3">
            {modes.map((mode) => (
              <Link key={mode.id} href={`/talk/${talk.id}/rehearse?mode=${mode.id}`}>
                <Card className="active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full ${mode.color} flex items-center justify-center`}
                    >
                      <span className="text-bg font-bold text-lg">
                        {mode.name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold">{mode.name}</div>
                      <div className="text-sm text-text-dim">
                        {mode.description}
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-text-dim"
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
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link href={`/talk/${talk.id}/slides`} className="flex-1">
            <Button variant="secondary">View Slides</Button>
          </Link>
          <Link href={`/talk/${talk.id}/stats`} className="flex-1">
            <Button variant="secondary">Stats</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
