import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useConfirm } from "../components/Confirm";
import { EmptyState } from "../components/EmptyState";
import { ErrorPanel } from "../components/ErrorPanel";
import { ListSkeleton } from "../components/Skeleton";
import { useToast } from "../components/Toaster";
import { apiFetch, jsonInit } from "../lib/apiClient";
import { questionSummarySchema } from "../lib/questions";
import { pageOf } from "../lib/schemas";

type Filters = { type: string; difficulty: string; tag: string; search: string };
const noFilters: Filters = { type: "", difficulty: "", tag: "", search: "" };

const difficultyBadges: Record<string, string> = {
  EASY: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  HARD: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
};

const typeBadges: Record<string, string> = {
  MCQ: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  CODING: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
};

export function QuestionsPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [draft, setDraft] = useState<Filters>(noFilters);
  const [applied, setApplied] = useState<Filters>(noFilters);
  const [page, setPage] = useState(0);

  const params = new URLSearchParams({ page: String(page), size: "20" });
  (Object.keys(applied) as (keyof Filters)[]).forEach((k) => applied[k] && params.set(k, applied[k]));

  const list = useQuery({
    queryKey: ["questions", applied, page],
    queryFn: () => apiFetch(`/api/v1/questions?${params.toString()}`, pageOf(questionSummarySchema)),
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/questions/${id}`, z.undefined(), jsonInit("DELETE")),
    onSuccess: () => {
      toast.show("Question archived");
      return qc.invalidateQueries({ queryKey: ["questions"] });
    },
  });

  const clearFilters = () => {
    setDraft(noFilters);
    setApplied(noFilters);
    setPage(0);
  };

  const hasActiveFilters = Boolean(applied.type || applied.difficulty || applied.tag || applied.search);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.totalElements / list.data.size)) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title text-2xl font-bold">Question Bank</h1>
            <span className="badge font-mono text-xs">
              {list.data ? `${list.data.totalElements} questions` : "..."}
            </span>
          </div>
          <p className="hint text-xs text-muted mt-1">
            Version-controlled coding exercises and multiple-choice questions for assessments.
          </p>
        </div>
        <Link to="/questions/new" className="btn btn-primary text-sm no-underline shadow-xs">
          + New Question
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="panel p-4 rounded-xl border border-line bg-panel shadow-xs">
        <form
          className="grid gap-3 sm:grid-cols-5 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setApplied(draft);
          }}
        >
          <div>
            <select
              aria-label="Type"
              className="w-full border px-3 py-2 text-xs rounded-lg bg-panel"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            >
              <option value="">All Question Types</option>
              <option value="MCQ">MCQ (Multiple Choice)</option>
              <option value="CODING">Coding Exercise</option>
            </select>
          </div>

          <div>
            <select
              aria-label="Difficulty"
              className="w-full border px-3 py-2 text-xs rounded-lg bg-panel"
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
            >
              <option value="">Any Difficulty</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <input
              aria-label="Tag"
              placeholder="Tag (e.g. java, sql)"
              className="w-full border px-3 py-2 text-xs rounded-lg"
              value={draft.tag}
              onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
            />
          </div>

          <div>
            <input
              aria-label="Search"
              placeholder="Search question title…"
              className="w-full border px-3 py-2 text-xs rounded-lg"
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-quiet flex-1 text-xs font-semibold">
              Filter
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-quiet text-xs text-muted hover:text-ink px-2.5"
                title="Reset filters"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {list.isError && <ErrorPanel error={list.error} />}
      {archive.isError && <ErrorPanel error={archive.error} />}
      {list.isPending && <ListSkeleton />}

      {/* Questions List */}
      {list.data && (
        <>
          <div className="panel overflow-hidden rounded-xl border border-line shadow-xs">
            <ul className="divide-y text-sm">
              {list.data.items.length === 0 && (
                <li>
                  <EmptyState
                    title="No questions found"
                    action={
                      <Link to="/questions/new" className="btn btn-primary btn-sm no-underline">
                        Create Question
                      </Link>
                    }
                  >
                    {hasActiveFilters
                      ? "No questions match your filter criteria. Try clearing search filters."
                      : "Your question bank is empty. Author your first MCQ or coding exercise to begin building assessments."}
                  </EmptyState>
                </li>
              )}

              {list.data.items.map((q) => (
                <li
                  key={q.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-sunk/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        to={`/questions/${q.id}`}
                        className="font-semibold text-ink underline hover:text-emerald-700 text-sm"
                      >
                        {q.title}
                      </Link>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          typeBadges[q.type] ?? "bg-sunk text-muted"
                        }`}
                      >
                        {q.type}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          difficultyBadges[q.difficulty] ?? "bg-sunk text-muted"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      <span className="badge font-mono text-[10px] text-muted">v{q.currentVersion}</span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                      {q.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {q.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-sunk/80 px-1.5 py-0.5 text-[10px] text-muted font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-[11px]">ID: {q.id.substring(0, 8)}…</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      to={`/questions/${q.id}`}
                      className="btn btn-quiet btn-sm text-xs font-medium no-underline"
                    >
                      Edit
                    </Link>
                    <button
                      className="link-danger text-xs font-medium"
                      disabled={archive.isPending}
                      onClick={async () => {
                        if (
                          await confirm({
                            title: "Archive this question?",
                            message:
                              "It will be removed from your active question bank. Assessments referencing this version will continue to function.",
                            confirmLabel: "Archive",
                            danger: true,
                          })
                        ) {
                          archive.mutate(q.id);
                        }
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Page {page + 1} of {totalPages} ({list.data.totalElements} total questions)
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
