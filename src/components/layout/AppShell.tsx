"use client";

import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className={`flex-1 ${hideNav ? "" : "pb-20"}`}>{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
