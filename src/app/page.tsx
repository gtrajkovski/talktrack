"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTalksStore } from "@/stores/talksStore";
import { formatDuration } from "@/lib/utils/formatDuration";

export default function HomePage() {
  const { talks, isLoading, loadTalks } = useTalksStore();

  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  const getTotalTime = (slides: { estimatedSeconds: number }[]) => {
    return slides.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  };

  return (
    <AppShell>
      <Header title="TalkTrack" />

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-text-dim">Loading...</div>
        ) : talks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">No talks yet</div>
            <p className="text-text-dim mb-6">
              Import your first presentation to start rehearsing.
            </p>
            <Link href="/import">
              <Button>Import Talk</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Your Talks</h2>
              <Link href="/import">
                <Button fullWidth={false} className="px-4">
                  + New
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {talks.map((talk) => (
                <Link key={talk.id} href={`/talk/${talk.id}`}>
                  <Card className="active:scale-[0.98] transition-transform">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base truncate">
                          {talk.title}
                        </h3>
                        <div className="text-sm text-text-dim mt-1">
                          {talk.slides.length} slide
                          {talk.slides.length !== 1 ? "s" : ""} &middot;{" "}
                          {formatDuration(getTotalTime(talk.slides))}
                        </div>
                      </div>
                      <div className="text-right text-sm text-text-dim ml-4">
                        <div>{talk.totalRehearsals} rehearsals</div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
