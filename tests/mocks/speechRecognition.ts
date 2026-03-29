export interface MockRecognitionResult {
  transcript: string;
  confidence: number;
}

export interface MockRecognitionEvent {
  results: {
    length: number;
    [index: number]: {
      [index: number]: MockRecognitionResult;
      isFinal: boolean;
      length: number;
    };
  };
  resultIndex: number;
}

export class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;
  onresult: ((event: MockRecognitionEvent) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string; message?: string }) => void) | null = null;
  onstart: (() => void) | null = null;
  onspeechstart: (() => void) | null = null;
  onspeechend: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  onaudioend: (() => void) | null = null;

  private isRunning = false;

  start() {
    if (this.isRunning) {
      this.onerror?.({ error: 'already-started', message: 'Recognition already started' });
      return;
    }
    this.isRunning = true;
    // Simulate async start
    setTimeout(() => {
      if (this.isRunning) {
        this.onstart?.();
        this.onaudiostart?.();
      }
    }, 0);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    // In real browsers, stop() triggers onend after a short delay
    setTimeout(() => this.onend?.(), 10);
  }

  abort() {
    this.isRunning = false;
    this.onend?.();
  }

  // Test helpers:

  /** Simulate the user saying something */
  simulateSpeech(text: string, isFinal: boolean = true) {
    if (!this.isRunning) return;

    this.onspeechstart?.();

    this.onresult?.({
      results: {
        length: 1,
        0: {
          0: { transcript: text, confidence: 0.9 },
          isFinal,
          length: 1,
        },
      },
      resultIndex: 0,
    });

    if (isFinal) {
      this.onspeechend?.();
    }
  }

  /** Simulate interim results followed by final */
  simulateSpeechWithInterim(interimTexts: string[], finalText: string) {
    if (!this.isRunning) return;

    this.onspeechstart?.();

    // Send interim results
    for (const text of interimTexts) {
      this.onresult?.({
        results: {
          length: 1,
          0: {
            0: { transcript: text, confidence: 0.7 },
            isFinal: false,
            length: 1,
          },
        },
        resultIndex: 0,
      });
    }

    // Send final result
    this.onresult?.({
      results: {
        length: 1,
        0: {
          0: { transcript: finalText, confidence: 0.95 },
          isFinal: true,
          length: 1,
        },
      },
      resultIndex: 0,
    });

    this.onspeechend?.();
  }

  /** Simulate recognition dying (browser kills it randomly) */
  simulateDeath() {
    this.isRunning = false;
    this.onaudioend?.();
    this.onend?.();
  }

  /** Simulate an error */
  simulateError(error: string, message?: string) {
    this.onerror?.({ error, message });
    if (error !== 'aborted' && error !== 'no-speech') {
      this.isRunning = false;
      this.onend?.();
    }
  }

  /** Simulate silence timeout — fires 'no-speech' error then onend */
  simulateSilenceTimeout() {
    this.onerror?.({ error: 'no-speech' });
    this.isRunning = false;
    this.onend?.();
  }

  /** Check if recognition is running */
  get running() { return this.isRunning; }
}

// Factory function for creating new instances
export function createMockSpeechRecognition() {
  return new MockSpeechRecognition();
}
