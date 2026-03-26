"use client";

import Link from "next/link";

interface HeaderProps {
  title?: string;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export function Header({ title = "TalkTrack", backHref, rightAction }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur-sm border-b border-surface-light">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Back button or spacer */}
        <div className="w-12">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center justify-center w-12 h-12 -ml-2 text-text-dim hover:text-text"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="font-extrabold text-lg tracking-tight">{title}</h1>

        {/* Right: Action or spacer */}
        <div className="w-12 flex justify-end">{rightAction}</div>
      </div>
    </header>
  );
}
