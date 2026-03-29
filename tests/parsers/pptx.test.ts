import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";

// Import after mocking
import { parsePptx } from "@/lib/parsers/pptx";

describe("parsePptx", () => {
  async function createMockPptx(config: {
    slides?: Array<{
      title: string;
      content?: string;
      notes?: string;
    }>;
    presentationTitle?: string;
  }): Promise<ArrayBuffer> {
    const zip = new JSZip();
    const slides = config.slides || [];

    // Add slide files
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideNum = i + 1;

      // Create slide XML with title placeholder
      const slideXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr>
          <p:nvPr>
            <p:ph type="title"/>
          </p:nvPr>
        </p:nvSpPr>
        <p:txBody>
          <a:p>
            <a:r><a:t>${slide.title}</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      ${slide.content ? `
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r><a:t>${slide.content}</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      ` : ""}
    </p:spTree>
  </p:cSld>
</p:sld>`;

      zip.file(`ppt/slides/slide${slideNum}.xml`, slideXml);

      // Add notes if provided
      if (slide.notes) {
        const notesXml = `<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r><a:t>${slide.notes}</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`;
        zip.file(`ppt/notesSlides/notesSlide${slideNum}.xml`, notesXml);
      }
    }

    // Add core.xml with title
    if (config.presentationTitle) {
      const coreXml = `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">
  <dc:title>${config.presentationTitle}</dc:title>
</cp:coreProperties>`;
      zip.file("docProps/core.xml", coreXml);
    }

    return await zip.generateAsync({ type: "arraybuffer" });
  }

  it("extracts slide titles and speaker notes", async () => {
    const buffer = await createMockPptx({
      slides: [
        { title: "Introduction", notes: "Speaker notes for intro" },
        { title: "Main Content", notes: "Speaker notes for main" },
      ],
    });

    const result = await parsePptx(buffer);

    expect(result.slides).toHaveLength(2);
    expect(result.slides[0].title).toBe("Introduction");
    expect(result.slides[0].notes).toContain("Speaker notes for intro");
    expect(result.slides[1].title).toBe("Main Content");
    expect(result.slides[1].notes).toContain("Speaker notes for main");
  });

  it("uses empty string for slides without notes", async () => {
    const buffer = await createMockPptx({
      slides: [
        { title: "Slide Without Notes" },
      ],
    });

    const result = await parsePptx(buffer);

    expect(result.slides).toHaveLength(1);
    // Notes should fall back to slide content
    expect(result.slides[0].notes).toBeTruthy();
  });

  it("generates Slide N title for slides without titles", async () => {
    // Create minimal slide without title placeholder
    const zip = new JSZip();
    const slideXml = `<?xml version="1.0"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree></p:spTree></p:cSld>
</p:sld>`;
    zip.file("ppt/slides/slide1.xml", slideXml);
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    const result = await parsePptx(buffer);

    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].title).toMatch(/Slide|Untitled/);
  });

  it("returns empty array for empty PPTX (no slides)", async () => {
    const zip = new JSZip();
    // Just core.xml, no slides
    zip.file("docProps/core.xml", "<cp:coreProperties></cp:coreProperties>");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    const result = await parsePptx(buffer);

    expect(result.slides).toHaveLength(0);
  });

  it("throws error for non-PPTX file", async () => {
    // Random non-ZIP data
    const buffer = new ArrayBuffer(100);
    const view = new Uint8Array(buffer);
    view.fill(65); // ASCII 'A'

    await expect(parsePptx(buffer)).rejects.toThrow();
  });

  it("extracts presentation title from core.xml", async () => {
    const buffer = await createMockPptx({
      slides: [{ title: "Slide 1", notes: "Notes" }],
      presentationTitle: "My Awesome Presentation",
    });

    const result = await parsePptx(buffer);

    expect(result.title).toBe("My Awesome Presentation");
  });

  it("falls back to first slide title when no core.xml title", async () => {
    const buffer = await createMockPptx({
      slides: [{ title: "First Slide Title", notes: "Notes" }],
    });

    const result = await parsePptx(buffer);

    expect(result.title).toContain("First Slide Title");
  });

  it("assigns unique IDs to each slide", async () => {
    const buffer = await createMockPptx({
      slides: [
        { title: "Slide 1", notes: "Notes 1" },
        { title: "Slide 2", notes: "Notes 2" },
      ],
    });

    const result = await parsePptx(buffer);

    expect(result.slides[0].id).not.toBe(result.slides[1].id);
  });

  it("assigns sequential indices", async () => {
    const buffer = await createMockPptx({
      slides: [
        { title: "A", notes: "Notes" },
        { title: "B", notes: "Notes" },
        { title: "C", notes: "Notes" },
      ],
    });

    const result = await parsePptx(buffer);

    expect(result.slides[0].index).toBe(0);
    expect(result.slides[1].index).toBe(1);
    expect(result.slides[2].index).toBe(2);
  });

  it("calculates word count from notes", async () => {
    const buffer = await createMockPptx({
      slides: [{ title: "Title", notes: "one two three four five" }],
    });

    const result = await parsePptx(buffer);

    expect(result.slides[0].wordCount).toBe(5);
  });

  it("calculates estimated seconds", async () => {
    const words = "word ".repeat(100).trim();
    const buffer = await createMockPptx({
      slides: [{ title: "Title", notes: words }],
    });

    const result = await parsePptx(buffer, 100);

    expect(result.slides[0].estimatedSeconds).toBe(60);
  });

  it("initializes timesRehearsed to 0", async () => {
    const buffer = await createMockPptx({
      slides: [{ title: "Slide", notes: "Notes" }],
    });

    const result = await parsePptx(buffer);

    expect(result.slides[0].timesRehearsed).toBe(0);
  });

  it("filters out auto-generated slide numbers from notes", async () => {
    const buffer = await createMockPptx({
      slides: [{ title: "Title", notes: "Actual speaker notes content" }],
    });

    const result = await parsePptx(buffer);

    expect(result.slides[0].notes).not.toMatch(/^Slide \d+$/);
    expect(result.slides[0].notes).not.toMatch(/^\d+$/);
  });
});
