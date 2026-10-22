import { z } from "zod";
import { LANGUAGES, type Language } from "./questions";

export const scheduleTypeSchema = z.enum(["FIXED_WINDOW", "FLEXIBLE_WINDOW"]);
export const sectionTypeSchema = z.enum(["MCQ", "CODING"]);
export const tabActionSchema = z.enum(["RECORD", "WARN", "FLAG_FOR_REVIEW"]);
export const statusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type ScheduleType = z.infer<typeof scheduleTypeSchema>;
export type TabAction = z.infer<typeof tabActionSchema>;

const bool = z.boolean();
const sectionSchema = z.object({
  title: z.string(), type: sectionTypeSchema,
  items: z.array(z.object({ questionId: z.string(), version: z.number(), points: z.number() })),
});
const configSchema = z.object({
  schedule: z.object({ type: scheduleTypeSchema, windowStart: z.string(), windowEnd: z.string(), durationMinutes: z.number() }),
  allowedLanguages: z.array(z.enum(LANGUAGES)),
  integrity: z.object({ fullscreenRequired: bool, cameraRequired: bool, microphoneRequired: bool, blockCopyPaste: bool, tabSwitchAction: tabActionSchema, maxWarnings: z.number() }),
  scoring: z.object({ weights: z.record(z.string(), z.number()), passPercentage: z.number() }),
  visibility: z.object({ mcqImmediate: bool, codingAfterSubmit: bool, showHiddenTestDetails: bool, showCorrectAnswers: bool }),
  recovery: z.object({ allowRecovery: bool, graceSeconds: z.number(), maxRecoveries: z.number() }),
  identity: z.object({ emailVerification: bool, otp: bool, idUpload: bool, selfie: bool }),
  singleSession: bool,
});

export const assessmentSummarySchema = z.object({
  id: z.string(), title: z.string(), status: statusSchema, scheduleType: scheduleTypeSchema, windowStart: z.string(), windowEnd: z.string(),
  durationMinutes: z.number(), sectionCount: z.number(), questionCount: z.number(), revision: z.number(), updatedAt: z.string(),
});
export const assessmentDetailSchema = z.object({
  id: z.string(), title: z.string(), description: z.string().nullable(), status: statusSchema, revision: z.number(),
  config: configSchema, sections: z.array(sectionSchema), sourceAssessmentId: z.string().nullable(),
  createdAt: z.string(), updatedAt: z.string(), publishedAt: z.string().nullable(),
});
export type AssessmentDetail = z.infer<typeof assessmentDetailSchema>;

export type SectionForm = { title: string; type: SectionType; items: { questionId: string; version: number; points: number; title: string }[] };

export type AssessmentFormValues = {
  title: string; description: string;
  scheduleType: ScheduleType; windowStart: string; windowEnd: string; durationMinutes: number; // datetime-local strings
  languages: Language[];
  fullscreenRequired: boolean; cameraRequired: boolean; microphoneRequired: boolean; blockCopyPaste: boolean;
  tabSwitchAction: TabAction; maxWarnings: number;
  weightMcq: number; weightCoding: number; passPercentage: number;
  mcqImmediate: boolean; codingAfterSubmit: boolean; showHiddenTestDetails: boolean; showCorrectAnswers: boolean;
  allowRecovery: boolean; graceSeconds: number; maxRecoveries: number;
  emailVerification: boolean; otp: boolean; idUpload: boolean; selfie: boolean;
  singleSession: boolean;
  sections: SectionForm[];
};

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO instant -> value for <input type="datetime-local"> (browser local time). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

export function emptyAssessmentForm(now: Date = new Date()): AssessmentFormValues {
  const start = new Date(now.getTime() + 24 * 3600_000);
  const end = new Date(now.getTime() + 8 * 24 * 3600_000);
  return {
    title: "", description: "",
    scheduleType: "FLEXIBLE_WINDOW", windowStart: toLocalInput(start.toISOString()), windowEnd: toLocalInput(end.toISOString()), durationMinutes: 90,
    languages: ["JAVA", "PYTHON"],
    fullscreenRequired: true, cameraRequired: false, microphoneRequired: false, blockCopyPaste: true, tabSwitchAction: "WARN", maxWarnings: 3,
    weightMcq: 40, weightCoding: 60, passPercentage: 50,
    mcqImmediate: false, codingAfterSubmit: true, showHiddenTestDetails: false, showCorrectAnswers: false,
    allowRecovery: true, graceSeconds: 300, maxRecoveries: 3,
    emailVerification: true, otp: false, idUpload: false, selfie: false,
    singleSession: true,
    sections: [],
  };
}

export const typesPresent = (v: AssessmentFormValues): SectionType[] =>
  (["MCQ", "CODING"] as SectionType[]).filter((t) => v.sections.some((s) => s.type === t));

