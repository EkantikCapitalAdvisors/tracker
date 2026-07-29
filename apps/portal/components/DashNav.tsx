'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Persistent what → why → rules navigation for the dashboard suite.
 * Positioning tells you what the policy says to do; the Correction
 * Dashboard is the evidence behind it; Methodology is the rulebook.
 */
const TABS = [
  { href: '/dashboard/manual', step: '0', label: 'Investor Manual', sub: 'START HERE — the guide' },
  { href: '/health', step: '1', label: 'Market Health', sub: 'PLAIN VIEW — 7 gauges' },
  { href: '/dashboard/positioning', step: '2', label: 'Positioning', sub: 'WHAT — the allocation' },
  { href: '/dashboard/correction', step: '3', label: 'Engine Room', sub: 'WHY — full methodology (dense)' },
  { href: '/ai-bubble', step: '4', label: 'AI Bubble Index', sub: 'EVIDENCE — 28 tripwires' },
  { href: '/dashboard/methodology', step: '5', label: 'Methodology', sub: 'RULES — the backtest' },
];

export function DashNav() {
  const path = usePathname();
  return (
    <nav className="mx-auto max-w-6xl px-6 pt-6 md:px-10">
      <div className="flex flex-col gap-1.5 rounded-lg border border-navy/15 bg-white p-1.5 sm:flex-row">
        {TABS.map((t, i) => {
          const active = path?.startsWith(t.href);
          return (
            <div key={t.href} className="flex flex-1 items-center">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`block w-full rounded-md px-3 py-2 transition-colors ${
                  active ? 'bg-navy text-ivory' : 'text-navy/70 hover:bg-navy/5'
                }`}
              >
                <span className="block text-sm font-semibold">{t.label}</span>
                <span
                  className={`block text-[11px] tracking-wide ${active ? 'text-gold' : 'text-navy/50'}`}
                >
                  {t.sub}
                </span>
              </Link>
              {i < TABS.length - 1 && (
                <span aria-hidden className="hidden px-1 text-navy/30 sm:block">
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
