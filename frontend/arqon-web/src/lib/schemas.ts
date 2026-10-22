import { z } from "zod";

export const roleSchema = z.enum(["SUPER_ADMIN", "ORG_ADMIN", "RECRUITER", "PROCTOR", "CANDIDATE"]);
export type Role = z.infer<typeof roleSchema>;

export const userSchema = z.object({ id: z.string(), email: z.string(), role: roleSchema, tenantId: z.string().nullable() });
export type UserView = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({ accessToken: z.string(), tokenType: z.string(), expiresIn: z.number(), user: userSchema });

export const organizationSchema = z.object({ id: z.string(), name: z.string(), slug: z.string(), status: z.string(), createdAt: z.string() });
export type Organization = z.infer<typeof organizationSchema>;

export const platformOverviewSchema = z.object({
  platformName: z.string(),
  version: z.string(),
  status: z.string(),
  timestamp: z.string(),
  organizations: z.object({ total: z.number(), active: z.number(), suspended: z.number() }),
  users: z.object({ total: z.number(), orgAdmins: z.number(), recruiters: z.number(), candidates: z.number() }),
  questions: z.object({ total: z.number(), coding: z.number(), mcq: z.number() }),
  assessments: z.object({ total: z.number(), draft: z.number(), published: z.number() }),
  exams: z.object({ total: z.number(), inProgress: z.number(), completed: z.number() }),
  supportedLanguages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    version: z.string(),
    defaultMemoryLimit: z.string(),
    defaultTimeout: z.string(),
  })),
});
export type PlatformOverview = z.infer<typeof platformOverviewSchema>;

export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), page: z.number(), size: z.number(), totalElements: z.number() });

/** Where each role lands after sign-in. Navigation only; the backend enforces access. */
export const roleHome: Record<Role, string> = {
  SUPER_ADMIN: "/super-admin",
  ORG_ADMIN: "/admin",
  RECRUITER: "/recruiter",
  PROCTOR: "/proctor",
  CANDIDATE: "/candidate",
};
