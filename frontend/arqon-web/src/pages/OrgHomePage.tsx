import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BookOpen,
  FileEdit,
  Rocket,
  Plus,
  Mail,
  BarChart3,
  ArrowRight,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { ErrorPanel } from "../components/ErrorPanel";
import { Skeleton } from "../components/Skeleton";
import { apiFetch } from "../lib/apiClient";
import { assessmentSummarySchema } from "../lib/assessments";
import { useAuth } from "../lib/auth";
import { questionSummarySchema } from "../lib/questions";
import { organizationSchema, pageOf } from "../lib/schemas";
import { realtimeMailSchema, type RealtimeMail } from "../lib/invitations";
import { z } from "zod";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

function Stat({
  value,
  label,
  to,
  loading,
  icon,
}: {
  value: number | undefined;
  label: string;
  to: string;
  loading: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="panel stat block no-underline transition-all hover:border-ink hover:shadow-md border border-line bg-panel rounded-2xl p-5 group"
    >
      <div className="flex items-center justify-between text-muted mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunk/60 text-ink group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1 group-hover:text-ink transition-colors">
          <span>View</span>
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <div className="stat-value text-3xl font-extrabold text-ink font-mono">{value ?? 0}</div>
      )}
      <div className="stat-label text-xs font-semibold text-muted mt-1.5">{label}</div>
    </Link>
  );
}

