"use client";

import { Card } from "@/components/ui/Card";
import { calculateSimilarity } from "@/lib/scoring/similarity";
import { countFillerWords } from "@/lib/scoring/fillerWords";

interface TranscriptScoreProps {
  transcript: string;
  originalNotes: string;
  showScore?: boolean;
}

export function TranscriptScore({
  transcript,
  originalNotes,
  showScore = true,
}: TranscriptScoreProps) {
  if (!transcript) return null;

  const similarity = calculateSimilarity(originalNotes, transcript);
  const fillerCount = countFillerWords(transcript);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-accent";
    return "text-danger";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent!";
    if (score >= 80) return "Great job!";
    if (score >= 60) return "Good progress";
    if (score >= 40) return "Keep practicing";
    return "Needs work";
  };

  return (
    <Card className="mt-4">
      <div className="text-xs text-text-dim uppercase tracking-wide mb-2">
        What you said
      </div>
      <p className="text-sm text-text-dim mb-3 italic">
        &ldquo;{transcript}&rdquo;
      </p>

      {showScore && (
        <div className="flex items-center gap-4 pt-3 border-t border-surface-light">
          <div className="flex-1">
            <div className={`text-2xl font-bold ${getScoreColor(similarity)}`}>
              {similarity}%
            </div>
            <div className="text-xs text-text-dim">{getScoreLabel(similarity)}</div>
          </div>

          {fillerCount > 0 && (
            <div className="text-right">
              <div className="text-lg font-medium text-text-dim">
                {fillerCount}
              </div>
              <div className="text-xs text-text-dim">
                filler{fillerCount !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
