"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import {
  checkMicPermission,
  requestMicPermission,
  stopStream,
  isSpeechRecognitionSupported,
  type MicPermissionStatus,
} from "@/lib/audio/devices";

interface MicPermissionBannerProps {
  onPermissionGranted: () => void;
}

export function MicPermissionBanner({ onPermissionGranted }: MicPermissionBannerProps) {
  const [status, setStatus] = useState<MicPermissionStatus | "checking" | "requesting">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check initial permission status
  useEffect(() => {
    async function check() {
      // First check if Speech Recognition is even supported
      if (!isSpeechRecognitionSupported()) {
        setStatus("unavailable");
        setErrorMessage("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
      }

      const permission = await checkMicPermission();
      setStatus(permission);

      if (permission === "granted") {
        onPermissionGranted();
      }
    }
    check();
  }, [onPermissionGranted]);

  const handleRequestPermission = useCallback(async () => {
    setStatus("requesting");
    setErrorMessage(null);

    const result = await requestMicPermission();

    if (result.granted) {
      // Stop the test stream
      stopStream(result.stream);
      setStatus("granted");
      onPermissionGranted();
    } else {
      setStatus("denied");
      setErrorMessage(result.error || "Microphone permission denied");
    }
  }, [onPermissionGranted]);

  // Don't render anything if permission is granted
  if (status === "granted") {
    return null;
  }

  // Show loading state while checking
  if (status === "checking") {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 mx-4 mb-4">
        <p className="text-center text-text-dim">Checking microphone access...</p>
      </div>
    );
  }

  // Show requesting state
  if (status === "requesting") {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 mx-4 mb-4">
        <p className="text-center text-text-dim">Requesting microphone access...</p>
        <p className="text-center text-sm text-text-dim mt-2">
          Please allow microphone access when prompted
        </p>
      </div>
    );
  }

  // Show unavailable state (no Speech Recognition or no mic)
  if (status === "unavailable") {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mx-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎤</span>
          <div className="flex-1">
            <h3 className="font-semibold text-red-400">Microphone Unavailable</h3>
            <p className="text-sm text-text-dim mt-1">
              {errorMessage || "Voice features require microphone access."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show denied state with instructions
  if (status === "denied") {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mx-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎤</span>
          <div className="flex-1">
            <h3 className="font-semibold text-red-400">Microphone Access Denied</h3>
            <p className="text-sm text-text-dim mt-1">
              {errorMessage}
            </p>
            <div className="mt-3 text-sm text-text-dim">
              <p className="font-medium">To enable microphone:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Tap the lock/info icon in your browser&apos;s address bar</li>
                <li>Find &quot;Microphone&quot; and set it to &quot;Allow&quot;</li>
                <li>Refresh the page</li>
              </ol>
            </div>
            <Button
              onClick={handleRequestPermission}
              variant="primary"
              className="mt-4 w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show prompt state - need to request permission
  return (
    <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-4 mx-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎤</span>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-400">Microphone Access Required</h3>
          <p className="text-sm text-text-dim mt-1">
            TalkTrack needs microphone access to hear your voice commands and practice responses.
          </p>
          <Button
            onClick={handleRequestPermission}
            variant="primary"
            className="mt-4 w-full"
          >
            Enable Microphone
          </Button>
        </div>
      </div>
    </div>
  );
}