/** Landing for tenant-bound roles: organization, counts, and the work in progress. */
export function OrgHomePage({ title }: { title: string }) {
  const { state } = useAuth();
  const canManage =
    state.status === "authenticated" && (state.user.role === "RECRUITER" || state.user.role === "ORG_ADMIN");
  const org = useQuery({ queryKey: ["org", "me"], queryFn: () => apiFetch("/api/v1/organizations/me", organizationSchema) });

  const questions = useQuery({
    queryKey: ["count", "questions"],
    enabled: canManage,
    queryFn: () => apiFetch("/api/v1/questions?page=0&size=1", pageOf(questionSummarySchema)),
  });

  const drafts = useQuery({
    queryKey: ["count", "drafts"],
    enabled: canManage,
    queryFn: () => apiFetch("/api/v1/assessments?page=0&size=1&status=DRAFT", pageOf(assessmentSummarySchema)),
  });

  const published = useQuery({
    queryKey: ["assessments", "PUBLISHED", "recent"],
    enabled: canManage,
    queryFn: () => apiFetch("/api/v1/assessments?page=0&size=5&status=PUBLISHED", pageOf(assessmentSummarySchema)),
  });

  // Real-time mail outbox feed for live activity ticker
  const outbox = useQuery({
    queryKey: ["recent-outbox"],
    enabled: canManage,
    queryFn: () => apiFetch("/api/v1/invitations/outbox", z.array(realtimeMailSchema)),
    refetchInterval: 5000,
  });

  const total = (q: { data?: unknown }) => (q.data as { totalElements: number } | undefined)?.totalElements;

  return (
    <div className="space-y-8">
      {/* Organization Header */}
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="page-title text-2xl md:text-3xl font-extrabold text-ink">
                {org.data ? org.data.name : title}
              </h1>
              {org.data && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {org.data.status}
                </span>
              )}
            </div>
            <p className="hint mt-1.5 text-xs md:text-sm text-muted">
              {title} {org.data ? `· Tenant slug: ${org.data.slug}` : ""}
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2.5">
              <Link to="/questions/new" className="btn btn-quiet btn-sm no-underline text-xs font-semibold">
                + New Question
              </Link>
              <Link
                to="/assessments/new"
                className="btn btn-primary btn-sm no-underline text-xs shadow-md font-semibold flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Assessment</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {org.isError && <ErrorPanel error={org.error} />}

      {canManage ? (
        <>
          {/* Key Metric Blocks */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              value={total(questions)}
              label="Questions in your bank"
              to="/questions"
              loading={questions.isPending}
              icon={<BookOpen className="h-5 w-5 text-sky-500" />}
            />
            <Stat
              value={total(drafts)}
              label="Assessments in draft"
              to="/assessments"
              loading={drafts.isPending}
              icon={<FileEdit className="h-5 w-5 text-amber-500" />}
            />
            <Stat
              value={total(published)}
              label="Assessments published"
              to="/assessments"
              loading={published.isPending}
              icon={<Rocket className="h-5 w-5 text-emerald-500" />}
            />
          </div>

          {/* Quick Actions & Workflow Helper Bar */}
          <div className="panel p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 bg-sunk/30 border border-line">
            <div className="text-xs text-muted flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                <strong className="text-ink">Hiring Workflow:</strong> 1. Author Questions → 2. Assemble Assessment → 3. Publish & Invite Candidates → 4. Review Real-Time Scores.
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Link to="/questions" className="link-action text-xs font-semibold">
                Question Repository →
              </Link>
              <span className="text-line">•</span>
              <Link to="/assessments" className="link-action text-xs font-semibold">
                All Assessments →
              </Link>
            </div>
          </div>

          {/* Published Assessments Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title text-lg font-bold text-ink">Live Published Assessments</h2>
                <p className="text-xs text-muted">Assessments ready for candidate invitation or currently open.</p>
              </div>
              <Link to="/assessments/new" className="btn btn-primary btn-sm no-underline text-xs font-semibold">
                New Assessment
              </Link>
            </div>

            {published.isPending ? (
              <Skeleton className="h-32 rounded-2xl" />
            ) : (
              <ul className="panel divide-y text-sm rounded-2xl overflow-hidden shadow-xs border border-line bg-panel">
                {published.data?.items.length === 0 && (
                  <li>
                    <EmptyState
                      title="No assessments published yet"
                      action={
                        <Link to="/questions/new" className="btn btn-quiet btn-sm no-underline">
                          Write a question
                        </Link>
                      }
                    >
                      Write questions, assemble them into an assessment, and publish it. Then candidates can be invited.
                    </EmptyState>
                  </li>
                )}
                {published.data?.items.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-sunk/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <Link to={`/assessments/${a.id}`} className="font-bold text-ink hover:underline text-base">
                          {a.title}
                        </Link>
                        <span className="badge badge-ok text-[10px] font-bold">PUBLISHED</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted mt-1.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5 text-muted" />
                          <span>{a.durationMinutes} min</span>
                        </span>
                        <span>•</span>
                        <span>{a.questionCount} questions</span>
                        <span>•</span>
                        <span>Closes {when(a.windowEnd)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <Link
                        to={`/assessments/${a.id}/invitations`}
                        className="btn btn-quiet btn-sm text-xs font-semibold no-underline flex items-center gap-1.5 hover:border-ink"
                      >
                        <Mail className="h-3.5 w-3.5 text-pink-500" />
                        <span>Invite Candidates</span>
                      </Link>
                      <Link
                        to={`/assessments/${a.id}/results`}
                        className="btn btn-quiet btn-sm text-xs font-semibold no-underline flex items-center gap-1.5 hover:border-ink"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>View Results</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Real-Time Candidate Email Outbox Ticker */}
          {outbox.data && outbox.data.length > 0 && (
            <div className="panel p-5 rounded-2xl border border-line bg-panel shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Live Candidate Delivery Stream
                  </h3>
                </div>
                <Link to="/assessments" className="text-xs text-muted hover:text-ink">
                  View Full Outbox →
                </Link>
              </div>

              <div className="space-y-2">
                {outbox.data.slice(0, 3).map((m: RealtimeMail) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-line bg-sunk/20 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{m.recipientEmail}</p>
                      <p className="text-[11px] text-muted truncate">{m.subject}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="badge badge-ok text-[10px] font-bold">{m.deliveryMethod}</span>
                      <a
                        href={m.candidateLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-quiet btn-sm !py-1 text-[11px] font-semibold flex items-center gap-1 no-underline"
                      >
                        <span>Open Exam</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="panel p-6 rounded-2xl border border-line space-y-2">
          <div className="flex items-center gap-2 text-ink font-bold text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Security & Proctoring Supervision Mode</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Live proctoring monitors, candidate camera feeds, and automated integrity alerts will display here
            during scheduled examination windows.
          </p>
        </div>
      )}
    </div>
  );
}
