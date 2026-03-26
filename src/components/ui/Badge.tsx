"use client";

type BadgeVariant = "default" | "listening" | "playing" | "success" | "warning" | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-light text-text-dim",
  listening: "bg-blue/20 text-blue",
  playing: "bg-accent/20 text-accent",
  success: "bg-success/20 text-success",
  warning: "bg-danger/20 text-danger",
  error: "bg-danger/20 text-danger",
};

export function Badge({
  variant = "default",
  children,
  className = "",
  pulse = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-2
        px-3 py-1.5
        rounded-full
        text-sm font-semibold uppercase tracking-wide
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
