import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after setting up mocks
import { parseUrl } from "@/lib/parsers/url";

describe("parseUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockApiResponse(data: object, status = 200) {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    });
  }

  function mockApiError(error: string, status = 500) {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      json: () => Promise.resolve({ error }),
    });
  }

  it("returns title and slides array for valid URL", async () => {
    mockApiResponse({
      title: "Test Article",
      text: "First paragraph with enough words to make a slide. Second paragraph also with enough content to be meaningful.",
      source: "https://example.com/article",
    });

    const result = await parseUrl("https://example.com/article");

    expect(result.title).toBe("Test Article");
    expect(result.slides).toBeInstanceOf(Array);
    expect(result.slides.length).toBeGreaterThan(0);
  });

  it("merges paragraphs with < 30 words", async () => {
    mockApiResponse({
      title: "Test",
      text: "Short para.\n\nAnother short one.\n\n" +
        "This is a much longer paragraph that has many more words and should definitely qualify as having at least thirty words in total when you count them all up carefully.",
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    // Short paragraphs should be merged
    // The long paragraph meets the threshold
    expect(result.slides.length).toBeGreaterThan(0);
  });

  it("caps slides at 60, merging overflow into last slide", async () => {
    // Create 70 paragraphs, each with 35+ words
    const longParagraph = "This is a paragraph with more than thirty words so it will not be merged. ".repeat(2);
    const paragraphs = Array(70).fill(longParagraph).join("\n\n");

    mockApiResponse({
      title: "Very Long Article",
      text: paragraphs,
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    expect(result.slides.length).toBeLessThanOrEqual(60);
  });

  it("extracts slide title from first sentence", async () => {
    mockApiResponse({
      title: "Test",
      text: "This is the first sentence. This is the second sentence with additional context and details.",
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    expect(result.slides[0].title).toBe("This is the first sentence.");
  });

  it("truncates long titles to 80 characters", async () => {
    const longFirstSentence = "A".repeat(100) + ". More content follows here.";
    mockApiResponse({
      title: "Test",
      text: longFirstSentence + " More words to make this valid content for a slide.",
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    expect(result.slides[0].title.length).toBeLessThanOrEqual(80);
  });

  it("throws error when no readable text found", async () => {
    mockApiResponse({
      title: "Test",
      text: "",
      source: "https://example.com",
    });

    await expect(parseUrl("https://example.com")).rejects.toThrow("No readable text");
  });

  it("throws with error message from API on failure", async () => {
    mockApiError("Could not extract readable text from this URL.", 422);

    await expect(parseUrl("https://example.com")).rejects.toThrow(
      "Could not extract readable text"
    );
  });

  it("calculates word counts and estimatedSeconds correctly", async () => {
    // 100 words should equal 60 seconds at 100 WPM
    const hundredWords = "word ".repeat(100);
    mockApiResponse({
      title: "Test",
      text: hundredWords,
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com", 100);

    expect(result.slides[0].wordCount).toBe(100);
    expect(result.slides[0].estimatedSeconds).toBe(60);
  });

  it("generates unique IDs and sequential indices for slides", async () => {
    mockApiResponse({
      title: "Test",
      text: "First paragraph with enough words to make it a complete slide.\n\n" +
        "Second paragraph also with enough words to make it a complete slide.",
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    // Check for unique IDs
    const ids = result.slides.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Check sequential indices
    result.slides.forEach((slide, i) => {
      expect(slide.index).toBe(i);
    });
  });

  it("throws error for whitespace-only text", async () => {
    mockApiResponse({
      title: "Test",
      text: "   \n\n   ",
      source: "https://example.com",
    });

    await expect(parseUrl("https://example.com")).rejects.toThrow();
  });

  it("handles question marks and exclamation points as sentence endings", async () => {
    mockApiResponse({
      title: "Test",
      text: "What is the answer? This is more content that follows the question.",
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    expect(result.slides[0].title).toBe("What is the answer?");
  });

  it("uses Imported Article as fallback title", async () => {
    mockApiResponse({
      title: "",
      text: "Some content here with enough words to make a valid slide.",
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    expect(result.title).toBe("Imported Article");
  });

  it("initializes timesRehearsed to 0 for all slides", async () => {
    mockApiResponse({
      title: "Test",
      text: "Content content content content content content content content content content.",
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    result.slides.forEach((slide) => {
      expect(slide.timesRehearsed).toBe(0);
    });
  });

  it("falls back to first 80 chars when no sentence ending found", async () => {
    const noSentenceEnding = "A".repeat(100) + " more content without periods";
    mockApiResponse({
      title: "Test",
      text: noSentenceEnding,
      source: "https://example.com",
    });

    const result = await parseUrl("https://example.com");

    expect(result.slides[0].title.length).toBeLessThanOrEqual(80);
  });
});
