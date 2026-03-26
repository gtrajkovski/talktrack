"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ResumePrompt } from "@/components/home";
import { FirstRunModal } from "@/components/onboarding";
import { useTalksStore } from "@/stores/talksStore";
import { useRehearsalStore } from "@/stores/rehearsalStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDuration } from "@/lib/utils/formatDuration";
import { getIncompleteSessions, deleteSession } from "@/lib/db/sessions";
import { createDemoTalk } from "@/lib/data/demoTalk";
import type { RehearsalSession } from "@/types/session";
import type { Talk } from "@/types/talk";

export default function HomePage() {
  const router = useRouter();
  const { talks, isLoading, loadTalks, getTalk, addTalk } = useTalksStore();
  const { resumeSession } = useRehearsalStore();
  const { hasSeenOnboarding, updateSettings, wordsPerMinute } = useSettingsStore();

  const [incompleteSession, setIncompleteSession] =
    useState<RehearsalSession | null>(null);
  const [incompleteTalk, setIncompleteTalk] = useState<Talk | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  // Show onboarding modal for first-time users
  useEffect(() => {
    if (!isLoading && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [isLoading, hasSeenOnboarding]);

  const handleCloseOnboarding = useCallback(() => {
    setShowOnboarding(false);
    updateSettings({ hasSeenOnboarding: true });
  }, [updateSettings]);

  const handleTryDemo = useCallback(async () => {
    const demoTalk = createDemoTalk(wordsPerMinute);
    await addTalk(demoTalk);
    router.push(`/talk/${demoTalk.id}`);
  }, [addTalk, router, wordsPerMinute]);

  // Check for incomplete sessions
  useEffect(() => {
    async function checkIncomplete() {
      const sessions = await getIncompleteSessions();
      if (sessions.length > 0) {
        const session = sessions[0];
        const talk = getTalk(session.talkId);
        if (talk) {
          setIncompleteSession(session);
          setIncompleteTalk(talk);
        } else {
          // Talk was deleted, clean up orphan session
          await deleteSession(session.id);
        }
      }
    }
    if (!isLoading && talks.length > 0) {
      checkIncomplete();
    }
  }, [isLoading, talks, getTalk]);

  const handleResume = useCallback(async () => {
    if (incompleteSession && incompleteTalk) {
      await resumeSession(incompleteSession, incompleteTalk);
      router.push(`/talk/${incompleteTalk.id}/rehearse?mode=${incompleteSession.mode}`);
    }
  }, [incompleteSession, incompleteTalk, resumeSession, router]);

  const handleDiscard = useCallback(async () => {
    if (incompleteSession) {
      await deleteSession(incompleteSession.id);
      setIncompleteSession(null);
      setIncompleteTalk(null);
    }
  }, [incompleteSession]);

  const getTotalTime = (slides: { estimatedSeconds: number }[]) => {
    return slides.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  };

  return (
    <AppShell>
      <Header title="TalkTrack" />

      <div className="px-4 py-4 space-y-4">
        {/* Resume Prompt */}
        {incompleteSession && incompleteTalk && (
          <ResumePrompt
            session={incompleteSession}
            talk={incompleteTalk}
            onResume={handleResume}
            onDiscard={handleDiscard}
          />
        )}

        {isLoading ? (
          <div className="text-center py-12 text-text-dim">Loading...</div>
        ) : talks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">No talks yet</div>
            <p className="text-text-dim mb-6">
              Import your first presentation to start rehearsing.
            </p>
            <div className="space-y-3">
              <Link href="/import">
                <Button>Import Talk</Button>
              </Link>
              <Button onClick={handleTryDemo} variant="secondary">
                Try Demo Talk
              </Button>
            </div>
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

      {/* First-run onboarding modal */}
      {showOnboarding && <FirstRunModal onClose={handleCloseOnboarding} />}
    </AppShell>
  );
}
