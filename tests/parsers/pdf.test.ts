import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pdfjs-dist
const mockGetDocument = vi.fn();

vi.mock("pdfjs-dist", () => ({
  version: "4.0.0",
  GlobalWorkerOptions: {
    workerSrc: "",
  },
  getDocument: (options: { data: ArrayBuffer }) => mockGetDocument(options),
}));

// Import after mocking
import { parsePdf } from "@/lib/parsers/pdf";

describe("parsePdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockFile(name: string, content: ArrayBuffer): File {
    return new File([content], name, { type: "application/pdf" });
  }

  function setupMockPdf(pages: Array<{ text: string }>) {
    const mockPdf = {
      numPages: pages.length,
      getPage: vi.fn().mockImplementation((pageNum: number) =>
        Promise.resolve({
          getTextContent: vi.fn().mockResolvedValue({
            // Simulate pdfjs returning text line by line
            items: pages[pageNum - 1].text.split("\n").map((line, i, arr) => ({
              str: line,
              hasEOL: i < arr.length - 1,
            })),
          }),
        })
      ),
    };
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve(mockPdf),
    });
    return mockPdf;
  }

  it("parses a valid PDF with multiple pages into slides", async () => {
    // Each page needs 20+ words to avoid being merged
    const page1Content = "Page 1 Title\n" + "content ".repeat(25);
    const page2Content = "Page 2 Title\n" + "more content ".repeat(25);
    setupMockPdf([
      { text: page1Content },
      { text: page2Content },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.title).toBe("test");
    expect(result.slides).toHaveLength(2);
    expect(result.slides[0].title).toBe("Page 1 Title");
    expect(result.slides[1].title).toBe("Page 2 Title");
  });

  it("extracts title from filename (removes .pdf extension and replaces dashes/underscores)", async () => {
    setupMockPdf([{ text: "Content\nMore content here to make it valid" }]);

    const file = createMockFile("my-presentation_2024.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.title).toBe("my presentation 2024");
  });

  it("merges short pages (< 20 words) with previous page", async () => {
    setupMockPdf([
      { text: "First Page Title\nThis is a longer page with enough content to stand alone as its own slide" },
      { text: "Short page" }, // Less than 20 words, should merge
      { text: "Third Page Title\nThis is another longer page with plenty of content for a full slide" },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    // Short page should be merged with first page
    expect(result.slides.length).toBeLessThan(3);
  });

  it("uses first line as slide title", async () => {
    setupMockPdf([
      { text: "The Main Title\nThis is the body content\nAnd more content" },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.slides[0].title).toBe("The Main Title");
  });

  it("truncates long titles to 80 characters", async () => {
    const longTitle = "A".repeat(100);
    setupMockPdf([
      { text: `${longTitle}\nContent below the title` },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.slides[0].title.length).toBeLessThanOrEqual(80);
  });

  it("throws error for empty PDF", async () => {
    setupMockPdf([]);

    const file = createMockFile("empty.pdf", new ArrayBuffer(100));

    await expect(parsePdf(file)).rejects.toThrow("empty or image-only");
  });

  it("throws error for PDF with only whitespace", async () => {
    setupMockPdf([{ text: "   \n\n   " }]);

    const file = createMockFile("whitespace.pdf", new ArrayBuffer(100));

    // The whitespace-only page will be filtered, resulting in empty
    await expect(parsePdf(file)).rejects.toThrow();
  });

  it("calculates word count correctly", async () => {
    setupMockPdf([
      { text: "Title\none two three four five" }, // 5 words in notes
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.slides[0].wordCount).toBe(5);
  });

  it("calculates estimated seconds based on word count", async () => {
    setupMockPdf([
      { text: "Title\n" + "word ".repeat(100) }, // 100 words in notes
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file, 100); // 100 WPM

    // 100 words at 100 WPM = 60 seconds
    expect(result.slides[0].estimatedSeconds).toBe(60);
  });

  it("generates unique IDs for each slide", async () => {
    // Each page needs 20+ words to avoid merging
    setupMockPdf([
      { text: "Page 1\n" + "word ".repeat(25) },
      { text: "Page 2\n" + "word ".repeat(25) },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.slides[0].id).not.toBe(result.slides[1].id);
    expect(result.slides[0].id).toBeTruthy();
    expect(result.slides[1].id).toBeTruthy();
  });

  it("assigns sequential indices to slides", async () => {
    // Each page needs 20+ words to avoid merging
    setupMockPdf([
      { text: "Page 1\n" + "content ".repeat(25) },
      { text: "Page 2\n" + "content ".repeat(25) },
      { text: "Page 3\n" + "content ".repeat(25) },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.slides[0].index).toBe(0);
    expect(result.slides[1].index).toBe(1);
    expect(result.slides[2].index).toBe(2);
  });

  it("handles pages with only a title (no separate notes)", async () => {
    setupMockPdf([
      { text: "Just a title line with no content below it to create a body for this slide" },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    // Notes should be the same as title when no separate body
    expect(result.slides[0].title).toBeTruthy();
    expect(result.slides[0].notes).toBeTruthy();
  });

  it("initializes timesRehearsed to 0", async () => {
    setupMockPdf([
      { text: "Title\nContent content content content content" },
    ]);

    const file = createMockFile("test.pdf", new ArrayBuffer(100));
    const result = await parsePdf(file);

    expect(result.slides[0].timesRehearsed).toBe(0);
  });
});
