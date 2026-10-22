/** Time left as a strip of timing marks (like the edge of an answer sheet). Pure display; the server owns the clock. */
export function marksOn(remainingMs: number, totalMs: number, count: number): number {
  if (totalMs <= 0) return 0;
  return Math.max(0, Math.min(count, Math.ceil((remainingMs / totalMs) * count)));
}

export function TimeMarks({ remainingMs, totalMs, count = 40 }: { remainingMs: number; totalMs: number; count?: number }) {
  const on = marksOn(remainingMs, totalMs, count);
  const urgent = remainingMs <= 5 * 60_000 || (totalMs > 0 && remainingMs / totalMs <= 0.1);
  return (
    <div className="marks" data-urgent={urgent} role="presentation" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <i key={i} data-off={i >= on} />)}
    </div>
  );
}
