import { describe, it, expect } from "vitest";
import { parseText } from "@/lib/parsers/text";

describe("parseText", () => {
  describe("basic parsing", () => {
    it("returns empty slides array for empty string", () => {
      const result = parseText("");
      expect(result.slides).toEqual([]);
      expect(result.title).toBe("Untitled");
    });

    it("parses single line as one slide", () => {
      const result = parseText("Single slide content");
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].title).toBe("Single slide content");
      // When there's no body, notes equals title
      expect(result.slides[0].notes).toBe("Single slide content");
    });

    it("parses multiple paragraphs as separate slides", () => {
      const text = "First slide title\n\nSecond slide title\n\nThird slide title";
      const result = parseText(text);
      expect(result.slides).toHaveLength(3);
      expect(result.slides[0].title).toBe("First slide title");
      expect(result.slides[1].title).toBe("Second slide title");
      expect(result.slides[2].title).toBe("Third slide title");
    });

    it("uses first line as title and rest as notes", () => {
      const text = "Slide Title\nThis is the body content\nWith multiple lines";
      const result = parseText(text);
      expect(result.slides[0].title).toBe("Slide Title");
      expect(result.slides[0].notes).toBe("This is the body content\nWith multiple lines");
    });
  });

  describe("whitespace handling", () => {
    it("trims leading and trailing whitespace", () => {
      const text = "   \n\nSlide content\n\n   ";
      const result = parseText(text);
      expect(result.slides).toHaveLength(1);
      expect(result.slides[0].title).toBe("Slide content");
    });

    it("handles tabs in content", () => {
      const text = "Title\t\n\tBody with tabs";
      const result = parseText(text);
      expect(result.slides).toHaveLength(1);
    });

    it("handles Windows line endings (\\r\\n)", () => {
      const text = "First slide\r\n\r\nSecond slide";
      const result = parseText(text);
      expect(result.slides).toHaveLength(2);
    });

    it("does not create empty slides from trailing newlines", () => {
      const text = "Slide content\n\n\n\n";
      const result = parseText(text);
      expect(result.slides).toHaveLength(1);
    });

    it("does not create empty slides from multiple blank lines", () => {
      const text = "First slide\n\n\n\n\nSecond slide";
      const result = parseText(text);
      expect(result.slides).toHaveLength(2);
    });
  });

  describe("unicode support", () => {
    it("preserves emoji content", () => {
      const text = "Title with emoji 🎉\nBody content 👍";
      const result = parseText(text);
      expect(result.slides[0].title).toBe("Title with emoji 🎉");
      expect(result.slides[0].notes).toBe("Body content 👍");
    });

    it("preserves accented characters", () => {
      const text = "Café résumé naïve\nÜber Straße München";
      const result = parseText(text);
      expect(result.slides[0].title).toBe("Café résumé naïve");
      expect(result.slides[0].notes).toBe("Über Straße München");
    });

    it("preserves CJK characters", () => {
      const text = "日本語タイトル\n中文内容\n한국어";
      const result = parseText(text);
      expect(result.slides[0].title).toBe("日本語タイトル");
      expect(result.slides[0].notes).toContain("中文内容");
    });

    it("preserves Arabic and Hebrew", () => {
      const text = "مرحبا العالم\nשלום עולם";
      const result = parseText(text);
      expect(result.slides[0].title).toBe("مرحبا العالم");
    });
  });

  describe("section markers", () => {
    it("parses # Section header", () => {
      const text = "# Introduction\nSlide content";
      const result = parseText(text);
      expect(result.slides[0].sectionName).toBe("Introduction");
      expect(result.slides[0].sectionId).toBeTruthy();
    });

    it("parses --- divider as unnamed section", () => {
      const text = "First slide\n\n---\nSecond slide in new section";
      const result = parseText(text);
      expect(result.slides.length).toBeGreaterThan(0);
    });

    it("parses === divider as unnamed section", () => {
      const text = "First slide\n\n===\nSecond slide in new section";
      const result = parseText(text);
      expect(result.slides.length).toBeGreaterThan(0);
    });

    it("assigns same sectionId to slides within section", () => {
      const text = "# Section A\nSlide 1\n\nSlide 2\n\n# Section B\nSlide 3";
      const result = parseText(text);
      expect(result.slides[0].sectionId).toBe(result.slides[1].sectionId);
      expect(result.slides[0].sectionId).not.toBe(result.slides[2].sectionId);
    });
  });

  describe("word count and timing", () => {
    it("calculates word count correctly", () => {
      const text = "Title\none two three four five";
      const result = parseText(text);
      expect(result.slides[0].wordCount).toBe(5);
    });

    it("calculates estimated seconds based on WPM", () => {
      // 100 words at 100 WPM = 60 seconds
      const words = "word ".repeat(100);
      const text = `Title\n${words}`;
      const result = parseText(text, 100);
      expect(result.slides[0].estimatedSeconds).toBe(60);
    });

    it("uses custom wordsPerMinute parameter", () => {
      const words = "word ".repeat(50);
      const text = `Title\n${words}`;
      const result = parseText(text, 50); // 50 WPM
      // 50 words at 50 WPM = 60 seconds
      expect(result.slides[0].estimatedSeconds).toBe(60);
    });
  });

  describe("slide properties", () => {
    it("assigns unique IDs to each slide", () => {
      const text = "Slide 1\n\nSlide 2\n\nSlide 3";
      const result = parseText(text);
      const ids = result.slides.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("assigns sequential indices starting from 0", () => {
      const text = "First\n\nSecond\n\nThird";
      const result = parseText(text);
      expect(result.slides[0].index).toBe(0);
      expect(result.slides[1].index).toBe(1);
      expect(result.slides[2].index).toBe(2);
    });

    it("initializes timesRehearsed to 0", () => {
      const text = "Slide content";
      const result = parseText(text);
      expect(result.slides[0].timesRehearsed).toBe(0);
    });
  });

  describe("result title", () => {
    it("uses first slide title as result title", () => {
      const text = "My Presentation Title\nBody content\n\nSlide 2";
      const result = parseText(text);
      expect(result.title).toBe("My Presentation Title");
    });

    it("truncates result title to 50 characters", () => {
      const longTitle = "A".repeat(60);
      const result = parseText(longTitle);
      expect(result.title.length).toBeLessThanOrEqual(50);
    });

    it("returns Untitled for empty input", () => {
      const result = parseText("");
      expect(result.title).toBe("Untitled");
    });
  });
});
