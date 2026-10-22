import { describe, expect, it } from "vitest";
import {
  buildWeights, detailToForm, emptyAssessmentForm, formToRequest, fromLocalInput, toLocalInput, validateAssessmentForm, type AssessmentDetail,
} from "./assessments";

const NOW = new Date("2030-01-01T00:00:00Z");
const item = { questionId: "q1", version: 1, points: 10, title: "Q1" };

function valid() {
  const f = emptyAssessmentForm(NOW);
  f.title = "Screening";
  f.windowStart = toLocalInput("2030-01-02T00:00:00Z");
  f.windowEnd = toLocalInput("2030-01-09T00:00:00Z");
  f.sections = [{ title: "MCQ", type: "MCQ", items: [item] }, { title: "Coding", type: "CODING", items: [{ ...item, questionId: "q2" }] }];
  return f;
}

describe("datetime helpers", () => {
  it("round-trips local input values", () => {
    const iso = "2030-03-04T05:06:00.000Z";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });
});

describe("weights", () => {
  it("only includes section types that are present", () => {
    const f = valid();
    expect(buildWeights(f)).toEqual({ MCQ: 40, CODING: 60 });
    f.sections = [f.sections[0]];
    expect(buildWeights(f)).toEqual({ MCQ: 40 });
  });
});

describe("validateAssessmentForm", () => {
  it("accepts a complete assessment for draft and publish", () => {
    expect(validateAssessmentForm(valid(), false, NOW)).toEqual([]);
    expect(validateAssessmentForm(valid(), true, NOW)).toEqual([]);
  });
  it("applies fixed-window and flexible-window rules", () => {
    const f = valid();
    f.scheduleType = "FIXED_WINDOW"; // 7 day window is not allowed for fixed
    expect(validateAssessmentForm(f, false, NOW).join(" ")).toMatch(/fixed window/);
    f.scheduleType = "FLEXIBLE_WINDOW"; f.durationMinutes = 240;
    expect(validateAssessmentForm(f, false, NOW).join(" ")).toMatch(/180/);
  });
  it("requires sections, questions and weights summing to 100 only when publishing", () => {
    const f = valid();
    f.sections = [];
    expect(validateAssessmentForm(f, false, NOW)).toEqual([]);
    expect(validateAssessmentForm(f, true, NOW).join(" ")).toMatch(/at least one section/);
    const g = valid();
    g.weightMcq = 30;
    expect(validateAssessmentForm(g, true, NOW).join(" ")).toMatch(/add up to 100/);
    expect(validateAssessmentForm(g, false, NOW)).toEqual([]);
  });
  it("needs a language when there is a coding section and a future end to publish", () => {
    const f = valid();
    f.languages = [];
    expect(validateAssessmentForm(f, false, NOW).join(" ")).toMatch(/language/);
    const g = valid();
    expect(validateAssessmentForm(g, true, new Date("2031-01-01T00:00:00Z")).join(" ")).toMatch(/future/);
  });
});

describe("formToRequest / detailToForm", () => {
  it("builds the API payload without UI-only fields and includes expectedRevision on update", () => {
    const r = formToRequest(valid(), 2);
    expect(r.expectedRevision).toBe(2);
    expect(r.sections[0].items[0]).toEqual({ questionId: "q1", version: 1, points: 10 });
    expect(r.config.scoring.weights).toEqual({ MCQ: 40, CODING: 60 });
    expect(r.config.schedule.windowStart).toBe("2030-01-02T00:00:00.000Z");
    expect("expectedRevision" in formToRequest(valid())).toBe(false);
  });
  it("round-trips through the server shape", () => {
    const req = formToRequest(valid());
    const detail: AssessmentDetail = {
      id: "a1", title: req.title, description: req.description, status: "DRAFT", revision: 0, sourceAssessmentId: null,
      createdAt: "", updatedAt: "", publishedAt: null, config: req.config as AssessmentDetail["config"], sections: req.sections,
    };
    const form = detailToForm(detail, { q1: "First question" });
    expect(form.sections[0].items[0].title).toBe("First question");
    expect(form.sections[1].items[0].title).toMatch(/^Question q2/);
    expect(form.weightCoding).toBe(60);
    expect(form.windowStart).toBe(valid().windowStart);
  });
});
