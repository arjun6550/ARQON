import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useConfirm } from "../components/Confirm";
import { EmptyState } from "../components/EmptyState";
import { ErrorPanel } from "../components/ErrorPanel";
import { ListSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toaster";
import { apiFetch, jsonInit } from "../lib/apiClient";
import { assessmentDetailSchema, assessmentSummarySchema } from "../lib/assessments";
import { pageOf } from "../lib/schemas";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const tabs = [
  ["", "All Assessments"],
  ["DRAFT", "Drafts"],
  ["PUBLISHED", "Published"],
  ["ARCHIVED", "Archived"],
] as const;

const statusStyles: Record<string, string> = {
  DRAFT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  PUBLISHED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  ARCHIVED: "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20",
};

export function AssessmentsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(0);

  const list = useQuery({
    queryKey: ["assessments", status, page],
    queryFn: () =>
      apiFetch(
        `/api/v1/assessments?page=${page}&size=20${status ? `&status=${status}` : ""}`,
        pageOf(assessmentSummarySchema)
      ),
  });

  const copy = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/v1/assessments/${id}/copy`, assessmentDetailSchema, jsonInit("POST")),
    onSuccess: (d) => {
      toast.show("Assessment cloned into new draft");
      navigate(`/assessments/${d.id}`);
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/assessments/${id}`, z.undefined(), jsonInit("DELETE")),
    onSuccess: () => {
      toast.show("Assessment archived");
      return qc.invalidateQueries({ queryKey: ["assessments"] });
    },
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.totalElements / list.data.size)) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title text-2xl font-bold">Assessments</h1>
            <span className="badge font-mono text-xs">
              {list.data ? `${list.data.totalElements} total` : "..."}
            </span>
          </div>
          <p className="hint text-xs text-muted mt-1">
            Build, publish, and schedule timed examinations for recruitment pipelines.
          </p>
        </div>
        <Link to="/assessments/new" className="btn btn-primary text-sm no-underline shadow-xs">
          + New Assessment
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs.map(([value, label]) => (
          <button
            key={label}
            onClick={() => {
              setStatus(value);
              setPage(0);
            }}
            className={`btn btn-sm text-xs font-semibold rounded-lg transition-colors ${
              status === value ? "btn-primary shadow-xs" : "btn-quiet"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.isError && <ErrorPanel error={list.error} />}
      {(copy.isError || archive.isError) && <ErrorPanel error={copy.error ?? archive.error} />}
      {list.isPending && <ListSkeleton />}

      {/* Assessment List */}
      {list.data && (
        <>
          <div className="panel overflow-hidden rounded-xl border border-line shadow-xs">
            <ul className="divide-y text-sm">
              {list.data.items.length === 0 && (
                <li>
                  <EmptyState
                    title="No assessments found"
                    action={
                      <Link to="/assessments/new" className="btn btn-primary btn-sm no-underline">
                        Create Assessment
                      </Link>
                    }
                  >
                    An assessment combines questions from your question bank into a timed exam with proctoring rules.
                  </EmptyState>
                </li>
              )}

              {list.data.items.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-sunk/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        to={`/assessments/${a.id}`}
                        className="font-semibold text-ink underline hover:text-emerald-700 text-sm"
                      >
                        {a.title}
                      </Link>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          statusStyles[a.status] ?? "bg-sunk text-muted"
                        }`}
                      >
                        {a.status}
                      </span>
                      <span className="badge font-mono text-[10px] text-muted">
                        {a.scheduleType === "FIXED_WINDOW" ? "Fixed Schedule" : "Flexible Window"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span>⏱️ <b>{a.durationMinutes} min</b></span>
                      <span>❓ <b>{a.questionCount}</b> questions ({a.sectionCount} sections)</span>
                      <span>🗓️ {fmt(a.windowStart)} → {fmt(a.windowEnd)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {a.status === "PUBLISHED" && (
                      <Link
                        to={`/assessments/${a.id}/invitations`}
                        className="btn btn-quiet btn-sm text-xs font-medium no-underline"
                      >
                        ✉️ Invitations
                      </Link>
                    )}
                    {a.status === "PUBLISHED" && (
                      <Link
                        to={`/assessments/${a.id}/results`}
                        className="btn btn-quiet btn-sm text-xs font-medium no-underline"
                      >
                        📊 Results
                      </Link>
                    )}
                    <button
                      className="btn btn-quiet btn-sm text-xs font-medium"
                      disabled={copy.isPending}
                      onClick={() => copy.mutate(a.id)}
                      title="Clone this assessment into a new draft"
                    >
                      Duplicate
                    </button>
                    {a.status !== "ARCHIVED" && (
                      <button
                        className="link-danger text-xs font-medium px-2"
                        disabled={archive.isPending}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: "Archive this assessment?",
                              message:
                                "It will be marked as archived. Candidate invitations and completed results remain accessible.",
                              confirmLabel: "Archive",
                              danger: true,
                            })
                          ) {
                            archive.mutate(a.id);
                          }
                        }}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Page {page + 1} of {totalPages} ({list.data.totalElements} assessments)
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
    </div>
  );
}
