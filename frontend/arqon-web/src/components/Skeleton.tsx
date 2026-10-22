export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Placeholder rows shaped like a list/table while it loads. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="panel mt-4 divide-y" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-3/4" /></div>
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}
