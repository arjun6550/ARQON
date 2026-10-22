import { describe, expect, it } from "vitest";
import { parseEmails, tokenFromHash } from "./invitations";

describe("parseEmails", () => {
  it("splits on separators, lower-cases and de-duplicates", () => {
    const r = parseEmails("A@x.io, b@x.io;\n a@X.io  c@x.io");
    expect(r.valid).toEqual(["a@x.io", "b@x.io", "c@x.io"]);
    expect(r.invalid).toEqual([]);
  });
  it("reports invalid addresses separately", () => {
    const r = parseEmails("good@x.io nope bad@localhost");
    expect(r.valid).toEqual(["good@x.io"]);
    expect(r.invalid).toEqual(["nope", "bad@localhost"]);
  });
  it("handles empty input", () => {
    expect(parseEmails("  \n ")).toEqual({ valid: [], invalid: [] });
  });
});

describe("tokenFromHash", () => {
  const token = "A".repeat(43);
  it("accepts a well-formed fragment", () => {
    expect(tokenFromHash(`#${token}`)).toBe(token);
  });
  it("rejects anything else", () => {
    expect(tokenFromHash("")).toBeNull();
    expect(tokenFromHash("#short")).toBeNull();
    expect(tokenFromHash(`#${token}!`)).toBeNull();
  });
});
