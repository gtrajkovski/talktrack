"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { QuickFireMode } from "@/components/conference-day/QuickFireMode";
import { useTalksStore } from "@/stores/talksStore";
import { getSlidesForSmartRehearse } from "@/lib/scoring/spacedRepetition";

export default function QuickFireRoutePage() {
  const params = useParams();
  const { talks, loadTalks } = useTalksStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTalks().then(() => setIsLoading(false));
  }, [loadTalks]);

  const talk = useMemo(() => {
    return talks.find((t) => t.id === params.id) ?? null;
  }, [talks, params.id]);

  // Get weak slides (box 1-2 only)
  const weakSlides = useMemo(() => {
    if (!talk) return [];
    const sorted = getSlidesForSmartRehearse(talk.slides);
    // Filter to box 1-2 only (weak slides)
    return sorted.filter((s) => (s.srBox ?? 1) <= 2);
  }, [talk]);

  if (isLoading || !talk) {
    return (
      <AppShell>
        <Header title="Quick-Fire" backHref={`/talk/${params.id}/conference-day`} />
        <div className="flex items-center justify-center h-64 text-text-dim">
          Loading...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Quick-Fire" backHref={`/talk/${params.id}/conference-day`} />
      <QuickFireMode talkId={talk.id} weakSlides={weakSlides} />
    </AppShell>
  );
}
