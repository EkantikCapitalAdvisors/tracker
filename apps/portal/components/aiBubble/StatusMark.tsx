import type { TripwireStatus } from '@/lib/aiBubble/types';

/**
 * §5.2 status rendering. Never encode status by colour alone: every mark
 * pairs a distinct SHAPE with a text LABEL. Red (#DC2626) is reserved for
 * FIRED and never used decoratively — a page with no FIRED tripwires
 * contains no red (§11).
 */
const STYLE: Record<TripwireStatus, { label: string; cls: string; shape: string; shapeCls: string }> = {
  DORMANT: {
    label: 'Dormant',
    cls: 'text-[#64748B] border-[#64748B]/30 bg-[#64748B]/5',
    shape: '○',
    shapeCls: 'text-[#64748B]',
  },
  ARMED: {
    label: 'Armed',
    cls: 'text-navy border-navy/40 bg-navy/5 font-medium',
    shape: '◐',
    shapeCls: 'text-navy',
  },
  PARTIAL: {
    label: 'Partial',
    cls: 'text-[#8a6d1f] border-gold/70 bg-gold/15 font-semibold',
    shape: '◑',
    shapeCls: 'text-[#C8A951]',
  },
  FIRED: {
    label: 'Fired',
    cls: 'text-[#DC2626] border-[#DC2626]/60 bg-[#DC2626]/10 font-bold',
    shape: '●',
    shapeCls: 'text-[#DC2626]',
  },
  UNSCOREABLE: {
    label: 'Unscoreable',
    cls: 'text-[#64748B] border-[#64748B]/60 bg-transparent border-dashed',
    shape: '⊘',
    shapeCls: 'text-[#64748B]',
  },
  RETIRED: {
    label: 'Retired',
    cls: 'text-[#64748B] border-[#64748B]/30 bg-transparent line-through',
    shape: '—',
    shapeCls: 'text-[#64748B]',
  },
};

export function StatusMark({ status }: { status: TripwireStatus }) {
  const s = STYLE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs tracking-wide ${s.cls}`}
    >
      <span aria-hidden className={s.shapeCls}>
        {s.shape}
      </span>
      {s.label}
    </span>
  );
}

export const STATUS_LABEL = (s: TripwireStatus) => STYLE[s].label;
