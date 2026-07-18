import type { ReactNode } from 'react';

/**
 * CSS-only hover tooltip (no client JS — works in server components).
 * Shows `text` in a popover below the wrapped element on hover/focus.
 */
export function Hint({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative cursor-help" tabIndex={0}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1.5 w-72 max-w-[80vw] rounded-md border border-navy/25 bg-white px-3 py-2 text-left text-xs font-normal normal-case not-italic tracking-normal leading-relaxed text-navy opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
