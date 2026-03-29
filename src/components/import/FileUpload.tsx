"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useTalksStore } from "@/stores/talksStore";
import { parsePptx } from "@/lib/parsers/pptx";
import { parseDocx } from "@/lib/parsers/docx";
import type { Talk } from "@/types/talk";

type FileType = "pptx" | "docx" | "pdf" | "unknown";

function detectFileType(file: File): FileType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pptx")) return "pptx";
  if (name.endsWith(".docx")) return "docx";
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  return "unknown";
}

export function FileUpload() {
  const router = useRouter();
  const { addTalk } = useTalksStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setIsProcessing(true);

    try {
      const fileType = detectFileType(file);

      if (fileType === "unknown") {
        throw new Error("Unsupported file type. Please use .pptx, .docx, or .pdf files.");
      }

      let result;

      if (fileType === "pdf") {
        const { parsePdf } = await import("@/lib/parsers/pdf");
        result = await parsePdf(file);
      } else {
        const buffer = await file.arrayBuffer();
        if (fileType === "pptx") {
          result = await parsePptx(buffer);
        } else {
          result = await parseDocx(buffer);
        }
      }

      if (result.slides.length === 0) {
        throw new Error("No content found in the file.");
      }

      const now = Date.now();
      const talk: Talk = {
        id: nanoid(),
        title: result.title,
        slides: result.slides,
        createdAt: now,
        updatedAt: now,
        totalRehearsals: 0,
        source: fileType,
      };

      await addTalk(talk);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pptx,.docx,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Card className="text-center py-8">
        <div className="text-4xl mb-4">Upload</div>
        <p className="text-text-dim mb-6">
          Import speaker notes from PowerPoint (.pptx), Word (.docx), or PDF files.
        </p>

        <Button onClick={handleClick} disabled={isProcessing}>
          {isProcessing ? "Processing..." : "Choose File"}
        </Button>

        {fileName && (
          <p className="text-sm text-text-dim mt-4">
            Selected: {fileName}
          </p>
        )}

        {error && (
          <p className="text-sm text-danger mt-4">
            {error}
          </p>
        )}
      </Card>

      <Card padding="sm">
        <h3 className="font-bold mb-2">Supported Formats</h3>
        <ul className="text-sm text-text-dim space-y-1">
          <li><strong>.pptx</strong> - Extracts slide titles and speaker notes</li>
          <li><strong>.docx</strong> - Splits by paragraphs (blank lines = slide breaks)</li>
          <li><strong>.pdf</strong> - Extracts text page-by-page (text-based PDFs only)</li>
        </ul>
      </Card>
    </div>
  );
}
