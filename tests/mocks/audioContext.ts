import { vi } from 'vitest';

export class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
    setTargetAtTime: vi.fn().mockReturnThis(),
    cancelScheduledValues: vi.fn().mockReturnThis(),
  };
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

export class MockOscillatorNode {
  frequency = {
    value: 440,
    setValueAtTime: vi.fn().mockReturnThis(),
    linearRampToValueAtTime: vi.fn().mockReturnThis(),
    exponentialRampToValueAtTime: vi.fn().mockReturnThis(),
  };
  type: OscillatorType = 'sine';
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
  disconnect = vi.fn();

  // Test helper: simulate oscillator finishing
  simulateEnd() {
    this.onended?.();
  }
}

export class MockBufferSourceNode {
  buffer: AudioBuffer | null = null;
  playbackRate = {
    value: 1,
    setValueAtTime: vi.fn().mockReturnThis(),
  };
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  connect = vi.fn().mockReturnThis();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
  disconnect = vi.fn();

  // Test helper: simulate playback finishing
  simulateEnd() {
    this.onended?.();
  }
}

export class MockAnalyserNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  minDecibels = -100;
  maxDecibels = -30;
  smoothingTimeConstant = 0.8;
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
  getByteFrequencyData = vi.fn((array: Uint8Array) => {
    // Fill with mock data
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  });
  getFloatFrequencyData = vi.fn();
  getByteTimeDomainData = vi.fn();
  getFloatTimeDomainData = vi.fn();
}

export class MockAudioBuffer {
  readonly sampleRate: number;
  readonly length: number;
  readonly duration: number;
  readonly numberOfChannels: number;

  constructor(options: { length: number; sampleRate: number; numberOfChannels?: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels || 1;
    this.duration = this.length / this.sampleRate;
  }

  getChannelData = vi.fn().mockReturnValue(new Float32Array(this.length));
  copyFromChannel = vi.fn();
  copyToChannel = vi.fn();
}

export class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  destination = {
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    maxChannelCount: 2,
    numberOfInputs: 1,
    numberOfOutputs: 0,
  };
  state: AudioContextState = 'running';
  private createdNodes: {
    oscillators: MockOscillatorNode[];
    gainNodes: MockGainNode[];
    bufferSources: MockBufferSourceNode[];
  } = {
    oscillators: [],
    gainNodes: [],
    bufferSources: [],
  };

  createOscillator(): MockOscillatorNode {
    const node = new MockOscillatorNode();
    this.createdNodes.oscillators.push(node);
    return node;
  }

  createGain(): MockGainNode {
    const node = new MockGainNode();
    this.createdNodes.gainNodes.push(node);
    return node;
  }

  createBufferSource(): MockBufferSourceNode {
    const node = new MockBufferSourceNode();
    this.createdNodes.bufferSources.push(node);
    return node;
  }

  createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode();
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
  }

  decodeAudioData = vi.fn().mockImplementation(async (arrayBuffer: ArrayBuffer) => {
    return new MockAudioBuffer({
      length: 44100 * 5,
      sampleRate: 44100,
      numberOfChannels: 2,
    });
  });

  close = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  resume = vi.fn().mockResolvedValue(undefined);

  // Test helpers
  getCreatedOscillators() {
    return this.createdNodes.oscillators;
  }

  getCreatedGainNodes() {
    return this.createdNodes.gainNodes;
  }

  getCreatedBufferSources() {
    return this.createdNodes.bufferSources;
  }

  advanceTime(seconds: number) {
    this.currentTime += seconds;
  }
}

// Create singleton for tests
export const mockAudioContext = new MockAudioContext();
