import { STATUS_LEGEND } from '@/lib/methodology';

const STYLES: Record<string, string> = {
  QUIET: 'bg-quiet/10 text-quiet border-quiet/40',
  ARMED: 'bg-gold/15 text-[#8a6d1f] border-gold/60',
  TRIGGERED: 'bg-triggered/10 text-triggered border-triggered/50',
  CONSTRAINED: 'bg-triggered/10 text-triggered border-triggered/50',
  FIRED: 'bg-triggered/10 text-triggered border-triggered/50',
  ESCALATE: 'bg-triggered/10 text-triggered border-triggered/50',
};

const MEANINGS: Record<string, string> = Object.fromEntries(
  STATUS_LEGEND.map((s) => [s.status, s.meaning]),
);

export function StatusChip({ status }: { status: string }) {
  const style = STYLES[status] ?? 'bg-navy/5 text-navy border-navy/20';
  return (
    <span
      title={MEANINGS[status]}
      className={`inline-block cursor-help rounded-full border px-2 py-0.5 text-xs font-semibold tracking-wide ${style}`}
    >
      {status}
    </span>
  );
}
