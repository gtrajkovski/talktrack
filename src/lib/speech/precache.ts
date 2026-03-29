/**
 * Audio Pre-Cache Module
 *
 * Pre-generates audio for upcoming chunks to eliminate playback latency.
 * Works with ElevenLabs and VoiceBox Clone backends.
 */

import type { Chunk } from "@/lib/utils/chunker";

export interface PrecacheConfig {
  generateAudio: (text: string, signal?: AbortSignal) => Promise<string>;
  lookahead: number; // Number of chunks ahead to cache (default: 2)
}

export interface PrecacheEntry {
  chunkId: string;
  text: string;
  status: "pending" | "generating" | "cached" | "failed";
  blobUrl?: string;
  abortController?: AbortController;
  startedAt?: number;
}

// Module state
let config: PrecacheConfig | null = null;
const queue = new Map<string, PrecacheEntry>();
let isActive = false;

/**
 * Configure the pre-cache system with a generator function
 */
export function configure(newConfig: PrecacheConfig): void {
  config = newConfig;
  isActive = true;
}

/**
 * Check if pre-cache is configured and active
 */
export function isConfigured(): boolean {
  return isActive && config !== null;
}

/**
 * Queue chunks for pre-caching based on current position
 * Caches chunks from currentIndex+1 to currentIndex+lookahead
 */
export function queueChunks(chunks: Chunk[], currentIndex: number): void {
  if (!config) return;

  const { lookahead } = config;

  // Determine which chunks to pre-cache
  const startIdx = currentIndex + 1;
  const endIdx = Math.min(currentIndex + lookahead + 1, chunks.length);

  for (let i = startIdx; i < endIdx; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;

    // Skip if already cached or generating
    const existing = queue.get(chunk.id);
    if (existing && (existing.status === "cached" || existing.status === "generating")) {
      continue;
    }

    // Add to queue and start generation
    const entry: PrecacheEntry = {
      chunkId: chunk.id,
      text: chunk.text,
      status: "pending",
    };
    queue.set(chunk.id, entry);

    // Start async generation
    generateAudioForEntry(entry);
  }
}

/**
 * Generate audio for a queue entry
 */
async function generateAudioForEntry(entry: PrecacheEntry): Promise<void> {
  if (!config) return;

  const abortController = new AbortController();
  entry.abortController = abortController;
  entry.status = "generating";
  entry.startedAt = Date.now();

  try {
    const blobUrl = await config.generateAudio(entry.text, abortController.signal);

    // Check if entry is still in queue (not aborted)
    if (queue.has(entry.chunkId) && entry.status === "generating") {
      entry.status = "cached";
      entry.blobUrl = blobUrl;
      entry.abortController = undefined;
    }
  } catch (error) {
    // Check if it was an abort
    if (error instanceof Error && error.name === "AbortError") {
      // Silently ignore abort
      return;
    }

    // Mark as failed
    if (queue.has(entry.chunkId)) {
      entry.status = "failed";
      entry.abortController = undefined;
      console.warn(`Precache failed for chunk ${entry.chunkId}:`, error);
    }
  }
}

/**
 * Get cached audio URL for a chunk
 * Returns null if not cached
 */
export function getCached(chunkId: string): string | null {
  const entry = queue.get(chunkId);
  if (entry && entry.status === "cached" && entry.blobUrl) {
    return entry.blobUrl;
  }
  return null;
}

/**
 * Get cached audio URL by text content
 * Useful when chunk IDs change but content stays same
 */
export function getCachedByText(text: string): string | null {
  for (const entry of queue.values()) {
    if (entry.text === text && entry.status === "cached" && entry.blobUrl) {
      return entry.blobUrl;
    }
  }
  return null;
}

/**
 * Abort all pending/generating entries and clear the queue
 */
export function clear(): void {
  for (const entry of queue.values()) {
    if (entry.abortController) {
      entry.abortController.abort();
    }
    // Revoke blob URLs to free memory
    if (entry.blobUrl) {
      URL.revokeObjectURL(entry.blobUrl);
    }
  }
  queue.clear();
}

/**
 * Abort all in-flight requests (but keep cached results)
 */
export function abortAll(): void {
  for (const entry of queue.values()) {
    if (entry.abortController && entry.status === "generating") {
      entry.abortController.abort();
      entry.status = "failed";
      entry.abortController = undefined;
    }
  }
}

/**
 * Deactivate pre-cache (clear config and queue)
 */
export function deactivate(): void {
  clear();
  config = null;
  isActive = false;
}

/**
 * Get queue statistics
 */
export function getStats(): {
  total: number;
  pending: number;
  generating: number;
  cached: number;
  failed: number;
} {
  let pending = 0;
  let generating = 0;
  let cached = 0;
  let failed = 0;

  for (const entry of queue.values()) {
    switch (entry.status) {
      case "pending":
        pending++;
        break;
      case "generating":
        generating++;
        break;
      case "cached":
        cached++;
        break;
      case "failed":
        failed++;
        break;
    }
  }

  return {
    total: queue.size,
    pending,
    generating,
    cached,
    failed,
  };
}

/**
 * Check if a chunk is being generated
 */
export function isGenerating(chunkId: string): boolean {
  const entry = queue.get(chunkId);
  return entry?.status === "generating";
}

/**
 * Get the entry for a chunk (for debugging)
 */
export function getEntry(chunkId: string): PrecacheEntry | undefined {
  return queue.get(chunkId);
}
