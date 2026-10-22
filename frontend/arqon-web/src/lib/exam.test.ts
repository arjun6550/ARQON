import { describe, expect, it } from "vitest";
import { clockOffset, formatRemaining, isAnswered, remainingMs, type ExamItem } from "./exam";

const base: ExamItem = {
  questionId: "q", version: 1, points: 1, coding: false, title: "t", body: "b", options: ["a", "b"], multipleCorrect: false,
  languages: [], starterCode: {}, samples: [], hiddenTestCount: 0,
};

describe("clock", () => {
  it("follows the server clock even when the device clock is wrong", () => {
    const serverNow = "2030-01-01T10:00:00Z";
    const deviceNow = new Date("2030-01-01T09:00:00Z").getTime(); // device is one hour behind
    const offset = clockOffset(serverNow, deviceNow);
    expect(remainingMs("2030-01-01T10:30:00Z", offset, deviceNow)).toBe(30 * 60 * 1000);
    expect(remainingMs("2030-01-01T10:30:00Z", offset, deviceNow + 10_000)).toBe(30 * 60 * 1000 - 10_000);
  });
  it("never goes negative", () => {
    expect(remainingMs("2030-01-01T10:00:00Z", 0, new Date("2030-01-01T11:00:00Z").getTime())).toBe(0);
  });
});

describe("formatRemaining", () => {
  it("formats minutes and hours", () => {
    expect(formatRemaining(65_000)).toBe("01:05");
    expect(formatRemaining(3_725_000)).toBe("1:02:05");
    expect(formatRemaining(0)).toBe("00:00");
  });
});

describe("isAnswered", () => {
  it("detects answered MCQ and coding items", () => {
    expect(isAnswered(base, undefined)).toBe(false);
    expect(isAnswered(base, { selected: [] })).toBe(false);
    expect(isAnswered(base, { selected: [1] })).toBe(true);
    expect(isAnswered({ ...base, coding: true }, { code: "  " })).toBe(false);
    expect(isAnswered({ ...base, coding: true }, { language: "JAVA", code: "x" })).toBe(true);
  });
});

import { reviewSummary as rs } from "./exam";
describe("reviewSummary", () => {
  const mcq = (id: string) => ({ questionId: id, coding: false, options: ["a", "b"] }) as never;
  it("groups answered, unanswered and flagged by position", () => {
    const items = [mcq("a"), mcq("b"), mcq("c")];
    const r = rs(items, { a: { selected: [0] } }, new Set(["c"]));
    expect(r.answered).toEqual([0]);
    expect(r.unanswered).toEqual([1, 2]);
    expect(r.flagged).toEqual([2]);
  });
});
