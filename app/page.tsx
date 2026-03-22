"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTalksStore } from "@/stores/talksStore";
import { createDemoTalk } from "@/lib/demo";

export default function HomePage() {
  const { talks, loading, loadTalks, addTalk } = useTalksStore();

  useEffect(() => {
    loadTalks().then(async () => {
      const current = useTalksStore.getState().talks;
      if (current.length === 0) {
        await addTalk(createDemoTalk());
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-text-dim text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">TalkTrack</h1>
        <p className="text-text-dim mt-1">Your rehearsal coach</p>
      </header>

      <div className="flex flex-col gap-3">
        {talks.map((talk) => (
          <Link
            key={talk.id}
            href={`/talk/${talk.id}`}
            className="bg-surface rounded-2xl p-5 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">{talk.title}</h2>
                <p className="text-text-dim text-sm mt-1">
                  {talk.slides.length} slide{talk.slides.length !== 1 && "s"}
                  {talk.totalRehearsals > 0 && (
                    <span>
                      {" "}
                      &middot; Rehearsed {talk.totalRehearsals} time
                      {talk.totalRehearsals !== 1 && "s"}
                    </span>
                  )}
                </p>
              </div>
              {talk.source === "demo" && (
                <span className="text-xs font-semibold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded-lg shrink-0 ml-3">
                  Demo
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/import"
        className="fixed bottom-6 left-4 right-4 bg-accent text-bg text-center font-bold text-lg py-4 rounded-2xl active:scale-[0.97] transition-transform"
      >
        + New Talk
      </Link>
    </div>
  );
}
