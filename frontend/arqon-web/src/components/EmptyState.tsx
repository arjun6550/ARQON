import type { ReactNode } from "react";

/** An empty screen says what goes here and offers the first step. */
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="marks-static" aria-hidden="true" />
      <p className="section-title">{title}</p>
      {children && <p className="hint mx-auto mt-1 max-w-sm">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
