import { z } from "zod";

/** Mirrors the backend error contract (spec section 58). */
const apiErrorSchema = z.object({
  timestamp: z.string().optional(),
  status: z.number(),
  code: z.string(),
  message: z.string(),
  traceId: z.string().optional(),
  details: z.array(z.object({ field: z.string().optional(), message: z.string() })).optional(),
});

export type ApiErrorDetail = { field?: string; message: string };

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly traceId?: string,
    public readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Builds an ApiRequestError from whatever the server returned; never throws. */
export function parseApiError(status: number, body: unknown, correlationHeader?: string | null): ApiRequestError {
  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    const b = parsed.data;
    return new ApiRequestError(b.status, b.code, b.message, b.traceId ?? correlationHeader ?? undefined, b.details ?? []);
  }
  return new ApiRequestError(status, "UNKNOWN_ERROR", "Something went wrong. Please try again.", correlationHeader ?? undefined);
}

/** Hooks installed by the auth provider so the client can attach the in-memory access token and refresh on 401. */
export type AuthHooks = { getToken: () => string | null; refresh: () => Promise<string | null> };
let authHooks: AuthHooks | null = null;
export function configureAuth(hooks: AuthHooks | null) {
  authHooks = hooks;
}

export function jsonInit(method: string, body?: unknown, headers: Record<string, string> = {}): RequestInit {
  return {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

async function send(path: string, init: RequestInit, correlationId: string, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Correlation-Id": correlationId,
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const activeTenantId = typeof window !== "undefined" ? localStorage.getItem("arqon-active-tenant-id") : null;
  if (activeTenantId && !headers["X-Tenant-Id"]) {
    headers["X-Tenant-Id"] = activeTenantId;
  }
  try {
    return await fetch(path, { ...init, credentials: "same-origin", headers });
  } catch {
    throw new ApiRequestError(0, "NETWORK_ERROR", "Cannot reach the server. Check your connection.", correlationId);
  }
}

/**
 * Thin fetch wrapper: JSON in/out, fresh X-Correlation-Id per request, uniform errors, Bearer token from memory.
 * On a 401 (access token expired) it refreshes once and retries. Pass { auth: false } for login/refresh themselves.
 */
export async function apiFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}, opts: { auth?: boolean } = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  const correlationId = crypto.randomUUID();
  let res = await send(path, init, correlationId, useAuth ? (authHooks?.getToken() ?? null) : null);

  if (res.status === 401 && useAuth && authHooks) {
    const fresh = await authHooks.refresh();
    if (fresh) res = await send(path, init, correlationId, fresh);
  }

  const responseCorrelation = res.headers.get("X-Correlation-Id") ?? correlationId;
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    throw parseApiError(res.status, body, responseCorrelation);
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiRequestError(res.status, "INVALID_RESPONSE", "The server sent an unexpected response.", responseCorrelation);
  }
  return parsed.data;
}
