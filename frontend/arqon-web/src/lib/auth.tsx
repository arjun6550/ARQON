import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { apiFetch, configureAuth, jsonInit } from "./apiClient";
import { authResponseSchema, type UserView } from "./schemas";

type Session = { accessToken: string; user: UserView };
type AuthState = { status: "loading" } | { status: "anonymous" } | { status: "authenticated"; user: UserView };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string) => Promise<UserView>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const CSRF = { "X-ARQON-CSRF": "1" };

/** Single in-flight refresh: concurrent callers (incl. React StrictMode's double effect) share one request,
 *  otherwise the second call would replay a rotated token and trigger server-side reuse detection. */
let refreshInFlight: Promise<Session | null> | null = null;
function refreshSession(): Promise<Session | null> {
  if (!refreshInFlight) {
    refreshInFlight = apiFetch("/api/v1/auth/refresh", authResponseSchema, jsonInit("POST", undefined, CSRF), { auth: false })
      .then((r) => ({ accessToken: r.accessToken, user: r.user }) as Session)
      .catch(() => null)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const tokenRef = useRef<string | null>(null); // access token lives in memory only (never localStorage)

  const apply = useCallback((s: Session | null) => {
    tokenRef.current = s?.accessToken ?? null;
    setState(s ? { status: "authenticated", user: s.user } : { status: "anonymous" });
  }, []);

  useEffect(() => {
    configureAuth({
      getToken: () => tokenRef.current,
      refresh: async () => {
        const s = await refreshSession();
        apply(s);
        return s?.accessToken ?? null;
      },
    });
    void refreshSession().then(apply);
    return () => configureAuth(null);
  }, [apply]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiFetch("/api/v1/auth/login", authResponseSchema, jsonInit("POST", { email, password }), { auth: false });
    apply({ accessToken: r.accessToken, user: r.user });
    return r.user;
  }, [apply]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/v1/auth/logout", z.undefined(), jsonInit("POST", undefined, CSRF), { auth: false });
    } finally {
      apply(null);
    }
  }, [apply]);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
