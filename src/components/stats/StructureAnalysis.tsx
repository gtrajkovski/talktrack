"use client";

import type { Talk } from "@/types/talk";
import { Card } from "@/components/ui/Card";
import {
  analyzeStructure,
  getAssessmentColor,
  getBalanceScoreColor,
  type StructureAnalysis as StructureAnalysisType,
} from "@/lib/scoring/structureAnalysis";
import { formatDuration } from "@/lib/utils/formatDuration";

interface StructureAnalysisProps {
  talk: Talk;
}

export function StructureAnalysis({ talk }: StructureAnalysisProps) {
  const analysis = analyzeStructure(talk);

  if (talk.slides.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-5">
        {/* Header with balance score */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Presentation Structure</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-dim">Balance</span>
            <span
              className={`text-lg font-bold ${getBalanceScoreColor(analysis.balanceScore)}`}
            >
              {analysis.balanceScore}%
            </span>
          </div>
        </div>

        {/* Word Distribution */}
        <div>
          <h3 className="text-sm font-medium text-text-dim mb-2">
            Word Distribution
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {analysis.slides.map((slide) => (
              <WordBar key={slide.slideIndex} slide={slide} />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-text-dim">
            <span>Avg: {analysis.avgWordsPerSlide} words/slide</span>
            <div className="flex gap-3">
              {analysis.briefSlides > 0 && (
                <span className="text-warning">
                  {analysis.briefSlides} brief
                </span>
              )}
              {analysis.denseSlides > 0 && (
                <span className="text-error">{analysis.denseSlides} dense</span>
              )}
            </div>
          </div>
        </div>

        {/* Transitions */}
        {analysis.transitions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-dim mb-2">
              Transitions
            </h3>
            <div className="space-y-2">
              {analysis.transitions.slice(0, 3).map((t, i) => (
                <div
                  key={i}
                  className="text-sm bg-warning/10 border border-warning/20 rounded-lg px-3 py-2"
                >
                  <span className="text-warning font-medium">
                    Slides {t.afterSlideIndex + 1} → {t.afterSlideIndex + 2}:
                  </span>{" "}
                  <span className="text-text-dim">{t.reason}</span>
                </div>
              ))}
              {analysis.transitions.length > 3 && (
                <p className="text-xs text-text-dim">
                  +{analysis.transitions.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pacing */}
        {analysis.targetSeconds && (
          <div>
            <h3 className="text-sm font-medium text-text-dim mb-2">Pacing</h3>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-text-dim">Estimated:</span>{" "}
                <span className="font-medium">
                  {formatDuration(analysis.totalSeconds)}
                </span>
                <span className="text-text-dim mx-2">|</span>
                <span className="text-text-dim">Target:</span>{" "}
                <span className="font-medium">
                  {formatDuration(analysis.targetSeconds)}
                </span>
              </div>
              <PacingBadge
                status={analysis.pacingStatus!}
                percent={analysis.pacingPercent!}
              />
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-text-dim mb-2">
              Recommendations
            </h3>
            <ul className="space-y-1">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-text-dim flex gap-2">
                  <span className="text-accent">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All good state */}
        {analysis.recommendations.length === 0 &&
          analysis.transitions.length === 0 && (
            <div className="text-center py-2 text-success text-sm">
              Structure looks good!
            </div>
          )}
      </div>
    </Card>
  );
}

interface WordBarProps {
  slide: StructureAnalysisType["slides"][0];
}

function WordBar({ slide }: WordBarProps) {
  const colorClass = getAssessmentColor(slide.assessment);
  const label =
    slide.assessment === "brief"
      ? "(brief)"
      : slide.assessment === "dense"
      ? "(dense)"
      : "";

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 text-xs text-text-dim text-right shrink-0">
        {slide.slideIndex + 1}
      </div>
      <div className="flex-1 h-4 bg-surface-light rounded-sm overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all`}
          style={{ width: `${slide.barPercent}%` }}
        />
      </div>
      <div className="w-20 text-xs text-right shrink-0">
        <span className="text-text">{slide.wordCount}</span>
        {label && (
          <span
            className={`ml-1 ${
              slide.assessment === "brief" ? "text-warning" : "text-error"
            }`}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

interface PacingBadgeProps {
  status: "short" | "aligned" | "long";
  percent: number;
}

function PacingBadge({ status, percent }: PacingBadgeProps) {
  const config = {
    short: { color: "text-warning", icon: "↓", label: "Short" },
    aligned: { color: "text-success", icon: "✓", label: "Aligned" },
    long: { color: "text-error", icon: "↑", label: "Long" },
  }[status];

  return (
    <span className={`text-sm font-medium ${config.color}`}>
      {config.icon} {config.label} ({percent}%)
    </span>
  );
}
