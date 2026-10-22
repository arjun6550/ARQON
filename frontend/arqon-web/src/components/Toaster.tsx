import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Kind = "ok" | "error";
type Toast = { id: number; kind: Kind; text: string };
type Api = { show: (text: string, kind?: Kind) => void };

const Ctx = createContext<Api>({ show: () => undefined });
export const useToast = () => useContext(Ctx);

/** Short confirmations ("Published") and failures. Not for anything the person must act on: those stay inline. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const show = useCallback((text: string, kind: Kind = "ok") => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast pointer-events-auto" data-kind={t.kind}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  );
}
