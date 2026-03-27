"use client";

import type { Section } from "@/types/talk";

interface SectionSelectorProps {
  sections: Section[];
  selectedSectionId: string | null;
  onSelect: (sectionId: string | null) => void;
}

export function SectionSelector({
  sections,
  selectedSectionId,
  onSelect,
}: SectionSelectorProps) {
  const totalSlides = sections.reduce((sum, s) => sum + s.slideCount, 0);

  return (
    <div className="space-y-2">
      <div className="text-xs text-text-dim uppercase tracking-wide font-semibold mb-2">
        Practice Section
      </div>

      {/* All slides option */}
      <button
        onClick={() => onSelect(null)}
        className={`
          w-full text-left p-3 rounded-[var(--radius-sm)] transition-colors
          ${selectedSectionId === null
            ? "bg-accent text-bg"
            : "bg-surface-light hover:bg-surface"
          }
        `}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium">All Slides</span>
          <span className={`text-sm ${selectedSectionId === null ? "text-bg/70" : "text-text-dim"}`}>
            {totalSlides} slides
          </span>
        </div>
      </button>

      {/* Individual sections */}
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className={`
            w-full text-left p-3 rounded-[var(--radius-sm)] transition-colors
            ${selectedSectionId === section.id
              ? "bg-accent text-bg"
              : "bg-surface-light hover:bg-surface"
            }
          `}
        >
          <div className="flex justify-between items-center">
            <span className="font-medium">{section.name}</span>
            <span className={`text-sm ${selectedSectionId === section.id ? "text-bg/70" : "text-text-dim"}`}>
              {section.slideCount} slide{section.slideCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className={`text-xs mt-1 ${selectedSectionId === section.id ? "text-bg/60" : "text-text-dim"}`}>
            Slides {section.startIndex + 1}–{section.endIndex + 1}
          </div>
        </button>
      ))}
    </div>
  );
}
