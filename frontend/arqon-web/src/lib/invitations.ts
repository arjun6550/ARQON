import { z } from "zod";

export const invitationViewSchema = z.object({
  id: z.string(),
  assessmentId: z.string(),
  candidateEmail: z.string(),
  status: z.enum(["PENDING", "OPENED", "EXPIRED", "REVOKED"]),
  emailStatus: z.enum(["PENDING", "SENT", "FAILED"]),
  sendCount: z.number(),
  expiresAt: z.string(),
  createdAt: z.string(),
  openedAt: z.string().nullable(),
  lastSentAt: z.string().nullable(),
});
export type InvitationView = z.infer<typeof invitationViewSchema>;

export const createResponseSchema = z.object({
  results: z.array(
    z.object({
      email: z.string(),
      outcome: z.enum(["CREATED", "DUPLICATE", "INVALID_EMAIL"]),
      invitationId: z.string().nullable(),
    })
  ),
  created: z.number(),
  skipped: z.number(),
});

export const resolvedSchema = z.object({
  candidate: z.string(),
  assessment: z.object({
    title: z.string(),
    scheduleType: z.enum(["FIXED_WINDOW", "FLEXIBLE_WINDOW"]),
    windowStart: z.string(),
    windowEnd: z.string(),
    durationMinutes: z.number(),
    requirements: z.object({
      camera: z.boolean(),
      microphone: z.boolean(),
      emailVerification: z.boolean(),
      otp: z.boolean(),
      idUpload: z.boolean(),
      selfie: z.boolean(),
    }),
  }),
  expiresAt: z.string(),
  windowState: z.enum(["UPCOMING", "OPEN", "ENDED"]),
});
export type Resolved = z.infer<typeof resolvedSchema>;

export const realtimeMailSchema = z.object({
  id: z.string(),
  recipientEmail: z.string(),
  assessmentTitle: z.string(),
  subject: z.string(),
  candidateLink: z.string(),
  sentAt: z.string(),
  status: z.string(),
  deliveryMethod: z.string(),
  errorMessage: z.string().nullable(),
  htmlContent: z.string().nullable(),
});
export type RealtimeMail = z.infer<typeof realtimeMailSchema>;

export const smtpStatusSchema = z.object({
  configured: z.boolean(),
  host: z.string(),
  port: z.number(),
  mailFrom: z.string(),
  mode: z.string(),
});
export type SmtpStatus = z.infer<typeof smtpStatusSchema>;

export const MAX_BATCH = 100;
const EMAIL =
  /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/** Splits pasted text on commas, semicolons, spaces and newlines; lower-cases, removes duplicates, keeps order. */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    (email.length <= 254 && EMAIL.test(email) ? valid : invalid).push(email);
  }
  return { valid, invalid };
}

/** The invitation token travels in the URL fragment (never sent to servers or logged): /invite#<token>. */
export function tokenFromHash(hash: string): string | null {
  const t = hash.replace(/^#/, "").trim();
  return /^[A-Za-z0-9_-]{43}$/.test(t) ? t : null;
}
