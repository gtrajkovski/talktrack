"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RecordingPlayer } from "@/components/recordings";
import { useTalksStore } from "@/stores/talksStore";
import {
  getRecordingsByTalk,
  deleteRecording,
  getRecordingsStorageSize,
} from "@/lib/db/recordings";
import type { Recording } from "@/types/recording";

export default function RecordingsPage() {
  const params = useParams();
  const talkId = params.id as string;
  const { talks, loadTalks } = useTalksStore();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [storageSize, setStorageSize] = useState(0);
  const [loading, setLoading] = useState(true);

  const talk = useMemo(() => {
    return talks.find((t) => t.id === talkId) ?? null;
  }, [talks, talkId]);

  // Load recordings
  useEffect(() => {
    loadTalks();
    loadRecordings();
  }, [loadTalks, talkId]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const recs = await getRecordingsByTalk(talkId);
      setRecordings(recs);
      const size = await getRecordingsStorageSize();
      setStorageSize(size);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordingId: string) => {
    await deleteRecording(recordingId);
    setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
    const size = await getRecordingsStorageSize();
    setStorageSize(size);
  };

  // Group recordings by session
  const groupedBySession = useMemo(() => {
    const groups: Record<string, Recording[]> = {};
    for (const rec of recordings) {
      if (!groups[rec.sessionId]) {
        groups[rec.sessionId] = [];
      }
      groups[rec.sessionId].push(rec);
    }
    // Sort each group by slide index
    for (const sessionId of Object.keys(groups)) {
      groups[sessionId].sort((a, b) => a.slideIndex - b.slideIndex);
    }
    return groups;
  }, [recordings]);

  // Get session dates for headers
  const sessionDates = useMemo(() => {
    const dates: Record<string, string> = {};
    for (const [sessionId, recs] of Object.entries(groupedBySession)) {
      if (recs.length > 0) {
        dates[sessionId] = new Date(recs[0].createdAt).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }
    return dates;
  }, [groupedBySession]);

  // Get slide title from talk
  const getSlideTitle = (slideId: string) => {
    if (!talk) return "Slide";
    const slide = talk.slides.find((s) => s.id === slideId);
    return slide?.title || "Slide";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <AppShell>
        <Header title="Recordings" backHref={`/talk/${talkId}`} />
        <div className="flex items-center justify-center h-64 text-text-dim">
          Loading recordings...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header title="Recordings" backHref={`/talk/${talkId}`} />

      <div className="px-4 py-4 space-y-6">
        {/* Storage info */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Storage Used</div>
              <div className="text-sm text-text-dim">
                {recordings.length} recording{recordings.length !== 1 ? "s" : ""} • 30-day retention
              </div>
            </div>
            <div className="text-xl font-bold text-accent">
              {formatSize(storageSize)}
            </div>
          </div>
        </Card>

        {/* Empty state */}
        {recordings.length === 0 && (
          <div className="text-center py-12 text-text-dim">
            <div className="text-4xl mb-4">🎙️</div>
            <div className="font-medium">No recordings yet</div>
            <div className="text-sm mt-1">
              Complete a rehearsal in Prompt or Test mode to record your voice.
            </div>
          </div>
        )}

        {/* Recordings grouped by session */}
        {Object.entries(groupedBySession)
          .sort(([, a], [, b]) => b[0].createdAt - a[0].createdAt)
          .map(([sessionId, sessionRecordings]) => (
            <div key={sessionId}>
              <div className="text-sm text-text-dim uppercase tracking-wide mb-3">
                {sessionDates[sessionId]}
              </div>
              <div className="space-y-3">
                {sessionRecordings.map((recording) => (
                  <RecordingPlayer
                    key={recording.id}
                    recording={recording}
                    slideTitle={getSlideTitle(recording.slideId)}
                    onDelete={() => handleDelete(recording.id)}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </AppShell>
  );
}
