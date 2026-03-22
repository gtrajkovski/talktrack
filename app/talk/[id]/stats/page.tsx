"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTalksStore } from "@/stores/talksStore";
import { getSessionsForTalk } from "@/lib/db/sessions";
import type { Talk } from "@/types/talk";
import type { RehearsalSession } from "@/types/session";

export default function StatsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const getTalk = useTalksStore((s) => s.getTalk);
  const [talk, setTalk] = useState<Talk | null>(null);
  const [sessions, setSessions] = useState<RehearsalSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTalk(id), getSessionsForTalk(id)]).then(([t, s]) => {
      setTalk(t ?? null);
      setSessions(s);
      setLoading(false);
    });
  }, [id, getTalk]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-text-dim text-lg">Loading...</div>
      </div>
    );
  }

  if (!talk) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <p className="text-text-dim text-lg">Talk not found</p>
        <button
          onClick={() => router.push("/")}
          className="text-accent font-semibold"
        >
          Go home
        </button>
      </div>
    );
  }

  const totalWords = talk.slides.reduce((s, sl) => s + sl.wordCount, 0);

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-6">
      <header className="mb-6">
        <button
          onClick={() => router.push(`/talk/${id}`)}
          className="text-accent text-sm font-semibold mb-3"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Stats</h1>
        <p className="text-text-dim text-sm mt-1">{talk.title}</p>
      </header>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold text-accent">
            {talk.totalRehearsals}
          </div>
          <div className="text-text-dim text-xs mt-1">Rehearsals</div>
        </div>
        <div className="bg-surface rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold">{talk.slides.length}</div>
          <div className="text-text-dim text-xs mt-1">Slides</div>
        </div>
        <div className="bg-surface rounded-xl p-4 text-center">
          <div className="text-2xl font-extrabold">{totalWords}</div>
          <div className="text-text-dim text-xs mt-1">Words</div>
        </div>
      </div>

      {/* Session history */}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim mb-3">
        Recent Sessions
      </h2>

      {sessions.length === 0 ? (
        <div className="bg-surface rounded-xl p-5 text-center text-text-dim">
          No sessions yet. Start rehearsing!
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.slice(0, 20).map((session) => {
            const duration = session.completedAt
              ? Math.round((session.completedAt - session.startedAt) / 1000)
              : 0;
            const mins = Math.floor(duration / 60);
            const secs = duration % 60;
            const date = new Date(session.startedAt);

            return (
              <div key={session.id} className="bg-surface rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold capitalize">
                      {session.mode}
                    </span>
                    <span className="text-text-dim text-sm ml-2">
                      {session.slidesCompleted}/{session.totalSlides} slides
                    </span>
                  </div>
                  <span className="text-text-dim text-sm">
                    {mins}:{secs.toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="text-text-dim text-xs mt-1">
                  {date.toLocaleDateString()} at{" "}
                  {date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
