"use client";

import { Badge } from "@/components/ui/Badge";

type Status = "playing" | "paused" | "listening" | "idle" | "error";

interface VoiceStatusProps {
  status: Status;
}

const statusConfig: Record<Status, { variant: "playing" | "listening" | "default" | "error"; text: string; pulse: boolean }> = {
  playing: { variant: "playing", text: "Playing...", pulse: true },
  paused: { variant: "default", text: "Paused", pulse: false },
  listening: { variant: "listening", text: "Listening...", pulse: true },
  idle: { variant: "default", text: "Ready", pulse: false },
  error: { variant: "error", text: "Mic error — retrying...", pulse: false },
};

export function VoiceStatus({ status }: VoiceStatusProps) {
  const config = statusConfig[status];

  return (
    <div className="flex justify-center mb-4">
      <Badge variant={config.variant} pulse={config.pulse}>
        {config.text}
      </Badge>
    </div>
  );
}
