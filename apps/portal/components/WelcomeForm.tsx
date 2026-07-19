'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function WelcomeForm() {
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Something went wrong — please try again.');
        setBusy(false);
        return;
      }
      const next = params.get('next');
      window.location.href = next && next.startsWith('/') ? next : '/';
    } catch {
      setError('Network error — please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div>
        <label htmlFor="name" className="block text-xs uppercase tracking-wide text-ivory/60">
          Your name
        </label>
        <input
          id="name"
          type="text"
          required
          minLength={2}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-ivory/25 bg-ivory/10 px-3 py-2 text-sm text-ivory placeholder-ivory/40 outline-none focus:border-gold"
          placeholder="Jane Investor"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-xs uppercase tracking-wide text-ivory/60">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-ivory/25 bg-ivory/10 px-3 py-2 text-sm text-ivory placeholder-ivory/40 outline-none focus:border-gold"
          placeholder="jane@example.com"
        />
        <p className="mt-1 text-xs text-ivory/50">
          Use the address you&rsquo;d want a correction alert to reach.
        </p>
      </div>
      {error && <p className="text-sm text-[#e8a08d]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-navy transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? 'One moment…' : 'Enter the portal →'}
      </button>
    </form>
  );
}
