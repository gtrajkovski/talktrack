"use client";

import { useParams } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { CalmDownMode } from "@/components/conference-day/CalmDownMode";

export default function CalmDownRoutePage() {
  const params = useParams();
  const talkId = params.id as string;

  return (
    <AppShell>
      <Header title="Calm Down" backHref={`/talk/${talkId}/conference-day`} />
      <CalmDownMode talkId={talkId} />
    </AppShell>
  );
}
