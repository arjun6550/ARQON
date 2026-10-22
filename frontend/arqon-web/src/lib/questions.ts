import { z } from "zod";

export const LANGUAGES = ["JAVA", "CPP", "PYTHON", "JAVASCRIPT"] as const;
export type Language = (typeof LANGUAGES)[number];
export const languageLabels: Record<Language, string> = { JAVA: "Java", CPP: "C++", PYTHON: "Python", JAVASCRIPT: "JavaScript" };

export const typeSchema = z.enum(["MCQ", "CODING"]);
export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export type QuestionType = z.infer<typeof typeSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;

const mcqSchema = z.object({
  options: z.array(z.object({ text: z.string(), correct: z.boolean() })),
  multipleCorrect: z.boolean(),
});
const codingSchema = z.object({
  languages: z.array(z.enum(LANGUAGES)),
  starterCode: z.record(z.string(), z.string()).nullable().optional(),
  timeLimitMs: z.number(),
  memoryLimitMb: z.number(),
  testCases: z.array(z.object({ input: z.string(), expectedOutput: z.string(), hidden: z.boolean(), weight: z.number() })),
});

export const questionSummarySchema = z.object({
  id: z.string(), type: typeSchema, title: z.string(), difficulty: difficultySchema,
  tags: z.array(z.string()), currentVersion: z.number(), updatedAt: z.string(),
});
export const questionDetailSchema = z.object({
  id: z.string(), type: typeSchema, status: z.string(), currentVersion: z.number(), version: z.number(),
  title: z.string(), body: z.string(), difficulty: difficultySchema, tags: z.array(z.string()),
  mcq: mcqSchema.nullable(), coding: codingSchema.nullable(), versionCreatedAt: z.string(), versionCreatedBy: z.string(),
});
export const versionSummarySchema = z.object({ version: z.number(), title: z.string(), createdAt: z.string(), createdBy: z.string() });
export type QuestionDetail = z.infer<typeof questionDetailSchema>;

export type QuestionFormValues = {
  type: QuestionType;
  title: string;
  body: string;
  difficulty: Difficulty;
  tags: string; // comma separated in the UI
  multipleCorrect: boolean;
  options: { text: string; correct: boolean }[];
  languages: Language[];
  timeLimitMs: number;
  memoryLimitMb: number;
  starter: Record<Language, string>;
  testCases: { input: string; expectedOutput: string; hidden: boolean; weight: number }[];
};

export const emptyForm = (): QuestionFormValues => ({
  type: "MCQ", title: "", body: "", difficulty: "EASY", tags: "", multipleCorrect: false,
  options: [{ text: "", correct: true }, { text: "", correct: false }],
  languages: ["JAVA", "PYTHON"], timeLimitMs: 2000, memoryLimitMb: 256,
  starter: { JAVA: "", CPP: "", PYTHON: "", JAVASCRIPT: "" },
  testCases: [{ input: "", expectedOutput: "", hidden: false, weight: 1 }],
});

/** Client-side checks for fast feedback. The server validates everything again. */
export function validateQuestionForm(v: QuestionFormValues): string[] {
  const errors: string[] = [];
  if (!v.title.trim()) errors.push("Title is required.");
  if (!v.body.trim()) errors.push("Question text is required.");
  if (v.type === "MCQ") {
    const options = v.options.filter((o) => o.text.trim());
    const correct = options.filter((o) => o.correct).length;
    if (options.length < 2) errors.push("Add at least two options.");
    if (correct === 0) errors.push("Mark at least one option as correct.");
    if (!v.multipleCorrect && correct > 1) errors.push("Only one option can be correct unless multiple answers are allowed.");
    if (new Set(options.map((o) => o.text.trim().toLowerCase())).size !== options.length) errors.push("Option texts must be unique.");
  } else {
    if (v.languages.length === 0) errors.push("Enable at least one language.");
    if (v.testCases.length === 0) errors.push("Add at least one test case.");
    if (v.testCases.some((t) => !(t.weight >= 1 && t.weight <= 100))) errors.push("Test case weights must be between 1 and 100.");
    if (!(v.timeLimitMs >= 100 && v.timeLimitMs <= 30000)) errors.push("Time limit must be 100-30000 ms.");
    if (!(v.memoryLimitMb >= 16 && v.memoryLimitMb <= 1024)) errors.push("Memory limit must be 16-1024 MB.");
  }
  return errors;
}

export function formToRequest(v: QuestionFormValues, expectedVersion?: number) {
  const base = {
    type: v.type,
    title: v.title.trim(),
    body: v.body,
    difficulty: v.difficulty,
    tags: v.tags.split(",").map((t) => t.trim()).filter(Boolean),
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
  };
  if (v.type === "MCQ") {
    return {
      ...base,
      mcq: { multipleCorrect: v.multipleCorrect, options: v.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text.trim(), correct: o.correct })) },
    };
  }
  const starterCode: Record<string, string> = {};
  for (const lang of v.languages) {
    if (v.starter[lang]?.trim()) starterCode[lang] = v.starter[lang];
  }
  return {
    ...base,
    coding: { languages: v.languages, starterCode, timeLimitMs: v.timeLimitMs, memoryLimitMb: v.memoryLimitMb, testCases: v.testCases },
  };
}

export function detailToForm(d: QuestionDetail): QuestionFormValues {
  const form = emptyForm();
  form.type = d.type;
  form.title = d.title;
  form.body = d.body;
  form.difficulty = d.difficulty;
  form.tags = d.tags.join(", ");
  if (d.mcq) {
    form.multipleCorrect = d.mcq.multipleCorrect;
    form.options = d.mcq.options.map((o) => ({ ...o }));
  }
  if (d.coding) {
    form.languages = d.coding.languages;
    form.timeLimitMs = d.coding.timeLimitMs;
    form.memoryLimitMb = d.coding.memoryLimitMb;
    for (const lang of LANGUAGES) form.starter[lang] = d.coding.starterCode?.[lang] ?? "";
    form.testCases = d.coding.testCases.map((t) => ({ ...t }));
  }
  return form;
}