/** Weights are sent only for section types that exist (the server requires exactly those, adding up to 100). */
export function buildWeights(v: AssessmentFormValues): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const t of typesPresent(v)) weights[t] = t === "MCQ" ? v.weightMcq : v.weightCoding;
  return weights;
}

export function validateAssessmentForm(v: AssessmentFormValues, forPublish: boolean, now: Date = new Date()): string[] {
  const errors: string[] = [];
  if (!v.title.trim()) errors.push("Title is required.");
  const start = new Date(v.windowStart).getTime();
  const end = new Date(v.windowEnd).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) errors.push("Start and end are required.");
  else {
    const windowMinutes = (end - start) / 60000;
    if (end <= start) errors.push("The end must be after the start.");
    else if (v.scheduleType === "FIXED_WINDOW" && (windowMinutes < 5 || windowMinutes > 180)) errors.push("A fixed window must last between 5 and 180 minutes.");
    else if (v.scheduleType === "FLEXIBLE_WINDOW" && windowMinutes < v.durationMinutes) errors.push("The start window must be at least as long as the duration.");
    if (forPublish && end <= now.getTime()) errors.push("The end must be in the future to publish.");
  }
  if (v.scheduleType === "FLEXIBLE_WINDOW" && !(v.durationMinutes >= 5 && v.durationMinutes <= 180)) errors.push("Duration must be 5-180 minutes (max 3 hours).");
  if (v.sections.some((s) => s.type === "CODING") && v.languages.length === 0) errors.push("Enable at least one language for coding sections.");
  if (v.sections.some((s) => !s.title.trim())) errors.push("Every section needs a title.");
  if (v.sections.some((s) => s.items.some((i) => !(i.points >= 1 && i.points <= 1000)))) errors.push("Question points must be between 1 and 1000.");
  if (forPublish) {
    if (v.sections.length === 0) errors.push("Add at least one section.");
    if (v.sections.some((s) => s.items.length === 0)) errors.push("Every section needs at least one question.");
    const weights = buildWeights(v);
    const values = Object.values(weights);
    if (values.length > 0 && (values.reduce((a, b) => a + b, 0) !== 100 || values.some((w) => !(w > 0)))) errors.push("Scoring weights must be above 0 and add up to 100.");
  }
  return errors;
}

export function formToRequest(v: AssessmentFormValues, expectedRevision?: number) {
  return {
    title: v.title.trim(),
    description: v.description.trim() || null,
    config: {
      schedule: { type: v.scheduleType, windowStart: fromLocalInput(v.windowStart), windowEnd: fromLocalInput(v.windowEnd), durationMinutes: v.durationMinutes },
      allowedLanguages: v.languages,
      integrity: { fullscreenRequired: v.fullscreenRequired, cameraRequired: v.cameraRequired, microphoneRequired: v.microphoneRequired, blockCopyPaste: v.blockCopyPaste, tabSwitchAction: v.tabSwitchAction, maxWarnings: v.maxWarnings },
      scoring: { weights: buildWeights(v), passPercentage: v.passPercentage },
      visibility: { mcqImmediate: v.mcqImmediate, codingAfterSubmit: v.codingAfterSubmit, showHiddenTestDetails: v.showHiddenTestDetails, showCorrectAnswers: v.showCorrectAnswers },
      recovery: { allowRecovery: v.allowRecovery, graceSeconds: v.graceSeconds, maxRecoveries: v.maxRecoveries },
      identity: { emailVerification: v.emailVerification, otp: v.otp, idUpload: v.idUpload, selfie: v.selfie },
      singleSession: v.singleSession,
    },
    sections: v.sections.map((s) => ({ title: s.title.trim(), type: s.type, items: s.items.map((i) => ({ questionId: i.questionId, version: i.version, points: i.points })) })),
    ...(expectedRevision !== undefined ? { expectedRevision } : {}),
  };
}

/** titles: questionId -> title, used only to display pinned questions in the editor. */
export function detailToForm(d: AssessmentDetail, titles: Record<string, string> = {}): AssessmentFormValues {
  const c = d.config;
  return {
    title: d.title, description: d.description ?? "",
    scheduleType: c.schedule.type, windowStart: toLocalInput(c.schedule.windowStart), windowEnd: toLocalInput(c.schedule.windowEnd), durationMinutes: c.schedule.durationMinutes,
    languages: c.allowedLanguages,
    ...c.integrity,
    weightMcq: c.scoring.weights.MCQ ?? 40, weightCoding: c.scoring.weights.CODING ?? 60, passPercentage: c.scoring.passPercentage,
    ...c.visibility, ...c.recovery, ...c.identity,
    singleSession: c.singleSession,
    sections: d.sections.map((s) => ({ title: s.title, type: s.type, items: s.items.map((i) => ({ ...i, title: titles[i.questionId] ?? `Question ${i.questionId.slice(0, 8)}…` })) })),
  };
}
