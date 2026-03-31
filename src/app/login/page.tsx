'use client';

import { useState } from 'react';

export default function BetaLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/beta-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-text tracking-tight">
            TalkTrack
          </h1>
          <p className="text-text-dim mt-2 text-sm">
            Voice-First Rehearsal Coach
          </p>
          <div className="mt-4 inline-block bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest">
            Beta Access
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter beta password"
            autoFocus
            className="w-full bg-surface text-text border border-surface-light rounded-xl px-4 py-3 text-center text-lg placeholder:text-text-dim/50 focus:outline-none focus:border-accent transition-colors"
          />

          {error && (
            <p className="text-danger text-sm text-center">
              Wrong password. Try again.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-accent text-bg font-bold py-3 rounded-xl text-lg hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>

        <p className="text-text-dim/50 text-xs text-center mt-8">
          Invited testers only. Contact the developer for access.
        </p>
      </div>
    </div>
  );
}
