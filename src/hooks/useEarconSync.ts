"use client";

import { useEffect, useRef } from 'react';
import { useRehearsalStore, type AudioState } from '@/stores/rehearsalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import * as earcons from '@/lib/audio/earcons';

/**
 * Hook that syncs earcon settings and plays earcons on audio state transitions.
 * Call this at the top of rehearsal mode components (PromptMode, TestMode, ListenMode).
 */
export function useEarconSync(): void {
  const audioState = useRehearsalStore((s) => s.audioState);
  const lastCommandTimestamp = useRehearsalStore((s) => s.lastCommandTimestamp);

  const { enableEarcons, earconVolume } = useSettingsStore();

  const prevAudioStateRef = useRef<AudioState>(audioState);
  const prevCommandTimestampRef = useRef<number | null>(lastCommandTimestamp);

  // Sync volume and enabled settings
  useEffect(() => {
    earcons.setVolume(earconVolume);
    earcons.setEnabled(enableEarcons);
  }, [enableEarcons, earconVolume]);

  // Play earcons on audio state transitions
  useEffect(() => {
    const prevState = prevAudioStateRef.current;

    // Skip if state hasn't changed
    if (prevState === audioState) return;

    // Mic on: transitioning TO listening from non-listening
    if (audioState === 'listening' && prevState !== 'listening') {
      earcons.micOn();
    }

    // Mic off: transitioning FROM listening to idle
    if (audioState === 'idle' && prevState === 'listening') {
      earcons.micOff();
    }

    // Error: play error sound
    if (audioState === 'error' && prevState !== 'error') {
      earcons.errorRetry();
    }

    // Update ref
    prevAudioStateRef.current = audioState;
  }, [audioState]);

  // Play command recognized earcon
  useEffect(() => {
    // Only play if timestamp changed and is not null
    if (
      lastCommandTimestamp !== null &&
      lastCommandTimestamp !== prevCommandTimestampRef.current
    ) {
      earcons.commandRecognized();
      prevCommandTimestampRef.current = lastCommandTimestamp;
    }
  }, [lastCommandTimestamp]);
}

export default useEarconSync;
