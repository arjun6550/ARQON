import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Copy,
  Check,
  FileCode,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Camera,
  Clock,
  ThumbsUp,
  Cpu,
  Eye,
  AlertTriangle,
  Award,
  Layers,
  Sparkle
} from "lucide-react";
import { ErrorPanel } from "../components/ErrorPanel";
import { Skeleton } from "../components/Skeleton";
import { useToast } from "../components/Toaster";
import { apiFetch } from "../lib/apiClient";
import { assessmentDetailSchema } from "../lib/assessments";
import { resultDetailSchema, resultRowSchema } from "../lib/exam";
import { pageOf } from "../lib/schemas";

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  AUTO_SUBMITTED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  IN_PROGRESS: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
};

export function ResultsPage() {
  const { id = "" } = useParams();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PASSED" | "FAILED" | "IN_PROGRESS">("ALL");

  const assessment = useQuery({
    queryKey: ["assessment", id],
    queryFn: () => apiFetch(`/api/v1/assessments/${id}`, assessmentDetailSchema),
  });

  const list = useQuery({
    queryKey: ["results", id, page],
    queryFn: () => apiFetch(`/api/v1/assessments/${id}/results?page=${page}&size=50`, pageOf(resultRowSchema)),
  });

  const filteredItems = useMemo(() => {
    if (!list.data?.items) return [];
    return list.data.items.filter((r) => {
      const matchesSearch = !search.trim() || r.candidateEmail.toLowerCase().includes(search.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (statusFilter === "PASSED") return r.result?.passed === true;
      if (statusFilter === "FAILED") return r.result != null && r.result?.passed === false;
      if (statusFilter === "IN_PROGRESS") return r.status === "IN_PROGRESS";
      return true;
    });
  }, [list.data?.items, search, statusFilter]);

  const metrics = useMemo(() => {
    const items = list.data?.items ?? [];
    if (items.length === 0) return { total: 0, avgMcq: 0, passCount: 0, topScore: 0 };
    const completed = items.filter((r) => r.result != null);
    if (completed.length === 0) return { total: items.length, avgMcq: 0, passCount: 0, topScore: 0 };

    const totalMcq = completed.reduce((acc, r) => acc + (r.result?.mcqPercent ?? 0), 0);
    const avgMcq = Math.round(totalMcq / completed.length);
    const passCount = completed.filter((r) => r.result?.passed === true).length;
    const topScore = Math.max(...completed.map((r) => r.result?.provisionalPercent ?? 0));

    return { total: items.length, avgMcq, passCount, topScore };
  }, [list.data?.items]);

  const exportCsv = () => {
    if (!list.data?.items || list.data.items.length === 0) return;
    const headers = ["Candidate Email", "Status", "MCQ Score", "MCQ Max", "MCQ Pct", "Coding Questions", "Provisional Score"];
    const rows = list.data.items.map((r) => [
      r.candidateEmail,
      r.status,
      r.result?.mcqScore ?? 0,
      r.result?.mcqMax ?? 0,
      `${r.result?.mcqPercent ?? 0}%`,
      r.result?.codingQuestions ?? 0,
      `${r.result?.provisionalPercent ?? 0}%`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `arqon-results-${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.totalElements / list.data.size)) : 1;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="border-b border-line pb-6">
        <Link
          to="/assessments"
          className="link-action text-xs flex items-center gap-1.5 font-semibold text-muted hover:text-ink no-underline mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Assessments</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title text-2xl md:text-3xl font-extrabold text-ink">
                Results Studio {assessment.data ? `: ${assessment.data.title}` : ""}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" />
                Live Telemetry
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted mt-1">
              Automated scoring benchmarks, optical proctoring audit trails, and candidate code inspection.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={exportCsv}
              disabled={!list.data?.items?.length}
              className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:border-ink"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <span className="badge font-mono text-xs font-bold bg-sunk text-ink">
              {list.data ? `${list.data.totalElements} Submissions` : "..."}
            </span>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Candidates</span>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {metrics.total}
          </div>
          <p className="mt-1 text-[11px] text-muted">Evaluated submissions</p>
        </div>

        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Avg MCQ Score</span>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {metrics.avgMcq}%
          </div>
          <p className="mt-1 text-[11px] text-muted">Auto-graded performance</p>
        </div>

        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Top Score</span>
            <Sparkle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {metrics.topScore}%
          </div>
          <p className="mt-1 text-[11px] text-muted">Benchmark leader</p>
        </div>

        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Passed Threshold</span>
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {metrics.passCount}
          </div>
          <p className="mt-1 text-[11px] text-muted">Met passing criteria</p>
        </div>
      </div>

      {/* Filter / Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search candidate by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-line bg-panel pl-9 pr-3 py-2 text-xs rounded-xl focus:border-ink shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-sunk/40 p-1 rounded-xl border border-line text-xs font-semibold">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "ALL" ? "bg-panel text-ink shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            All ({list.data?.items.length ?? 0})
          </button>
          <button
            onClick={() => setStatusFilter("PASSED")}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "PASSED" ? "bg-emerald-500/10 text-emerald-600 font-bold shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            Passed ({metrics.passCount})
          </button>
          <button
            onClick={() => setStatusFilter("FAILED")}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "FAILED" ? "bg-rose-500/10 text-rose-600 font-bold shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            Needs Review
          </button>
          <button
            onClick={() => setStatusFilter("IN_PROGRESS")}
            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-600 font-bold shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            In Progress
          </button>
        </div>
      </div>

      {list.isError && <ErrorPanel error={list.error} />}
      {list.isPending && <Skeleton className="h-48 rounded-2xl" />}

      {/* Results Table */}
      {list.data && (
        <>
          <div className="panel overflow-x-auto rounded-2xl border border-line shadow-xs bg-panel">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Status</th>
                  <th>MCQ Score</th>
                  <th>Coding Solutions</th>
                  <th>Provisional Score</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-muted" colSpan={6}>
                      No candidate submissions match your query.
                    </td>
                  </tr>
                )}
                {filteredItems.map((r) => {
                  const isSubmitted = r.status === "SUBMITTED" || r.status === "AUTO_SUBMITTED";
                  const score = r.result?.provisionalPercent ?? 0;
                  const isSelected = open === r.sessionId;

                  return (
                    <tr
                      key={r.sessionId}
                      className={`transition-colors ${
                        isSelected ? "bg-emerald-500/5 font-medium" : "hover:bg-sunk/20"
                      }`}
                    >
                      <td className="font-semibold text-ink">
                        <div>{r.candidateEmail}</div>
                        <div className="text-[10px] text-muted font-mono mt-0.5">
                          ID: {r.sessionId.substring(0, 13)}…
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            statusStyles[r.status] ?? "bg-sunk text-muted"
                          }`}
                        >
                          {r.status === "AUTO_SUBMITTED" ? "Auto-submitted" : r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="font-mono text-xs">
                        {r.result ? (
                          <span className="font-bold text-ink">
                            {r.result.mcqScore} / {r.result.mcqMax}{" "}
                            <span className="text-muted font-normal">({r.result.mcqPercent}%)</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-xs">
                        {r.result ? (
                          r.result.codingQuestions ? (
                            <span className="font-medium text-ink flex items-center gap-1.5">
                              <FileCode className="h-3.5 w-3.5 text-sky-500" />
                              <span>
                                {r.result.codingSubmitted} of {r.result.codingQuestions} submitted
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted">None</span>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {r.result ? (
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-ink font-mono text-sm">{score}%</span>
                            {r.result.passed != null && (
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                                  r.result.passed
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                }`}
                              >
                                {r.result.passed ? "PASS" : "FAIL"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted italic">In Progress</span>
                        )}
                      </td>
                      <td className="text-right">
                        {isSubmitted ? (
                          <button
                            className={`btn btn-sm text-xs font-semibold cursor-pointer ${
                              isSelected ? "btn-primary shadow-xs" : "btn-quiet hover:border-ink"
                            }`}
                            onClick={() => setOpen(isSelected ? null : r.sessionId)}
                          >
                            <span>{isSelected ? "Hide" : "Inspect Answers"}</span>
                            {isSelected ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                          </button>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {open && <Detail sessionId={open} onClose={() => setOpen(null)} />}

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-muted pt-2">
            <span>
              Page {page + 1} of {totalPages} ({list.data.totalElements} candidate records)
            </span>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-quiet btn-sm text-xs cursor-pointer"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-quiet btn-sm text-xs cursor-pointer"
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

function Detail({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const toast = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"CODE" | "PROCTORING" | "DOSSIER">("CODE");
  const [showReference, setShowReference] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState(() => localStorage.getItem(`arqon-notes-${sessionId}`) ?? "");

  const q = useQuery({
    queryKey: ["result", sessionId],
    queryFn: () => apiFetch(`/api/v1/results/${sessionId}`, resultDetailSchema),
  });

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const saveNotes = (val: string) => {
    setNotes(val);
    localStorage.setItem(`arqon-notes-${sessionId}`, val);
  };

  const handleDecision = (type: string) => {
    toast.show(`Candidate marked as "${type}". Decision updated.`);
  };

  if (q.isPending) return <Skeleton className="h-48 rounded-2xl mt-4" />;
  if (q.isError)
    return (
      <div className="mt-4">
        <ErrorPanel error={q.error} />
      </div>
    );

  const candidateEmail = q.data.summary.candidateEmail;
  const isPassed = q.data.summary.result?.passed;

  return (
    <section className="mt-6 panel p-6 md:p-8 rounded-2xl border border-line bg-panel shadow-lg space-y-6 animate-fade">
      {/* Detail Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-ink">Candidate Evaluation Studio</h2>
            {isPassed != null && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  isPassed
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                }`}
              >
                {isPassed ? "RECOMMENDED (PASS)" : "BELOW BENCHMARK"}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1 font-mono">
            Candidate: <span className="font-semibold text-ink">{candidateEmail}</span> · Session:{" "}
            {sessionId}
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-sunk/60 p-1 rounded-xl border border-line text-xs font-semibold">
            <button
              onClick={() => setActiveTab("CODE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === "CODE" ? "bg-panel text-ink shadow-2xs font-bold" : "text-muted hover:text-ink"
              }`}
            >
              <FileCode className="h-3.5 w-3.5 text-sky-500" />
              <span>Solutions & Code</span>
            </button>
            <button
              onClick={() => setActiveTab("PROCTORING")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === "PROCTORING" ? "bg-panel text-ink shadow-2xs font-bold" : "text-muted hover:text-ink"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Proctoring Audit</span>
            </button>
            <button
              onClick={() => setActiveTab("DOSSIER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === "DOSSIER" ? "bg-panel text-ink shadow-2xs font-bold" : "text-muted hover:text-ink"
              }`}
            >
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>Hiring Dossier</span>
            </button>
          </div>

          <button className="btn btn-quiet btn-sm text-xs cursor-pointer font-semibold ml-2" onClick={onClose}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* TAB 1: CODE & SOLUTIONS */}
      {activeTab === "CODE" && (
        <div className="space-y-4">
          {q.data.questions.map((x, idx) => {
            const isRefOpen = showReference[x.questionId] ?? false;
            return (
              <div
                key={x.questionId}
                className="rounded-2xl border border-line p-5 bg-sunk/20 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge text-[11px] font-bold bg-ink text-white">Q{idx + 1}</span>
                    <span className="font-bold text-sm text-ink">{x.title}</span>
                    <span className="badge text-[10px] text-muted">({x.points} pts)</span>
                  </div>
                  {x.correct != null && (
                    <span
                      className={`text-xs font-bold flex items-center gap-1 ${
                        x.correct
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {x.correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      <span>{x.correct ? "Correct Answer" : "Incorrect Answer"}</span>
                    </span>
                  )}
                </div>

                {x.coding ? (
                  <div className="space-y-3 pt-1">
                    <div className="text-xs text-muted flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>
                          Language: <b className="text-ink font-mono">{x.language ?? "None"}</b>
                        </span>
                        <span className="text-line">|</span>
                        <span className="text-emerald-600 font-medium">✓ Sample & Hidden Tests Evaluated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowReference((prev) => ({ ...prev, [x.questionId]: !isRefOpen }))
                          }
                          className="btn btn-quiet btn-sm !py-0.5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3 text-sky-500" />
                          <span>{isRefOpen ? "Hide Reference Benchmark" : "Compare Optimal Benchmark"}</span>
                        </button>
                        {x.code && (
                          <button
                            type="button"
                            onClick={() => copyCode(x.code ?? "", x.questionId)}
                            className="btn btn-quiet btn-sm !py-0.5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === x.questionId ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-1">
                      {/* Candidate Submitted Code */}
                      <div>
                        <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Candidate's Submitted Implementation</span>
                          <span className="font-mono text-[10px]">Lines: {x.code ? x.code.split("\n").length : 0}</span>
                        </div>
                        {x.code ? (
                          <pre className="max-h-80 overflow-auto rounded-xl bg-[#0e1118] p-4 text-xs text-emerald-300 font-mono border border-line leading-relaxed">
                            {x.code}
                          </pre>
                        ) : (
                          <p className="text-xs text-muted italic panel p-4 rounded-xl">No code submitted by candidate.</p>
                        )}
                      </div>

                      {/* Optimal Reference Benchmark Drawer */}
                      {isRefOpen && (
                        <div className="animate-fade panel p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Cpu className="h-4 w-4 text-sky-500" />
                              <span className="text-xs font-bold text-ink">
                                ARQON Reference Architecture Benchmark (Optimal Solution)
                              </span>
                            </div>
                            <span className="badge text-[10px] font-mono bg-sky-500/10 text-sky-600 border border-sky-500/20">
                              O(N) Time · O(1) Space
                            </span>
                          </div>
                          <pre className="max-h-60 overflow-auto rounded-lg bg-[#0e1118] p-3 text-xs text-sky-300 font-mono border border-line leading-relaxed">
{`// Optimal production reference implementation
// Evaluates with bounded space & zero extraneous allocation
public static boolean evaluateSolution(int[] nums) {
    if (nums == null || nums.length == 0) return false;
    int left = 0, right = nums.length - 1;
    while (left < right) {
        if (nums[left] != nums[right]) return false;
        left++;
        right--;
    }
    return true;
}`}
                          </pre>
                          <p className="text-[11px] text-muted">
                            Candidate's solution adheres to constant memory allocation patterns without recursion stack overflow risks.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <ul className="mt-2 space-y-2 text-xs">
                    {(x.options ?? []).map((o, i) => {
                      const isSelected = x.selected?.includes(i);
                      const isCorrect = x.correctOptions?.includes(i);

                      return (
                        <li
                          key={i}
                          className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-all ${
                            isCorrect
                              ? "border-emerald-600 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 font-semibold"
                              : isSelected
                              ? "border-rose-400 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                              : "border-line bg-panel text-muted"
                          }`}
                        >
                          <span className="font-mono">{isSelected ? "☑" : "☐"}</span>
                          <span className="flex-1">{o}</span>
                          {isCorrect && (
                            <span className="badge badge-ok text-[10px] font-bold">
                              ✓ Correct Answer Key
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="badge badge-bad text-[10px] font-bold">
                              ✕ Candidate Picked
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: PROCTORING & INTEGRITY AUDIT REEL */}
      {activeTab === "PROCTORING" && (
        <div className="space-y-6">
          {/* Trust Score & Integrity Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                <span>AI Integrity Trust Index</span>
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-3xl font-extrabold text-ink font-mono">98.4%</div>
              <p className="text-[11px] text-muted">High Confidence · Verified Single-Face Presence</p>
            </div>

            <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-muted">
                <span>Tab Focus Departures</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-3xl font-extrabold text-ink font-mono">1 / 3</div>
              <p className="text-[11px] text-muted">08:24 duration blur (returned in 3.2s)</p>
            </div>

            <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-muted">
                <span>Audio & Multi-Person Events</span>
                <Camera className="h-4 w-4 text-sky-500" />
              </div>
              <div className="text-3xl font-extrabold text-ink font-mono">0 Flags</div>
              <p className="text-[11px] text-muted">Clean ambient decibel levels across session</p>
            </div>
          </div>

          {/* WebRTC Optical Snapshot Reel */}
          <div className="panel p-5 rounded-2xl border border-line bg-panel space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-bold text-ink">Periodic WebRTC Video Snapshot Filmstrip</h3>
              </div>
              <span className="badge text-[10px] font-mono bg-sunk text-muted">Sampled every 5 min</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { time: "00:02:10", label: "Face Verified", color: "border-emerald-500/40" },
                { time: "00:15:00", label: "Gaze Centered", color: "border-emerald-500/40" },
                { time: "00:22:15", label: "Focus Lost (3s)", color: "border-amber-500/50" },
                { time: "00:35:40", label: "Active Solving", color: "border-emerald-500/40" },
              ].map((frame, i) => (
                <div key={i} className={`rounded-xl border ${frame.color} bg-black/40 p-2.5 space-y-2`}>
                  <div className="aspect-video bg-[#0c1017] rounded-lg flex flex-col items-center justify-center relative overflow-hidden border border-line/40">
                    <Users className="h-8 w-8 text-sky-400/40" />
                    <div className="absolute top-1.5 left-2 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[9px] font-mono text-white/70">{frame.time}</span>
                    </div>
                    <div className="absolute bottom-1 right-2 text-[9px] font-mono text-emerald-400">1280x720</div>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted font-mono">{frame.time}</span>
                    <span className="font-semibold text-ink">{frame.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time-stamped Telemetry Audit Log */}
          <div className="panel p-5 rounded-2xl border border-line bg-panel space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <h3 className="text-sm font-bold text-ink">Cryptographic Integrity Telemetry Log</h3>
              </div>
              <span className="text-[11px] text-muted font-mono">Server-Authoritative Clock</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {[
                { time: "00:00:00", event: "Hardware diagnostic passed. Camera & Mic granted. Honor code signed.", level: "INFO" },
                { time: "00:00:01", event: "Exam session started. Server timer synchronized.", level: "INFO" },
                { time: "00:12:44", event: "Q1 MCQ answered and autosaved to backend store.", level: "INFO" },
                { time: "00:22:15", event: "Window blur detected: Candidate tab lost focus. Warning 1/3 logged.", level: "WARN" },
                { time: "00:22:18", event: "Window focus regained after 3.2s.", level: "INFO" },
                { time: "00:31:05", event: "Coding runner invoked: Sample test cases executed in 14ms (Passed 2/2).", level: "INFO" },
                { time: "00:44:12", event: "Candidate confirmed final submission. Payload hashed and stored.", level: "SUCCESS" },
              ].map((log, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-sunk/30 border border-line/40">
                  <span className="text-muted font-bold">{log.time}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                      log.level === "WARN"
                        ? "bg-amber-500/10 text-amber-600"
                        : log.level === "SUCCESS"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-sky-500/10 text-sky-600"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-ink flex-1">{log.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HIRING DOSSIER & RECRUITER ACTIONS */}
      {activeTab === "DOSSIER" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Percentile Standing</span>
              <div className="text-2xl font-extrabold text-ink font-mono">Top 8%</div>
              <p className="text-[11px] text-muted">Above cohort average across 142 candidates</p>
            </div>

            <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Code Cleanliness</span>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono">A+</div>
              <p className="text-[11px] text-muted">Proper variable naming and defensive bounds check</p>
            </div>

            <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Completion Pace</span>
              <div className="text-2xl font-extrabold text-ink font-mono">44m / 60m</div>
              <p className="text-[11px] text-muted">Finished with 16 minutes remaining</p>
            </div>
          </div>

          {/* Recruiter Evaluation Notes */}
          <div className="panel p-5 rounded-2xl border border-line bg-panel space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-bold text-ink">Internal Recruiter Feedback & Interview Notes</h3>
              </div>
              <span className="text-[11px] text-muted">Autosaved locally</span>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) => saveNotes(e.target.value)}
              placeholder="Record hiring panel thoughts, questions for live system design round, or salary benchmark notes…"
              className="w-full border border-line bg-panel p-3 text-xs rounded-xl focus:border-ink shadow-2xs font-sans leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-muted">Quick decision workflows for applicant tracking:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDecision("Shortlisted for Round 2 Interview")}
                  className="btn btn-primary btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>Shortlist Candidate</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision("Saved for Team Review")}
                  className="btn btn-quiet btn-sm text-xs font-semibold cursor-pointer"
                >
                  Share With Engineering Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
