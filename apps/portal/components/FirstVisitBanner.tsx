'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'cd_manual_seen';

/**
 * Steers first-time visitors to the Investor Manual. Shows until the manual
 * has been opened (or the banner dismissed); state lives in localStorage.
 */
export function FirstVisitBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage unavailable — stay hidden */
    }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className="mx-auto max-w-6xl px-6 pt-4 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold/60 bg-gold/15 px-4 py-3">
        <p className="text-sm text-navy/85">
          <span className="font-semibold">First time here?</span> Five minutes with the Investor
          Manual explains what this dashboard asks of your allocation — and what it will never do.
        </p>
        <span className="flex items-center gap-3">
          <Link
            href="/dashboard/manual"
            onClick={dismiss}
            className="rounded-md bg-navy px-4 py-1.5 text-sm font-semibold text-ivory transition-opacity hover:opacity-90"
          >
            Read the manual first →
          </Link>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-sm text-navy/50 underline hover:text-navy/80"
          >
            Skip
          </button>
        </span>
      </div>
    </div>
  );
}

/** Rendered on the manual page itself: marks the manual as seen. */
export function MarkManualSeen() {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
