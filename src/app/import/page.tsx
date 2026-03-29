"use client";

import { useState } from "react";
import { AppShell, Header } from "@/components/layout";
import { PasteImport, FileUpload, UrlImport, VoiceRecord } from "@/components/import";

type Tab = "paste" | "upload" | "url" | "record";

const tabs: { id: Tab; label: string }[] = [
  { id: "paste", label: "Paste" },
  { id: "upload", label: "Upload" },
  { id: "url", label: "URL" },
  { id: "record", label: "Record" },
];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<Tab>("paste");

  return (
    <AppShell>
      <Header title="Import Talk" backHref="/" />

      <div className="px-4 py-4 space-y-4">
        {/* Tabs */}
        <div className="flex bg-surface rounded-[var(--radius-sm)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 py-3 px-4
                rounded-[var(--radius-sm)]
                font-semibold text-sm uppercase tracking-wide
                transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-surface-light text-text"
                    : "text-text-dim hover:text-text"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "paste" && <PasteImport />}
        {activeTab === "upload" && <FileUpload />}
        {activeTab === "url" && <UrlImport />}
        {activeTab === "record" && <VoiceRecord />}
      </div>
    </AppShell>
  );
}
