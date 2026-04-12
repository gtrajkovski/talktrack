"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { ConferenceDayPage } from "@/components/conference-day";
import { useTalksStore } from "@/stores/talksStore";

export default function ConferenceDayRoutePage() {
  const params = useParams();
  const { talks, loadTalks } = useTalksStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTalks().then(() => setIsLoading(false));
  }, [loadTalks]);

  const talk = useMemo(() => {
    return talks.find((t) => t.id === params.id) ?? null;
  }, [talks, params.id]);

  if (isLoading || !talk) {
    return (
      <AppShell>
        <Header title="Conference Day" backHref={`/talk/${params.id}`} />
        <div className="flex items-center justify-center h-64 text-text-dim">
          Loading...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Conference Day" backHref={`/talk/${params.id}`} />
      <ConferenceDayPage talk={talk} />
    </AppShell>
  );
}
