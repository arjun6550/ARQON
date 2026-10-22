import { describe, expect, it } from "vitest";
import { marksOn } from "./TimeMarks";

describe("marksOn", () => {
  it("lights marks in proportion to the time left", () => {
    expect(marksOn(100, 100, 40)).toBe(40);
    expect(marksOn(50, 100, 40)).toBe(20);
    expect(marksOn(1, 100, 40)).toBe(1);
    expect(marksOn(0, 100, 40)).toBe(0);
  });
  it("is safe with bad input", () => {
    expect(marksOn(10, 0, 40)).toBe(0);
    expect(marksOn(500, 100, 40)).toBe(40);
  });
});
