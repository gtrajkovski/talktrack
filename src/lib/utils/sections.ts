import type { Slide, Section } from "@/types/talk";

/**
 * Extract unique sections from slides
 */
export function getSections(slides: Slide[]): Section[] {
  const sectionsMap = new Map<string, Section>();

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const sectionId = slide.sectionId || "default";
    const sectionName = slide.sectionName || "All Slides";

    if (!sectionsMap.has(sectionId)) {
      sectionsMap.set(sectionId, {
        id: sectionId,
        name: sectionName,
        slideCount: 0,
        startIndex: i,
        endIndex: i,
      });
    }

    const section = sectionsMap.get(sectionId)!;
    section.slideCount++;
    section.endIndex = i;
  }

  return Array.from(sectionsMap.values());
}

/**
 * Filter slides by section ID
 */
export function filterSlidesBySection(slides: Slide[], sectionId: string | null): Slide[] {
  if (!sectionId || sectionId === "all") {
    return slides;
  }
  return slides.filter((s) => s.sectionId === sectionId);
}

/**
 * Check if talk has multiple sections
 */
export function hasMultipleSections(slides: Slide[]): boolean {
  const sections = getSections(slides);
  // More than one section, or one named section (not just default)
  return sections.length > 1 || (sections.length === 1 && sections[0].id !== "default");
}
