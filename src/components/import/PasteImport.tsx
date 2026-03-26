"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTalksStore } from "@/stores/talksStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { countWords } from "@/lib/utils/wordCount";
import { estimateSeconds } from "@/lib/utils/estimateTime";
import type { Talk, Slide } from "@/types/talk";

interface ParsedSlide {
  title: string;
  notes: string;
}

function parseText(text: string): ParsedSlide[] {
  const slides: ParsedSlide[] = [];
  const blocks = text.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length === 0 || !lines[0].trim()) continue;

    const title = lines[0].trim();
    const notes = lines.slice(1).join("\n").trim();

    slides.push({ title, notes: notes || title });
  }

  return slides;
}

export function PasteImport() {
  const router = useRouter();
  const { addTalk } = useTalksStore();
  const { wordsPerMinute } = useSettingsStore();

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<ParsedSlide[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");

  const handleParse = () => {
    const parsed = parseText(text);
    if (parsed.length > 0) {
      setPreview(parsed);
      if (!title) {
        setTitle(parsed[0].title.slice(0, 50));
      }
      setStep("preview");
    }
  };

  const handleSave = async () => {
    const now = Date.now();
    const slides: Slide[] = preview.map((p, index) => ({
      id: nanoid(),
      index,
      title: p.title,
      notes: p.notes,
      wordCount: countWords(p.notes),
      estimatedSeconds: estimateSeconds(p.notes, wordsPerMinute),
      timesRehearsed: 0,
    }));

    const talk: Talk = {
      id: nanoid(),
      title: title || "Untitled Talk",
      slides,
      createdAt: now,
      updatedAt: now,
      totalRehearsals: 0,
      source: "paste",
    };

    await addTalk(talk);
    router.push("/");
  };

  if (step === "preview") {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-dim mb-2">
            Talk Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface-light text-text rounded-[var(--radius-sm)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="My Presentation"
          />
        </div>

        <div className="text-sm text-text-dim">
          {preview.length} slide{preview.length !== 1 ? "s" : ""} parsed
        </div>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {preview.map((slide, i) => (
            <Card key={i} padding="sm">
              <div className="text-xs text-text-dim mb-1">Slide {i + 1}</div>
              <div className="font-semibold mb-1">{slide.title}</div>
              <div className="text-sm text-text-dim line-clamp-2">
                {slide.notes}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setStep("input")}>
            Back
          </Button>
          <Button onClick={handleSave}>Save Talk</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-text-dim mb-2">
          Paste your script or notes
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste your content here...\n\nSeparate slides with blank lines.\nFirst line of each block = slide title.\nRemaining lines = notes.`}
          className="w-full h-64 bg-surface-light text-text rounded-[var(--radius)] px-4 py-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <Button onClick={handleParse} disabled={!text.trim()}>
        Preview Slides
      </Button>
    </div>
  );
}
