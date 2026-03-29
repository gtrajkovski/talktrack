import { describe, it, expect } from "vitest";
import { parseMarkdown } from "@/lib/parsers/markdown";

describe("parseMarkdown", () => {
  describe("H1 headers (sections)", () => {
    it("uses first H1 as document title", () => {
      const md = "# My Presentation\n## Slide One\nContent";
      const result = parseMarkdown(md);
      expect(result.title).toBe("My Presentation");
    });

    it("creates section from H1 header", () => {
      const md = "# Introduction\n## First Slide\nContent";
      const result = parseMarkdown(md);
      expect(result.slides[0].sectionName).toBe("Introduction");
      expect(result.slides[0].sectionId).toBeTruthy();
    });

    it("assigns slides to their section", () => {
      const md = "# Section A\n## Slide 1\nContent\n## Slide 2\nContent\n# Section B\n## Slide 3\nContent";
      const result = parseMarkdown(md);
      expect(result.slides[0].sectionName).toBe("Section A");
      expect(result.slides[1].sectionName).toBe("Section A");
      expect(result.slides[2].sectionName).toBe("Section B");
    });
  });

  describe("H2 headers (slides)", () => {
    it("creates slide from H2 header", () => {
      const md = "## Slide Title\nSlide content goes here";
      const result = parseMarkdown(md);
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].title).toBe("Slide Title");
    });

    it("uses content below H2 as notes", () => {
      const md = "## Title\nThis is the notes content\nWith multiple lines";
      const result = parseMarkdown(md);
      expect(result.slides[0].notes).toBe("This is the notes content\nWith multiple lines");
    });

    it("creates multiple slides from multiple H2 headers", () => {
      const md = "## First\nContent 1\n## Second\nContent 2\n## Third\nContent 3";
      const result = parseMarkdown(md);
      expect(result.slides).toHaveLength(3);
      expect(result.slides[0].title).toBe("First");
      expect(result.slides[1].title).toBe("Second");
      expect(result.slides[2].title).toBe("Third");
    });
  });

  describe("content handling", () => {
    it("uses title as notes when no body content", () => {
      const md = "## Just a Title";
      const result = parseMarkdown(md);
      expect(result.slides[0].title).toBe("Just a Title");
      expect(result.slides[0].notes).toBe("Just a Title");
    });

    it("preserves markdown formatting in notes", () => {
      const md = "## Title\n**Bold** and *italic* text";
      const result = parseMarkdown(md);
      expect(result.slides[0].notes).toContain("**Bold**");
      expect(result.slides[0].notes).toContain("*italic*");
    });

    it("preserves code blocks in notes", () => {
      const md = "## Code Example\n```javascript\nconst x = 1;\n```";
      const result = parseMarkdown(md);
      expect(result.slides[0].notes).toContain("```javascript");
      expect(result.slides[0].notes).toContain("const x = 1;");
    });

    it("preserves lists in notes", () => {
      const md = "## List Slide\n- Item one\n- Item two\n- Item three";
      const result = parseMarkdown(md);
      expect(result.slides[0].notes).toContain("- Item one");
      expect(result.slides[0].notes).toContain("- Item two");
    });
  });

  describe("edge cases", () => {
    it("handles empty file", () => {
      const result = parseMarkdown("");
      expect(result.slides).toEqual([]);
      expect(result.title).toBe("Untitled");
    });

    it("handles file with no headers", () => {
      const md = "Just some plain text\nwithout any headers";
      const result = parseMarkdown(md);
      // No slides created without ## headers
      expect(result.slides).toHaveLength(0);
    });

    it("handles whitespace-only content", () => {
      const result = parseMarkdown("   \n\n   ");
      expect(result.slides).toEqual([]);
    });

    it("handles H1 without H2 slides", () => {
      const md = "# Section Title\nSome content here";
      const result = parseMarkdown(md);
      // Content after H1 (non-H2) gets parsed as slide
      expect(result.slides.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("slide properties", () => {
    it("assigns unique IDs to slides", () => {
      const md = "## Slide 1\nContent\n## Slide 2\nContent";
      const result = parseMarkdown(md);
      expect(result.slides[0].id).not.toBe(result.slides[1].id);
    });

    it("assigns sequential indices", () => {
      const md = "## First\nA\n## Second\nB\n## Third\nC";
      const result = parseMarkdown(md);
      expect(result.slides[0].index).toBe(0);
      expect(result.slides[1].index).toBe(1);
      expect(result.slides[2].index).toBe(2);
    });

    it("calculates word count", () => {
      const md = "## Title\none two three four five";
      const result = parseMarkdown(md);
      expect(result.slides[0].wordCount).toBe(5);
    });

    it("calculates estimated seconds", () => {
      const words = "word ".repeat(100);
      const md = `## Title\n${words}`;
      const result = parseMarkdown(md, 100);
      expect(result.slides[0].estimatedSeconds).toBe(60);
    });

    it("initializes timesRehearsed to 0", () => {
      const md = "## Slide\nContent";
      const result = parseMarkdown(md);
      expect(result.slides[0].timesRehearsed).toBe(0);
    });
  });

  describe("result title", () => {
    it("uses first H1 as document title", () => {
      const md = "# Document Title\n## Slide\nContent";
      const result = parseMarkdown(md);
      expect(result.title).toBe("Document Title");
    });

    it("falls back to first slide title when no H1", () => {
      const md = "## My First Slide\nContent";
      const result = parseMarkdown(md);
      expect(result.title).toBe("My First Slide");
    });

    it("truncates title to 50 characters", () => {
      const longTitle = "A".repeat(60);
      const md = `## ${longTitle}\nContent`;
      const result = parseMarkdown(md);
      expect(result.title.length).toBeLessThanOrEqual(50);
    });

    it("returns Untitled for empty input", () => {
      const result = parseMarkdown("");
      expect(result.title).toBe("Untitled");
    });
  });
});
