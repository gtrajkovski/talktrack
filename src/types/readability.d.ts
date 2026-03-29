declare module "@mozilla/readability" {
  export class Readability {
    constructor(document: Document, options?: Record<string, unknown>);
    parse(): {
      title: string;
      content: string; // HTML string
      textContent: string; // plain text
      length: number;
      excerpt: string;
      byline: string | null;
      dir: string | null;
      siteName: string | null;
      lang: string | null;
    } | null;
  }
}
