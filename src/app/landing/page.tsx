"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      {/* Hero */}
      <section className="px-6 py-16 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Rehearse Your Presentation
          <br />
          <span className="text-accent">While You Drive</span>
        </h1>
        <p className="text-xl text-text-dim mb-8 max-w-xl mx-auto">
          The first voice-only presentation coach. No screen needed.
          Perfect your pitch, speech, or sermon hands-free.
        </p>
        <Link
          href="/"
          className="inline-block bg-accent hover:bg-accent-dim text-bg font-bold py-4 px-8 rounded-[var(--radius)] text-lg transition-colors"
        >
          Start Rehearsing Free
        </Link>
      </section>

      {/* How It Works */}
      <section className="px-6 py-12 bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="font-bold mb-2">1. Import Your Talk</h3>
              <p className="text-text-dim text-sm">
                Paste text, upload PowerPoint, or dictate your notes
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎧</span>
              </div>
              <h3 className="font-bold mb-2">2. Choose Your Mode</h3>
              <p className="text-text-dim text-sm">
                Listen, get prompted, or test your recall — all by voice
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚗</span>
              </div>
              <h3 className="font-bold mb-2">3. Practice Anywhere</h3>
              <p className="text-text-dim text-sm">
                Commute, walk, or workout while mastering your material
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: "🎤", title: "35+ Voice Commands", desc: "Control everything by voice — next, repeat, reveal, help" },
              { icon: "🌍", title: "6 Languages", desc: "English, Spanish, German, Italian, Albanian, Macedonian" },
              { icon: "📊", title: "Smart Scoring", desc: "See what you missed and track improvement over time" },
              { icon: "🔄", title: "Spaced Repetition", desc: "Focus on slides you struggle with most" },
              { icon: "🚙", title: "CarPlay & Android Auto", desc: "Control from your car dashboard" },
              { icon: "🔒", title: "100% Private", desc: "Everything stays on your device — no cloud, no account" },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-4 bg-surface rounded-[var(--radius)]">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <h3 className="font-bold">{f.title}</h3>
                  <p className="text-text-dim text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-12 bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Perfect For</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Conference Speakers",
              "Sales Pitches",
              "Wedding Toasts",
              "Sermons",
              "Lectures",
              "TED Talks",
              "Job Interviews",
              "Acting Lines",
            ].map((use) => (
              <span
                key={use}
                className="px-4 py-2 bg-surface-light rounded-full text-sm"
              >
                {use}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to nail your next talk?</h2>
        <p className="text-text-dim mb-8">Free forever. No account needed.</p>
        <Link
          href="/"
          className="inline-block bg-accent hover:bg-accent-dim text-bg font-bold py-4 px-8 rounded-[var(--radius)] text-lg transition-colors"
        >
          Start Rehearsing Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-surface text-center text-text-dim text-sm">
        <p>TalkTrack — Voice-first rehearsal for busy speakers</p>
        <p className="mt-2">
          <a href="https://github.com/anthropics/claude-code" className="underline">
            Built with Claude Code
          </a>
        </p>
      </footer>
    </div>
  );
}
