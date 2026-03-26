import { nanoid } from "nanoid";
import type { Recording } from "@/types/recording";
import { createRecording } from "@/lib/db/recordings";

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let startTime = 0;

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia !== undefined;
}

export async function startRecording(): Promise<boolean> {
  if (!isRecordingSupported()) return false;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";

    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];
    startTime = Date.now();

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start(100); // Collect data every 100ms
    return true;
  } catch (e) {
    console.warn("Failed to start recording:", e);
    return false;
  }
}

export function stopRecording(): Promise<{ blob: Blob; duration: number; mimeType: string } | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder?.mimeType || "audio/webm";
      const blob = new Blob(audioChunks, { type: mimeType });
      const duration = Date.now() - startTime;

      // Stop all tracks
      mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
      mediaRecorder = null;
      audioChunks = [];

      resolve({ blob, duration, mimeType });
    };

    mediaRecorder.stop();
  });
}

export function isRecording(): boolean {
  return mediaRecorder?.state === "recording";
}

export async function saveRecording(
  sessionId: string,
  talkId: string,
  slideId: string,
  slideIndex: number
): Promise<Recording | null> {
  const result = await stopRecording();
  if (!result || result.blob.size === 0) return null;

  const recording: Recording = {
    id: nanoid(),
    sessionId,
    talkId,
    slideId,
    slideIndex,
    audioBlob: result.blob,
    mimeType: result.mimeType,
    duration: result.duration,
    createdAt: Date.now(),
  };

  await createRecording(recording);
  return recording;
}
