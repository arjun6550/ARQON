import { describe, expect, it } from "vitest";
import { detailToForm, emptyForm, formToRequest, validateQuestionForm, type QuestionDetail } from "./questions";

describe("validateQuestionForm", () => {
  it("accepts a valid MCQ", () => {
    const f = emptyForm();
    f.title = "Q"; f.body = "Body"; f.options = [{ text: "A", correct: true }, { text: "B", correct: false }];
    expect(validateQuestionForm(f)).toEqual([]);
  });
  it("flags MCQ without a correct option, duplicates and too few options", () => {
    const f = emptyForm();
    f.title = "Q"; f.body = "Body"; f.options = [{ text: "A", correct: false }, { text: "a", correct: false }];
    const errors = validateQuestionForm(f);
    expect(errors.join(" ")).toMatch(/correct/);
    expect(errors.join(" ")).toMatch(/unique/);
    f.options = [{ text: "A", correct: true }, { text: "", correct: false }];
    expect(validateQuestionForm(f).join(" ")).toMatch(/two options/);
  });
  it("rejects two correct answers unless multiple answers are allowed", () => {
    const f = emptyForm();
    f.title = "Q"; f.body = "B"; f.options = [{ text: "A", correct: true }, { text: "B", correct: true }];
    expect(validateQuestionForm(f).length).toBeGreaterThan(0);
    f.multipleCorrect = true;
    expect(validateQuestionForm(f)).toEqual([]);
  });
  it("validates coding limits, languages and test cases", () => {
    const f = emptyForm();
    f.type = "CODING"; f.title = "T"; f.body = "B"; f.languages = []; f.testCases = []; f.timeLimitMs = 5; f.memoryLimitMb = 1;
    expect(validateQuestionForm(f).length).toBeGreaterThanOrEqual(4);
  });
});

describe("formToRequest", () => {
  it("normalises tags and drops blank options", () => {
    const f = emptyForm();
    f.title = "  Hello "; f.body = "B"; f.tags = " java, SQL ,, "; f.options = [{ text: "A", correct: true }, { text: "B", correct: false }, { text: " ", correct: false }];
    const r = formToRequest(f);
    expect(r.title).toBe("Hello");
    expect(r.tags).toEqual(["java", "SQL"]);
    expect("mcq" in r && r.mcq?.options).toHaveLength(2);
    expect("expectedVersion" in r).toBe(false);
  });
  it("sends starter code only for enabled languages and includes expectedVersion on updates", () => {
    const f = emptyForm();
    f.type = "CODING"; f.title = "T"; f.body = "B"; f.languages = ["JAVA"];
    f.starter = { JAVA: "class Main {}", CPP: "int main(){}", PYTHON: "", JAVASCRIPT: "" };
    const r = formToRequest(f, 3);
    expect("coding" in r && r.coding?.starterCode).toEqual({ JAVA: "class Main {}" });
    expect(r.expectedVersion).toBe(3);
    expect("mcq" in r).toBe(false);
  });
});

describe("detailToForm", () => {
  it("round-trips a coding question", () => {
    const d: QuestionDetail = {
      id: "1", type: "CODING", status: "ACTIVE", currentVersion: 2, version: 2, title: "Sum", body: "Add", difficulty: "MEDIUM", tags: ["math", "easy"],
      mcq: null, versionCreatedAt: "", versionCreatedBy: "",
      coding: { languages: ["JAVA"], starterCode: { JAVA: "x" }, timeLimitMs: 1500, memoryLimitMb: 128, testCases: [{ input: "1", expectedOutput: "1", hidden: true, weight: 2 }] },
    };
    const f = detailToForm(d);
    expect(f.tags).toBe("math, easy");
    expect(f.starter.JAVA).toBe("x");
    expect(f.starter.PYTHON).toBe("");
    expect(f.testCases[0].hidden).toBe(true);
  });
});
