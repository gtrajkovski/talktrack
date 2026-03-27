"use client";

import type { Slide } from "@/types/talk";

interface ProgressHeatmapProps {
  slides: Slide[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-accent";
  if (score >= 40) return "bg-accent-dim";
  return "bg-danger";
}

function getScoreOpacity(score: number): string {
  // Higher scores get more opacity
  if (score >= 80) return "opacity-100";
  if (score >= 60) return "opacity-90";
  if (score >= 40) return "opacity-70";
  return "opacity-60";
}

export function ProgressHeatmap({ slides }: ProgressHeatmapProps) {
  // Find max history length across all slides
  const maxHistory = Math.max(
    ...slides.map((s) => s.scoreHistory?.length || 0),
    1
  );

  // If no scores at all, show empty state
  const hasAnyScores = slides.some((s) => s.scoreHistory && s.scoreHistory.length > 0);

  if (!hasAnyScores) {
    return (
      <div className="text-center py-6 text-text-dim">
        <p>No scores recorded yet.</p>
        <p className="text-sm mt-1">Practice in Prompt or Test mode to see your progress.</p>
      </div>
    );
  }

  // Show last N attempts (up to 10)
  const columnsToShow = Math.min(maxHistory, 10);

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex items-center justify-end gap-3 text-xs text-text-dim mb-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-danger opacity-60" />
          <span>&lt;40%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-accent-dim opacity-70" />
          <span>40-59%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-accent opacity-90" />
          <span>60-79%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-success" />
          <span>80%+</span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="space-y-1">
        {slides.map((slide, slideIndex) => {
          const history = slide.scoreHistory || [];
          // Take last N scores
          const recentScores = history.slice(-columnsToShow);
          // Pad with empty cells if needed
          const paddedScores = [
            ...Array(columnsToShow - recentScores.length).fill(null),
            ...recentScores,
          ];

          return (
            <div key={slide.id} className="flex items-center gap-2">
              {/* Slide number */}
              <div className="w-6 text-xs text-text-dim text-right shrink-0">
                {slideIndex + 1}
              </div>

              {/* Score cells */}
              <div className="flex gap-0.5 flex-1">
                {paddedScores.map((entry, i) => (
                  <div
                    key={i}
                    className={`h-6 flex-1 rounded-sm ${
                      entry
                        ? `${getScoreColor(entry.score)} ${getScoreOpacity(entry.score)}`
                        : "bg-surface-light opacity-30"
                    }`}
                    title={entry ? `${entry.score}% (${entry.mode})` : "No attempt"}
                  />
                ))}
              </div>

              {/* Latest score */}
              <div className="w-10 text-xs text-right shrink-0">
                {slide.lastScore !== undefined ? (
                  <span className={slide.lastScore >= 60 ? "text-success" : "text-text-dim"}>
                    {slide.lastScore}%
                  </span>
                ) : (
                  <span className="text-text-dim">-</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time indicator */}
      <div className="flex justify-between text-xs text-text-dim mt-2 px-8">
        <span>Older</span>
        <span>Recent</span>
      </div>
    </div>
  );
}
