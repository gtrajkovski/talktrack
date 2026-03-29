import { vi } from 'vitest';

// Mock SpeechSynthesisUtterance
export class MockUtterance {
  text: string;
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  voice: MockVoice | null = null;
  lang: string = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  onboundary: ((e: { charIndex: number; name: string }) => void) | null = null;

  constructor(text: string = '') {
    this.text = text;
  }

  // Add event listener support for compatibility
  addEventListener(event: string, handler: (...args: unknown[]) => void) {
    if (event === 'start') this.onstart = handler as () => void;
    if (event === 'end') this.onend = handler as () => void;
    if (event === 'error') this.onerror = handler as (e: { error: string }) => void;
    if (event === 'pause') this.onpause = handler as () => void;
    if (event === 'resume') this.onresume = handler as () => void;
    if (event === 'boundary') this.onboundary = handler as (e: { charIndex: number; name: string }) => void;
  }

  removeEventListener() {
    // No-op for tests
  }
}

export class MockVoice {
  voiceURI: string;
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;

  constructor(name: string, lang: string = 'en-US', isDefault = false) {
    this.voiceURI = `mock://${name}`;
    this.name = name;
    this.lang = lang;
    this.localService = true;
    this.default = isDefault;
  }
}

export class MockSpeechSynthesis {
  speaking = false;
  pending = false;
  paused = false;
  private queue: MockUtterance[] = [];
  private currentUtterance: MockUtterance | null = null;
  private voices: MockVoice[] = [
    new MockVoice('Samantha', 'en-US', true),
    new MockVoice('Daniel', 'en-GB'),
    new MockVoice('Google US English', 'en-US'),
    new MockVoice('Microsoft Zira', 'en-US'),
    new MockVoice('Fred', 'en-US'), // Low quality
  ];
  private voicesChangedListeners: (() => void)[] = [];

  // Control: how long (ms) each utterance takes. Set to 0 for instant in tests.
  simulatedDuration = 0;

  speak(utterance: MockUtterance) {
    this.queue.push(utterance);
    this.pending = this.queue.length > 1;
    if (!this.speaking) {
      this.processQueue();
    }
  }

  cancel() {
    this.queue = [];
    if (this.currentUtterance) {
      this.speaking = false;
      this.pending = false;
      this.currentUtterance = null;
    }
  }

  pause() {
    if (this.speaking) {
      this.paused = true;
      this.currentUtterance?.onpause?.();
    }
  }

  resume() {
    if (this.paused) {
      this.paused = false;
      this.currentUtterance?.onresume?.();
    }
  }

  getVoices(): MockVoice[] {
    return this.voices;
  }

  addEventListener(event: string, handler: () => void) {
    if (event === 'voiceschanged') {
      this.voicesChangedListeners.push(handler);
    }
  }

  removeEventListener(event: string, handler: () => void) {
    if (event === 'voiceschanged') {
      this.voicesChangedListeners = this.voicesChangedListeners.filter(h => h !== handler);
    }
  }

  // Test helper: trigger voiceschanged
  triggerVoicesChanged() {
    this.voicesChangedListeners.forEach(h => h());
  }

  // Test helper: simulate an error on next speak()
  private nextError: string | null = null;
  simulateError(error: string) {
    this.nextError = error;
  }

  // Test helper: add custom voices
  setVoices(voices: MockVoice[]) {
    this.voices = voices;
  }

  private async processQueue() {
    if (this.queue.length === 0) return;
    const utterance = this.queue.shift()!;
    this.currentUtterance = utterance;
    this.speaking = true;
    this.pending = this.queue.length > 0;

    if (this.nextError) {
      const error = this.nextError;
      this.nextError = null;
      this.speaking = false;
      utterance.onerror?.({ error });
      return;
    }

    utterance.onstart?.();

    if (this.simulatedDuration > 0) {
      await new Promise(r => setTimeout(r, this.simulatedDuration));
    }

    this.speaking = false;
    this.currentUtterance = null;
    utterance.onend?.();
    this.processQueue(); // Process next in queue
  }
}

// Create singleton instance for tests
export const mockSpeechSynthesis = new MockSpeechSynthesis();
