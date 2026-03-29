"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTalksStore } from "@/stores/talksStore";
import { parseUrl } from "@/lib/parsers/url";
import type { Talk, Slide } from "@/types/talk";

interface PreviewData {
  title: string;
  slides: Slide[];
  source: string;
}

export function UrlImport() {
  const router = useRouter();
  const { addTalk } = useTalksStore();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [editableTitle, setEditableTitle] = useState("");

  const handleImport = async () => {
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const result = await parseUrl(url.trim());

      if (result.slides.length === 0) {
        throw new Error("No content could be extracted from this URL.");
      }

      setPreview({
        title: result.title,
        slides: result.slides,
        source: url.trim(),
      });
      setEditableTitle(result.title);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract content from URL."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;

    const now = Date.now();
    const talk: Talk = {
      id: nanoid(),
      title: editableTitle || preview.title || "Imported Article",
      slides: preview.slides,
      createdAt: now,
      updatedAt: now,
      totalRehearsals: 0,
      source: "url",
    };

    await addTalk(talk);
    router.push("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && url.trim() && !loading) {
      handleImport();
    }
  };

  // Calculate total time estimate
  const totalSeconds = preview?.slides.reduce(
    (sum, slide) => sum + slide.estimatedSeconds,
    0
  ) ?? 0;
  const totalMinutes = Math.round(totalSeconds / 60);

  // Preview step
  if (preview) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-dim mb-2">
            Talk Title
          </label>
          <input
            type="text"
            value={editableTitle}
            onChange={(e) => setEditableTitle(e.target.value)}
            className="w-full bg-surface-light text-text rounded-[var(--radius-sm)] px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Article Title"
            aria-label="Talk title"
          />
        </div>

        <Card padding="sm">
          <div className="flex justify-between items-center text-sm">
            <span className="text-text-dim">
              {preview.slides.length} section{preview.slides.length !== 1 ? "s" : ""}
            </span>
            <span className="text-text-dim">
              ~{totalMinutes} min{totalMinutes !== 1 ? "s" : ""} to rehearse
            </span>
          </div>
          <div className="text-xs text-text-dim mt-2 truncate">
            Source: {preview.source}
          </div>
        </Card>

        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
          {preview.slides.slice(0, 10).map((slide, i) => (
            <Card key={slide.id} padding="sm">
              <div className="text-xs text-text-dim mb-1">Section {i + 1}</div>
              <div className="font-semibold mb-1 line-clamp-1">{slide.title}</div>
              <div className="text-sm text-text-dim line-clamp-2">
                {slide.notes.substring(0, 150)}
                {slide.notes.length > 150 ? "..." : ""}
              </div>
            </Card>
          ))}
          {preview.slides.length > 10 && (
            <div className="text-center text-sm text-text-dim py-2">
              +{preview.slides.length - 10} more sections
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setPreview(null);
              setEditableTitle("");
            }}
            aria-label="Go back to URL input"
          >
            Back
          </Button>
          <Button onClick={handleSave} aria-label="Save imported talk">
            Save Talk
          </Button>
        </div>
      </div>
    );
  }

  // Input step
  return (
    <div className="space-y-4">
      <Card className="text-center py-6">
        <div className="text-4xl mb-4">Link</div>
        <p className="text-text-dim mb-4">
          Import any article or webpage. We'll extract the readable text and
          convert it to rehearsal sections.
        </p>
      </Card>

      <div>
        <label className="block text-sm font-semibold text-text-dim mb-2">
          Article URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com/article"
          className="w-full bg-surface-light text-text rounded-[var(--radius-sm)] px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-accent min-h-[60px]"
          disabled={loading}
          aria-label="URL to import"
        />
      </div>

      <Button
        onClick={handleImport}
        disabled={!url.trim() || loading}
        aria-label={loading ? "Extracting content" : "Import from URL"}
      >
        {loading ? "Extracting content..." : "Import"}
      </Button>

      {error && (
        <Card className="bg-danger/10 border border-danger/30">
          <p className="text-sm text-danger">{error}</p>
          <p className="text-xs text-text-dim mt-2">
            Try pasting the content directly in the Paste tab instead.
          </p>
        </Card>
      )}

      <Card padding="sm">
        <h3 className="font-bold mb-2">What works best</h3>
        <ul className="text-sm text-text-dim space-y-1">
          <li>Blog posts and articles</li>
          <li>News stories</li>
          <li>Documentation pages</li>
          <li>Any page with readable text content</li>
        </ul>
        <p className="text-xs text-text-dim mt-3">
          Note: Paywalled content, PDFs, and image-heavy pages may not work.
        </p>
      </Card>
    </div>
  );
}
