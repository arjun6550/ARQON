import { ApiRequestError } from "../lib/apiClient";

export function ErrorPanel({ error }: { error: unknown }) {
  const e = error instanceof ApiRequestError ? error : undefined;
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-900">
      <p className="font-semibold">{e ? e.message : "Something went wrong."}</p>
      {e?.details.map((d, i) => (
        <p key={i} className="text-sm">{d.field ? `${d.field}: ` : ""}{d.message}</p>
      ))}
      {e?.traceId && <p className="mt-2 text-xs text-danger">Reference: {e.traceId}</p>}
    </div>
  );
}
