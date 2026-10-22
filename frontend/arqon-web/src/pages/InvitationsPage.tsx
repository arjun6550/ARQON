import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { useConfirm } from "../components/Confirm";
import { EmptyState } from "../components/EmptyState";
import { ErrorPanel } from "../components/ErrorPanel";
import { Modal } from "../components/Modal";
import { ListSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toaster";
import { apiFetch, jsonInit } from "../lib/apiClient";
import { assessmentDetailSchema } from "../lib/assessments";
import {
  MAX_BATCH,
  createResponseSchema,
  invitationViewSchema,
  parseEmails,
  realtimeMailSchema,
  smtpStatusSchema,
  type RealtimeMail,
} from "../lib/invitations";
import { pageOf } from "../lib/schemas";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const emailBadge: Record<string, string> = {
  PENDING: "bg-slate-500/10 text-slate-500",
  SENT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  FAILED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
};

const statusBadge: Record<string, string> = {
  INVITED: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  OPENED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  STARTED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  REVOKED: "bg-slate-500/10 text-slate-400 line-through",
};

export function InvitationsPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [text, setText] = useState("");
  const [page, setPage] = useState(0);
  const [testEmailInput, setTestEmailInput] = useState("");
  const [previewMail, setPreviewMail] = useState<RealtimeMail | null>(null);
  const parsed = parseEmails(text);

  const assessment = useQuery({
    queryKey: ["assessment", id],
    queryFn: () => apiFetch(`/api/v1/assessments/${id}`, assessmentDetailSchema),
  });

  const list = useQuery({
    queryKey: ["invitations", id, page],
    queryFn: () => apiFetch(`/api/v1/assessments/${id}/invitations?page=${page}&size=20`, pageOf(invitationViewSchema)),
  });

  const outbox = useQuery({
    queryKey: ["mail-outbox"],
    queryFn: () => apiFetch("/api/v1/invitations/outbox", z.array(realtimeMailSchema)),
    refetchInterval: 4000,
  });

  const smtpStatus = useQuery({
    queryKey: ["smtp-status"],
    queryFn: () => apiFetch("/api/v1/invitations/smtp-status", smtpStatusSchema),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["invitations", id] });
    return qc.invalidateQueries({ queryKey: ["mail-outbox"] });
  };

  const create = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/assessments/${id}/invitations`, createResponseSchema, jsonInit("POST", { emails: parsed.valid })),
    onSuccess: () => {
      setText("");
      setPage(0);
      toast.show("Invitations dispatched in real-time");
      void refresh();
    },
  });

  const resend = useMutation({
    mutationFn: (inv: string) => apiFetch(`/api/v1/invitations/${inv}/resend`, z.undefined(), jsonInit("POST")),
    onSuccess: () => {
      toast.show("Invitation email re-sent");
      void refresh();
    },
  });

  const revoke = useMutation({
    mutationFn: (inv: string) => apiFetch(`/api/v1/invitations/${inv}`, z.undefined(), jsonInit("DELETE")),
    onSuccess: () => {
      toast.show("Invitation revoked");
      void refresh();
    },
  });

  const sendTest = useMutation({
    mutationFn: (email: string) =>
      apiFetch(
        "/api/v1/invitations/send-test-email",
        z.object({
          success: z.boolean(),
          recipient: z.string(),
          deliveryMethod: z.string(),
          message: z.string(),
        }),
        jsonInit("POST", { email })
      ),
    onSuccess: (data) => {
      toast.show(data.message);
      setTestEmailInput("");
      return qc.invalidateQueries({ queryKey: ["mail-outbox"] });
    },
  });

  const published = assessment.data?.status === "PUBLISHED";
  const tooMany = parsed.valid.length > MAX_BATCH;
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.totalElements / list.data.size)) : 1;
  const skipped = create.data?.results.filter((r) => r.outcome !== "CREATED") ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Title */}
      <div className="border-b border-line pb-5">
        <Link to="/assessments" className="link-action text-xs">
          ← Back to Assessments
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title text-2xl font-bold">
                Candidate Invitations
                {assessment.data ? `: ${assessment.data.title}` : ""}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Real-Time Delivery
              </span>
            </div>
            <p className="text-xs text-muted mt-1">
              Dispatch secure invitation links and monitor real-time candidate email delivery.
            </p>
          </div>
          <span className="badge font-mono text-xs">
            {list.data ? `${list.data.totalElements} candidate records` : "..."}
          </span>
        </div>
      </div>

      {/* SMTP Gateway Status Banner & On-Demand Test Sender */}
      <div className="panel p-4 rounded-xl border border-line bg-panel flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold">
            ✉️
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold text-ink">
              <span>Mail Gateway:</span>
              {smtpStatus.data?.mode === "REAL_SMTP" ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  SMTP Relay Connected ({smtpStatus.data.host}:{smtpStatus.data.port})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sky-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  Real-Time Candidate Outbox Stream (Local / Dev Mode)
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted">
              Sender: {smtpStatus.data?.mailFrom ?? "ARQON Assessments <no-reply@arqon.local>"}
            </div>
          </div>
        </div>

        {/* Immediate Test Email Sender Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (testEmailInput.trim()) sendTest.mutate(testEmailInput.trim());
          }}
          className="flex items-center gap-2 text-xs"
        >
          <input
            type="email"
            placeholder="Send test mail to inbox…"
            value={testEmailInput}
            onChange={(e) => setTestEmailInput(e.target.value)}
            className="border px-3 py-1.5 rounded-lg text-xs w-56 bg-panel"
            required
          />
          <button
            type="submit"
            disabled={sendTest.isPending || !testEmailInput.trim()}
            className="btn btn-quiet btn-sm text-xs font-semibold shrink-0"
          >
            {sendTest.isPending ? "Sending…" : "Send Test Mail"}
          </button>
        </form>
      </div>

      {assessment.isError && <ErrorPanel error={assessment.error} />}

      {assessment.data && !published && (
        <div className="notice rounded-xl p-4 text-xs font-medium">
          ⚠️ This assessment is in {assessment.data.status} status. Only published assessments can be used to invite candidates.
        </div>
      )}

      {/* Bulk Invite Box */}
      {published && (
        <section className="panel p-6 rounded-xl border border-line bg-panel shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Invite Candidates in Bulk</h2>
              <p className="text-xs text-muted mt-0.5">
                Paste email addresses separated by commas, spaces, or line breaks (up to {MAX_BATCH} per batch).
              </p>
            </div>
            {parsed.valid.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                {parsed.valid.length} valid email{parsed.valid.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <textarea
            id="emails"
            className="w-full border p-3 text-xs rounded-xl font-mono h-24"
            placeholder="candidate1@example.com, candidate2@example.com&#10;candidate3@company.org"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-xs text-muted">
              {parsed.invalid.length > 0 && (
                <span className="text-rose-500 font-medium">
                  Invalid emails: {parsed.invalid.join(", ")}
                </span>
              )}
              {tooMany && <span className="text-rose-500 font-medium">Maximum {MAX_BATCH} emails allowed per batch.</span>}
            </div>

            <button
              className="btn btn-primary text-xs font-semibold px-4 py-2 shadow-xs"
              disabled={create.isPending || parsed.valid.length === 0 || tooMany}
              onClick={() => create.mutate()}
            >
              {create.isPending
                ? "Dispatching in Real-Time…"
                : `Send ${parsed.valid.length || ""} Invitation${parsed.valid.length === 1 ? "" : "s"}`}
            </button>
          </div>

          {create.isError && <ErrorPanel error={create.error} />}

          {create.data && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              ✓ Successfully generated {create.data.created} invitation{create.data.created === 1 ? "" : "s"}.
              {skipped.length > 0 && (
                <span className="ml-1 text-muted">
                  ({skipped.length} skipped: {skipped.map((s) => `${s.email} [${s.outcome}]`).join(", ")})
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* Real-Time Outbox Delivery Stream */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="section-title text-base font-bold">Real-Time Candidate Email Delivery Stream</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Stream
            </span>
          </div>
          <span className="text-xs text-muted font-mono">
            {outbox.data ? `${outbox.data.length} emails dispatched` : "Connecting…"}
          </span>
        </div>

        {outbox.data && outbox.data.length > 0 ? (
          <div className="panel overflow-hidden rounded-xl border border-line shadow-xs">
            <ul className="divide-y text-xs">
              {outbox.data.slice(0, 10).map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-sunk/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink text-sm">{m.recipientEmail}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.2 text-[10px] font-semibold ${
                          m.status === "DELIVERED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        ✓ {m.status}
                      </span>
                      <span className="badge text-[10px] font-mono">
                        {m.deliveryMethod === "REAL_SMTP" ? "⚡ SMTP" : "📡 Outbox Stream"}
                      </span>
                      <span className="text-[11px] text-muted">
                        {new Date(m.sentAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted mt-0.5 truncate">
                      Subject: {m.subject} · Assessment: {m.assessmentTitle}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="btn btn-quiet btn-sm text-xs font-medium"
                      onClick={() => setPreviewMail(m)}
                    >
                      👁️ Preview HTML Email
                    </button>
                    <a
                      href={m.candidateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm text-xs font-medium no-underline shadow-xs"
                      title="Test candidate examination experience with this token"
                    >
                      🚀 Open as Candidate →
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="panel p-5 rounded-xl border border-line text-xs text-muted text-center">
            No emails dispatched in current session yet. Send invitations above or trigger a test email to monitor live transmission.
          </div>
        )}
      </section>

      {/* Invitations History Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-base font-bold">Assessment Candidate Roster</h2>
          <span className="text-xs text-muted">
            Page {page + 1} of {totalPages}
          </span>
        </div>

        {(resend.isError || revoke.isError) && <ErrorPanel error={resend.error ?? revoke.error} />}
        {list.isError && <ErrorPanel error={list.error} />}
        {list.isPending && <ListSkeleton />}

        {list.data && (
          <>
            <div className="panel overflow-hidden rounded-xl border border-line shadow-xs">
              <ul className="divide-y text-sm">
                {list.data.items.length === 0 && (
                  <li>
                    <EmptyState title="No invitations issued yet">
                      Paste candidate email addresses above to dispatch personalized exam links.
                    </EmptyState>
                  </li>
                )}

                {list.data.items.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-sunk/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-ink text-sm">{i.candidateEmail}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            statusBadge[i.status] ?? "bg-sunk text-muted"
                          }`}
                        >
                          {i.status}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            emailBadge[i.emailStatus] ?? "bg-sunk text-muted"
                          }`}
                        >
                          Mail {i.emailStatus.toLowerCase()}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span>Expires: {fmt(i.expiresAt)}</span>
                        {i.openedAt && <span>Opened: {fmt(i.openedAt)}</span>}
                        <span>Sent {i.sendCount} time{i.sendCount === 1 ? "" : "s"}</span>
                      </div>
                    </div>

                    {i.status !== "REVOKED" && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          className="btn btn-quiet btn-sm text-xs font-medium"
                          disabled={resend.isPending}
                          onClick={() => resend.mutate(i.id)}
                        >
                          Resend Email
                        </button>
                        <button
                          className="link-danger text-xs font-medium px-2"
                          disabled={revoke.isPending}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: `Revoke invitation for ${i.candidateEmail}?`,
                                message:
                                  "Their unique link will be invalidated immediately. Active in-progress exams are not terminated.",
                                confirmLabel: "Revoke",
                                danger: true,
                              })
                            ) {
                              revoke.mutate(i.id);
                            }
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                Page {page + 1} of {totalPages} ({list.data.totalElements} candidate invitations)
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-quiet btn-sm text-xs"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn btn-quiet btn-sm text-xs"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Real-Time HTML Email Preview Modal */}
      {previewMail && (
        <Modal title={`Candidate Email Preview: ${previewMail.recipientEmail}`} onClose={() => setPreviewMail(null)}>
          <div className="space-y-4">
            <div className="panel p-3 rounded-lg border border-line bg-sunk/30 text-xs space-y-1">
              <div>
                <span className="text-muted">To:</span> <b className="text-ink">{previewMail.recipientEmail}</b>
              </div>
              <div>
                <span className="text-muted">Subject:</span> <b className="text-ink">{previewMail.subject}</b>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-muted">Dispatched:</span>{" "}
                  <span>{new Date(previewMail.sentAt).toLocaleString()}</span>
                </div>
                <span className="badge text-[10px] font-mono">Status: {previewMail.status}</span>
              </div>
            </div>

            {/* Rendered HTML Container */}
            <div className="rounded-xl border border-line overflow-hidden bg-black shadow-inner">
              <iframe
                srcDoc={previewMail.htmlContent ?? ""}
                title="Email Preview"
                className="w-full h-[450px] border-0"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
              <a
                href={previewMail.candidateLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm text-xs font-semibold no-underline shadow-xs"
              >
                Launch Candidate Exam in New Tab →
              </a>
              <button className="btn btn-quiet btn-sm text-xs" onClick={() => setPreviewMail(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
