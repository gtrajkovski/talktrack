"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { AppShell, Header } from "@/components/layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTalksStore } from "@/stores/talksStore";
import { formatDuration } from "@/lib/utils/formatDuration";
import { generateFullCsv, downloadCsv } from "@/lib/utils/exportCsv";
import { generateShareReport, shareReport } from "@/lib/utils/shareReport";
import { getSessionsByTalk } from "@/lib/db/sessions";
import { ProgressHeatmap, StructureAnalysis } from "@/components/stats";
import type { RehearsalSession } from "@/types/session";

export default function StatsPage() {
  const params = useParams();
  const { talks, loadTalks } = useTalksStore();
  const [sessions, setSessions] = useState<RehearsalSession[]>([]);

  useEffect(() => {
    loadTalks();
  }, [loadTalks]);

  // Derive talk from talks array (no setState needed)
  const talk = useMemo(
    () => talks.find((t) => t.id === params.id) ?? null,
    [talks, params.id]
  );

  // Load sessions when talk is available
  useEffect(() => {
    if (talk) {
      getSessionsByTalk(talk.id).then(setSessions);
    }
  }, [talk]);

  const handleExport = useCallback(() => {
    if (!talk) return;
    const csv = generateFullCsv(talk, sessions);
    const filename = `${talk.title.replace(/[^a-z0-9]/gi, "_")}_stats.csv`;
    downloadCsv(csv, filename);
  }, [talk, sessions]);

  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    if (!talk) return;
    const report = generateShareReport(talk);
    const usedNativeShare = await shareReport(report);
    if (!usedNativeShare) {
      setShareStatus("Copied to clipboard!");
      setTimeout(() => setShareStatus(null), 2000);
    }
  }, [talk]);

  if (!talk) {
    return (
      <AppShell>
        <Header title="Loading..." backHref={`/talk/${params.id}`} />
        <div className="flex items-center justify-center h-64 text-text-dim">
          Loading stats...
        </div>
      </AppShell>
    );
  }

  const totalWords = talk.slides.reduce((sum, s) => sum + s.wordCount, 0);
  const totalTime = talk.slides.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  return (
    <AppShell>
      <Header title="Statistics" backHref={`/talk/${params.id}`} />

      <div className="px-4 py-4 space-y-4">
        {/* Export/Share Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleShare}
            variant="secondary"
            fullWidth={false}
            className="px-4"
          >
            {shareStatus || "Share"}
          </Button>
          <Button
            onClick={handleExport}
            variant="secondary"
            fullWidth={false}
            className="px-4"
          >
            Export CSV
          </Button>
        </div>

        {/* Overview */}
        <Card>
          <h2 className="font-bold mb-3">Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">{talk.totalRehearsals}</div>
              <div className="text-sm text-text-dim">Total Rehearsals</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{talk.slides.length}</div>
              <div className="text-sm text-text-dim">Slides</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{totalWords}</div>
              <div className="text-sm text-text-dim">Total Words</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatDuration(totalTime)}</div>
              <div className="text-sm text-text-dim">Est. Duration</div>
            </div>
          </div>
        </Card>

        {/* Structure Analysis */}
        <StructureAnalysis talk={talk} />

        {/* Progress Heatmap */}
        <Card>
          <h2 className="font-bold mb-3">Progress Heatmap</h2>
          <ProgressHeatmap slides={talk.slides} />
        </Card>

        {/* Per-slide breakdown */}
        <Card>
          <h2 className="font-bold mb-3">Slide Breakdown</h2>
          <div className="space-y-3">
            {talk.slides.map((slide, index) => (
              <div
                key={slide.id}
                className="flex items-center justify-between py-2 border-b border-surface-light last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-dim w-6">{index + 1}</span>
                  <span className="font-medium truncate max-w-[150px]">
                    {slide.title}
                  </span>
                </div>
                <div className="text-sm text-text-dim">
                  {slide.timesRehearsed}x
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
