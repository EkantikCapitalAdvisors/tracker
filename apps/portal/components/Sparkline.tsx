export function Sparkline({ values, width = 140, height = 32 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) {
    return <div className="text-xs text-navy/40">no series</div>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="block" aria-hidden>
      <polyline points={points} fill="none" stroke="#1B2A4A" strokeOpacity="0.55" strokeWidth="1.5" />
    </svg>
  );
}
