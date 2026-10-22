import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Modal } from "./Modal";

type Options = { title: string; message?: string; confirmLabel: string; danger?: boolean };
const Ctx = createContext<(o: Options) => Promise<boolean>>(() => Promise.resolve(false));
export const useConfirm = () => useContext(Ctx);

/** Replaces window.confirm. The button says what will happen ("Archive", not "OK"). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => undefined);
  const confirm = useCallback((o: Options) => new Promise<boolean>((resolve) => { resolver.current = resolve; setOpts(o); }), []);
  const done = (v: boolean) => { setOpts(null); resolver.current(v); };
  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <Modal title={opts.title} onClose={() => done(false)}>
          {opts.message && <p className="text-sm">{opts.message}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-quiet" onClick={() => done(false)}>Cancel</button>
            <button className={`btn ${opts.danger ? "btn-danger" : "btn-primary"}`} onClick={() => done(true)}>{opts.confirmLabel}</button>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}
