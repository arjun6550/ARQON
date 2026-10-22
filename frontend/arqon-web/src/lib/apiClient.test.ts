import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiRequestError, apiFetch, configureAuth, parseApiError } from "./apiClient";

const schema = z.object({ status: z.string() });
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

afterEach(() => vi.unstubAllGlobals());

describe("parseApiError", () => {
  it("maps the standard backend error body", () => {
    const e = parseApiError(400, { status: 400, code: "VALIDATION_ERROR", message: "bad", traceId: "t1", details: [{ field: "name", message: "required" }] });
    expect(e.code).toBe("VALIDATION_ERROR");
    expect(e.traceId).toBe("t1");
    expect(e.details[0].field).toBe("name");
  });
  it("falls back safely on a non-standard body", () => {
    const e = parseApiError(502, "<html>bad gateway</html>", "corr-1");
    expect(e.code).toBe("UNKNOWN_ERROR");
    expect(e.traceId).toBe("corr-1");
    expect(e.message).not.toContain("html");
  });
});

describe("apiFetch", () => {
  it("sends a correlation id and returns validated data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ status: "UP" }));
    vi.stubGlobal("fetch", fetchMock);
    const data = await apiFetch("/api/v1/identity/ping", schema);
    expect(data.status).toBe("UP");
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-Correlation-Id"]).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("throws ApiRequestError with backend code on error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ status: 404, code: "NOT_FOUND", message: "nope" }, 404)));
    await expect(apiFetch("/x", schema)).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });
  it("maps network failure to NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    const err = await apiFetch("/x", schema).catch((e) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.code).toBe("NETWORK_ERROR");
  });
  it("rejects responses that do not match the schema", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ unexpected: true })));
    await expect(apiFetch("/x", schema)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});

describe("apiFetch auth handling", () => {
  afterEach(() => configureAuth(null));

  it("attaches the in-memory bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ status: "UP" }));
    vi.stubGlobal("fetch", fetchMock);
    configureAuth({ getToken: () => "tok-1", refresh: async () => null });
    await apiFetch("/x", schema);
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ status: 401, code: "UNAUTHENTICATED", message: "expired" }, 401))
      .mockResolvedValueOnce(json({ status: "UP" }));
    vi.stubGlobal("fetch", fetchMock);
    const refresh = vi.fn().mockResolvedValue("tok-2");
    configureAuth({ getToken: () => "tok-1", refresh });
    const data = await apiFetch("/x", schema);
    expect(data.status).toBe("UP");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe("Bearer tok-2");
  });

  it("does not refresh for auth:false calls (login/refresh)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ status: 401, code: "UNAUTHENTICATED", message: "bad" }, 401)));
    const refresh = vi.fn();
    configureAuth({ getToken: () => "tok", refresh });
    await expect(apiFetch("/login", schema, {}, { auth: false })).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("returns undefined for 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiFetch("/logout", z.undefined(), { method: "POST" })).resolves.toBeUndefined();
  });
});
