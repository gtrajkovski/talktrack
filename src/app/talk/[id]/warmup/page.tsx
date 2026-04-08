"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { WarmupPage } from "@/components/warmup";
import { useTalksStore } from "@/stores/talksStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { WarmupDuration } from "@/types/warmup";

export default function WarmupRoutePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { talks, loadTalks } = useTalksStore();
  const { warmupDuration } = useSettingsStore();
  const [isLoading, setIsLoading] = useState(true);

  // Get duration from query param or settings
  const duration = (searchParams.get("duration") as WarmupDuration) || warmupDuration || "medium";

  useEffect(() => {
    loadTalks().then(() => setIsLoading(false));
  }, [loadTalks]);

  // Find the talk
  const talk = useMemo(() => {
    return talks.find((t) => t.id === params.id) ?? null;
  }, [talks, params.id]);

  if (isLoading || !talk) {
    return (
      <AppShell>
        <Header title="Warm Up" backHref={`/talk/${params.id}`} />
        <div className="flex items-center justify-center h-64 text-text-dim">
          Loading...
        </div>
      </AppShell>
    );
  }

  return (
    <WarmupPage
      talkId={talk.id}
      talkTitle={talk.title}
      duration={duration}
    />
  );
}
