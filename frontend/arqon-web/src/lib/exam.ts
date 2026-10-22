import { z } from "zod";

export const answerSchema = z.object({
  selected: z.array(z.number()).nullish(),
  language: z.string().nullish(),
  code: z.string().nullish(),
});
export type Answer = z.infer<typeof answerSchema>;

const itemSchema = z.object({
  questionId: z.string(), version: z.number(), points: z.number(), coding: z.boolean(), title: z.string(), body: z.string(),
  options: z.array(z.string()), multipleCorrect: z.boolean(), languages: z.array(z.string()), starterCode: z.record(z.string(), z.string()),
  samples: z.array(z.object({ input: z.string(), expectedOutput: z.string() })), hiddenTestCount: z.number(),
});
export type ExamItem = z.infer<typeof itemSchema>;

export const sessionSchema = z.object({
  sessionToken: z.string().nullable(),
  status: z.enum(["IN_PROGRESS", "SUBMITTED", "AUTO_SUBMITTED"]),
  title: z.string(), startedAt: z.string(), deadlineAt: z.string(), submittedAt: z.string().nullable(), serverNow: z.string(),
  sections: z.array(z.object({ title: z.string(), coding: z.boolean(), items: z.array(itemSchema) })),
  answers: z.record(z.string(), answerSchema),
});
export type ExamSession = z.infer<typeof sessionSchema>;

export const savedSchema = z.object({ serverNow: z.string(), deadlineAt: z.string() });
export const submittedSchema = z.object({ status: z.string(), submittedAt: z.string().nullable() });

export const resultSchema = z.object({
  mcqScore: z.number(), mcqMax: z.number(), mcqPercent: z.number(), codingMax: z.number(), codingSubmitted: z.number(), codingQuestions: z.number(),
  codingStatus: z.string(), provisionalPercent: z.number(), passed: z.boolean().nullish(),
});
export const resultRowSchema = z.object({
  sessionId: z.string(), candidateEmail: z.string(), status: z.string(), startedAt: z.string(), submittedAt: z.string().nullable(), result: resultSchema.nullable(),
});
export const resultDetailSchema = z.object({
  summary: resultRowSchema,
  questions: z.array(z.object({
    questionId: z.string(), title: z.string(), coding: z.boolean(), points: z.number(), correct: z.boolean().nullish(),
    selected: z.array(z.number()).nullish(), correctOptions: z.array(z.number()).nullish(), options: z.array(z.string()).nullish(),
    language: z.string().nullish(), code: z.string().nullish(),
  })),
});

/** Milliseconds between the server's clock and this browser's clock, so the countdown follows the SERVER, not the device clock. */
export function clockOffset(serverNowIso: string, clientNowMs: number): number {
  return new Date(serverNowIso).getTime() - clientNowMs;
}

export function remainingMs(deadlineIso: string, offsetMs: number, clientNowMs: number): number {
  return Math.max(0, new Date(deadlineIso).getTime() - (clientNowMs + offsetMs));
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const KEY = "arqon.exam.session";
export const sessionStore = {
  get(): string | null { try { return window.sessionStorage.getItem(KEY); } catch { return null; } },
  set(token: string) { try { window.sessionStorage.setItem(KEY, token); } catch { /* storage may be blocked; the invite link can resume */ } },
  clear() { try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export function isAnswered(item: ExamItem, a: Answer | undefined): boolean {
  if (!a) return false;
  return item.coding ? !!a.code && a.code.trim().length > 0 : (a.selected?.length ?? 0) > 0;
}

export type ReviewSummary = { answered: number[]; unanswered: number[]; flagged: number[] };

/** Zero-based question positions grouped for the submit review. Flags are a personal bookmark, kept only in this browser. */
export function reviewSummary(items: ExamItem[], answers: Record<string, Answer | undefined>, flags: ReadonlySet<string>): ReviewSummary {
  const out: ReviewSummary = { answered: [], unanswered: [], flagged: [] };
  items.forEach((it, i) => {
    (isAnswered(it, answers[it.questionId]) ? out.answered : out.unanswered).push(i);
    if (flags.has(it.questionId)) out.flagged.push(i);
  });
  return out;
}

export const flagStore = {
  key: (sessionId: string) => `arqon-flags-${sessionId}`,
  read(sessionId: string): Set<string> {
    try { return new Set(JSON.parse(sessionStorage.getItem(this.key(sessionId)) ?? "[]") as string[]); } catch { return new Set(); }
  },
  write(sessionId: string, flags: ReadonlySet<string>) {
    try { sessionStorage.setItem(this.key(sessionId), JSON.stringify([...flags])); } catch { /* storage unavailable */ }
  },
};
