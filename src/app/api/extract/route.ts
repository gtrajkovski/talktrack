import { NextRequest, NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Basic URL validation
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Only allow http/https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP/HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    // Fetch the page with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; TalkTrack/1.0; +https://talktrack.app)",
          Accept: "text/html,application/xhtml+xml,text/plain",
        },
      });
    } catch (fetchError) {
      clearTimeout(timeout);
      if ((fetchError as Error).name === "AbortError") {
        return NextResponse.json(
          { error: "Request timed out. The URL took too long to respond." },
          { status: 504 }
        );
      }
      throw fetchError;
    }

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${response.status})` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Use linkedom to create a DOM (server-side, no jsdom needed)
    const { document } = parseHTML(html);

    // Use Readability to extract the article content
    const reader = new Readability(document as unknown as Document, {
      charThreshold: 50,
    });
    const article = reader.parse();

    if (
      !article ||
      !article.textContent ||
      article.textContent.trim().length < 50
    ) {
      // Fallback: if Readability fails, try to extract any text content
      const bodyText = document.body?.textContent?.trim() || "";
      if (bodyText.length < 50) {
        return NextResponse.json(
          {
            error:
              "Could not extract readable text from this URL. Try pasting the content directly.",
          },
          { status: 422 }
        );
      }
      return NextResponse.json({
        title: document.title || parsed.hostname,
        text: bodyText.substring(0, 50000), // Cap at 50k chars
        excerpt: bodyText.substring(0, 200),
        source: url,
      });
    }

    return NextResponse.json({
      title: article.title || parsed.hostname,
      text: article.textContent.substring(0, 50000), // Cap at 50k chars
      excerpt: article.excerpt || article.textContent.substring(0, 200),
      byline: article.byline,
      siteName: article.siteName,
      source: url,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. The URL took too long to respond." },
        { status: 504 }
      );
    }
    console.error("URL extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract content from URL." },
      { status: 500 }
    );
  }
}
