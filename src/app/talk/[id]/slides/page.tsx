"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { useTalksStore } from "@/stores/talksStore";
import { formatDuration } from "@/lib/utils/formatDuration";

export default function SlidesPage() {
  const params = useParams();
  const { talks, loadTalks } = useTalksStore();

  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  // Derive talk from talks array (no setState needed)
  const talk = useMemo(
    () => talks.find((t) => t.id === params.id) ?? null,
    [talks, params.id]
  );

  if (!talk) {
    return (
      <AppShell>
        <Header title="Loading..." backHref={`/talk/${params.id}`} />
        <div className="flex items-center justify-center h-64 text-text-dim">
          Loading slides...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Slides" backHref={`/talk/${params.id}`} />

      <div className="px-4 py-4 space-y-3">
        {talk.slides.map((slide, index) => (
          <Card key={slide.id}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-surface-light flex items-center justify-center text-sm font-bold text-text-dim">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">{slide.title}</h3>
                <p className="text-sm text-text-dim mt-1 whitespace-pre-wrap">
                  {slide.notes}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-text-dim">
                  <span>{slide.wordCount} words</span>
                  <span>{formatDuration(slide.estimatedSeconds)}</span>
                  <span>{slide.timesRehearsed} rehearsals</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
