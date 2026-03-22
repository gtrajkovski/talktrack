"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTalksStore } from "@/stores/talksStore";
import type { Talk } from "@/types/talk";

const modes = [
  {
    key: "listen" as const,
    label: "Listen",
    desc: "Hear your notes read aloud. Just absorb.",
    icon: "🎧",
  },
  {
    key: "prompt" as const,
    label: "Prompt",
    desc: "Hear the title, speak from memory, then reveal.",
    icon: "💬",
  },
  {
    key: "test" as const,
    label: "Test",
    desc: "Hear the title only. Recall everything yourself.",
    icon: "🧠",
  },
];

export default function TalkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const getTalk = useTalksStore((s) => s.getTalk);
  const removeTalk = useTalksStore((s) => s.removeTalk);
  const [talk, setTalk] = useState<Talk | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTalk(id).then((t) => {
      setTalk(t ?? null);
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
        <Link href="/" className="text-accent font-semibold">
          Go home
        </Link>
      </div>
    );
  }

  const totalWords = talk.slides.reduce((s, sl) => s + sl.wordCount, 0);
  const totalSeconds = talk.slides.reduce(
    (s, sl) => s + sl.estimatedSeconds,
    0
  );
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-6">
      <header className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="text-accent text-sm font-semibold mb-3"
        >
          &larr; All Talks
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {talk.title}
        </h1>
        <p className="text-text-dim text-sm mt-1">
          {talk.slides.length} slides &middot; {totalWords} words &middot; ~
          {mins}:{secs.toString().padStart(2, "0")}
          {talk.totalRehearsals > 0 && (
            <span> &middot; {talk.totalRehearsals} rehearsals</span>
          )}
        </p>
      </header>

      <h2 className="text-xs font-semibold uppercase tracking-widest text-text-dim mb-3">
        Choose a Mode
      </h2>

      <div className="flex flex-col gap-3 flex-1">
        {modes.map((mode) => (
          <Link
            key={mode.key}
            href={`/talk/${id}/rehearse?mode=${mode.key}`}
            className="bg-surface rounded-2xl p-5 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{mode.icon}</span>
              <div>
                <h3 className="font-bold text-lg">{mode.label}</h3>
                <p className="text-text-dim text-sm">{mode.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <Link
          href={`/talk/${id}/stats`}
          className="flex-1 bg-surface text-center font-semibold py-3 rounded-xl text-sm"
        >
          Stats
        </Link>
        <button
          onClick={async () => {
            if (confirm("Delete this talk?")) {
              await removeTalk(id);
              router.push("/");
            }
          }}
          className="bg-danger/10 text-danger font-semibold py-3 px-6 rounded-xl text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
