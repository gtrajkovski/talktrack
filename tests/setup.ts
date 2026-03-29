import { vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { MockSpeechSynthesis, MockUtterance, MockVoice } from './mocks/speechSynthesis';
import { MockSpeechRecognition } from './mocks/speechRecognition';
import { MockAudioContext, MockGainNode, MockOscillatorNode, MockBufferSourceNode } from './mocks/audioContext';

// Shared mock instances
let mockSynthesis: MockSpeechSynthesis;
let MockRecognitionClass: typeof MockSpeechRecognition;
let MockAudioContextClass: typeof MockAudioContext;

// Install mocks globally before each test
beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();

  // SpeechSynthesis
  mockSynthesis = new MockSpeechSynthesis();
  mockSynthesis.simulatedDuration = 0; // Instant for tests
  Object.defineProperty(globalThis, 'speechSynthesis', {
    value: mockSynthesis,
    writable: true,
    configurable: true,
  });
  (globalThis as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance;

  // SpeechRecognition
  MockRecognitionClass = MockSpeechRecognition;
  (globalThis as Record<string, unknown>).SpeechRecognition = MockRecognitionClass;
  (globalThis as Record<string, unknown>).webkitSpeechRecognition = MockRecognitionClass;

  // AudioContext
  MockAudioContextClass = MockAudioContext;
  (globalThis as Record<string, unknown>).AudioContext = MockAudioContextClass;
  (globalThis as Record<string, unknown>).webkitAudioContext = MockAudioContextClass;

  // Navigator
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      onLine: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      language: 'en-US',
      languages: ['en-US', 'en'],
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [],
          getAudioTracks: () => [],
        }),
        enumerateDevices: vi.fn().mockResolvedValue([]),
      },
      permissions: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    },
    writable: true,
    configurable: true,
  });

  // Window location
  Object.defineProperty(globalThis, 'location', {
    value: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    writable: true,
    configurable: true,
  });

  // MediaRecorder
  const MockMediaRecorder = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    ondataavailable: null,
    onstop: null,
    onerror: null,
    state: 'inactive',
  })) as unknown as typeof MediaRecorder;
  (MockMediaRecorder as unknown as { isTypeSupported: ReturnType<typeof vi.fn> }).isTypeSupported = vi.fn().mockReturnValue(true);
  (globalThis as Record<string, unknown>).MediaRecorder = MockMediaRecorder;

  // Blob and URL
  class MockBlob {
    parts: BlobPart[];
    options: BlobPropertyBag | undefined;
    size: number;
    type: string;
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      this.parts = parts || [];
      this.options = options;
      this.size = 0;
      this.type = options?.type || '';
    }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)); }
    text() { return Promise.resolve(''); }
    slice() { return new MockBlob() as unknown as Blob; }
    stream() { return new ReadableStream(); }
  }
  (globalThis as Record<string, unknown>).Blob = MockBlob;

  (globalThis as Record<string, unknown>).URL = {
    createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: vi.fn(),
  };

  // Console warnings/errors - suppress during tests but track them
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  // Clear any IndexedDB data between tests
  indexedDB.deleteDatabase('talktrack-db');
});

// Export for tests that need to interact with the mocks directly
export {
  mockSynthesis,
  MockRecognitionClass,
  MockAudioContextClass,
  MockSpeechSynthesis,
  MockUtterance,
  MockVoice,
  MockSpeechRecognition,
  MockAudioContext,
  MockGainNode,
  MockOscillatorNode,
  MockBufferSourceNode,
};

// Export a helper to get fresh mock synthesis instance
export function getMockSynthesis(): MockSpeechSynthesis {
  return globalThis.speechSynthesis as unknown as MockSpeechSynthesis;
}

// Export a helper to create mock recognition instance
export function createMockRecognition(): MockSpeechRecognition {
  return new MockSpeechRecognition();
}

// Export a helper to create mock audio context
export function createMockAudioContext(): MockAudioContext {
  return new MockAudioContext();
}
