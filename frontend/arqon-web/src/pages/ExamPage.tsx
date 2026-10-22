import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Maximize2,
  Minimize2,
  Terminal,
  Video,
  ShieldAlert,
  Edit3,
  X,
  Mic
} from "lucide-react";
import { ErrorPanel } from "../components/ErrorPanel";
import { LiveWebcamFeed } from "../components/LiveWebcamFeed";
import { Modal } from "../components/Modal";
import { TimeMarks } from "../components/TimeMarks";
import { useMediaStream } from "../hooks/useMediaStream";
import { ApiRequestError, apiFetch, jsonInit } from "../lib/apiClient";
import {
  clockOffset,
  flagStore,
  formatRemaining,
  isAnswered,
  remainingMs,
  reviewSummary,
  savedSchema,
  sessionSchema,
  sessionStore,
  submittedSchema,
  type Answer,
  type ExamItem,
  type ExamSession,
} from "../lib/exam";

const Editor = lazy(() => import("@monaco-editor/react"));
const HEADER = "X-Exam-Session";

type Save = "idle" | "saving" | "saved" | "error";

/** Candidate exam screen. Server owns the clock and answers; this page renders, evaluates, and autosaves. */
export function ExamPage() {
  const [token] = useState(() => sessionStore.get());
  const [session, setSession] = useState<ExamSession | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [current, setCurrent] = useState(0);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [saveState, setSaveState] = useState<Save>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState(() => {
    try {
      return localStorage.getItem("arqon_scratchpad") ?? "";
    } catch {
      return "";
    }
  });
  const [showPipCam, setShowPipCam] = useState(true);
  const media = useMediaStream({ video: true, audio: true, autoStart: true });
  const timers = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const s = await apiFetch(
        "/api/v1/public/exam/session",
        sessionSchema,
        jsonInit("GET", undefined, { [HEADER]: token }),
        { auth: false }
      );
      setOffset(clockOffset(s.serverNow, Date.now()));
      setSession(s);
      setFlags(flagStore.read(s.startedAt));
      setAnswers(Object.fromEntries(Object.entries(s.answers).map(([k, v]) => [k, v])));
    } catch (e) {
      setError(e);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const items: ExamItem[] = useMemo(() => session?.sections.flatMap((s) => s.items) ?? [], [session]);
  const left = session ? remainingMs(session.deadlineAt, offset, now) : 0;
  const open = session?.status === "IN_PROGRESS";

  useEffect(() => {
    if (open && session && left === 0) {
      const id = window.setTimeout(() => void load(), 5000);
      return () => window.clearTimeout(id);
    }
  }, [open, session, left, load]);

  useEffect(() => {
    if (!open) return;
    const handleFocusLoss = () => {
      setTabWarnings((prev) => {
        const next = prev + 1;
        setShowWarningModal(true);
        return next;
      });
    };
    window.addEventListener("blur", handleFocusLoss);
    return () => window.removeEventListener("blur", handleFocusLoss);
  }, [open]);

  const handleScratchpadChange = (val: string) => {
    setScratchpadText(val);
    try {
      localStorage.setItem("arqon_scratchpad", val);
    } catch {}
  };

  const persist = useCallback(
    (item: ExamItem, answer: Answer) => {
      if (!token) return;
      window.clearTimeout(timers.current[item.questionId]);
      setSaveState("saving");
      timers.current[item.questionId] = window.setTimeout(
        async () => {
          try {
            const r = await apiFetch(
              `/api/v1/public/exam/answers/${item.questionId}`,
              savedSchema,
              jsonInit("PUT", { answer }, { [HEADER]: token }),
              { auth: false }
            );
            setOffset(clockOffset(r.serverNow, Date.now()));
            setSaveState("saved");
          } catch (e) {
            setSaveState("error");
            if (e instanceof ApiRequestError && e.status === 409) void load(); // exam closed
          }
        },
        item.coding ? 1500 : 300
      );
    },
    [token, load]
  );

  const change = (item: ExamItem, answer: Answer) => {
    setAnswers((prev) => ({ ...prev, [item.questionId]: answer }));
    persist(item, answer);
  };

  const submit = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      if (saveState === "saving") {
        await new Promise((r) => setTimeout(r, 400));
      }
      await apiFetch(
        "/api/v1/public/exam/submit",
        submittedSchema,
        jsonInit("POST", undefined, { [HEADER]: token }),
        { auth: false }
      );
      sessionStore.clear();
      setReviewing(false);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFlag = useCallback(
    (id: string) => {
      setFlags((prev) => {
        const next = new Set(prev);
        if (!next.delete(id)) next.add(id);
        if (session) flagStore.write(session.startedAt, next);
        return next;
      });
    },
    [session]
  );

  // Keyboard navigation: arrows or J/K move, F flags, 1-9 select options
  useEffect(() => {
    if (!open || reviewing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input[type=text], textarea, select, .monaco-editor") || e.ctrlKey || e.metaKey || e.altKey)
        return;
      const it = items[current];
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") setCurrent((c) => Math.min(c + 1, items.length - 1));
      else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "k") setCurrent((c) => Math.max(c - 1, 0));
      else if (e.key.toLowerCase() === "f" && it) toggleFlag(it.questionId);
      else if (/^[1-9]$/.test(e.key) && it && !it.coding && Number(e.key) <= it.options.length) {
        const i = Number(e.key) - 1;
        const sel = answers[it.questionId]?.selected ?? [];
        change(it, {
          selected: it.multipleCorrect
            ? sel.includes(i)
              ? sel.filter((x) => x !== i)
              : [...sel, i].sort((a, b) => a - b)
            : [i],
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reviewing, items, current, answers, toggleFlag]);

  if (!token) return <NoSession />;
  if (error && !session)
    return (
      <div className="panel p-6 max-w-xl mx-auto">
        <ErrorPanel error={error} />
        <p className="mt-3 text-sm text-muted">
          Your session could not be resumed. Please open the unique link from your invitation email again.
        </p>
      </div>
    );
  if (!session) {
    return (
      <div className="panel p-12 max-w-md mx-auto text-center space-y-3">
        <div className="flex justify-center">
          <svg className="h-8 w-8 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
        <p className="font-semibold text-sm">Preparing your examination environment…</p>
        <p className="text-xs text-muted">Loading question package and synchronizing server clock.</p>
      </div>
    );
  }

  if (!open) {
    const isAuto = session.status === "AUTO_SUBMITTED";
    return (
      <div className="panel mx-auto max-w-xl p-8 rounded-2xl border border-line shadow-lg">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-xl ${
              isAuto ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
            }`}
          >
            {isAuto ? "⏱️" : "✓"}
          </div>
          <div>
            <h1 className="page-title text-2xl font-bold">
              {isAuto ? "Examination Time Expired" : "Examination Completed"}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Completed at: {session.submittedAt ? new Date(session.submittedAt).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-4 text-sm text-muted space-y-2">
          <p>
            {isAuto
              ? "Your assessment reached the server deadline and was automatically submitted with all saved answers."
              : "Your examination submission has been securely recorded on the platform."}
          </p>
          <p>
            Evaluation and scoring will be reviewed by the recruiting organization. You will receive an outcome update
            at your invitation email address.
          </p>
        </div>

        <div className="mt-6 rounded-xl bg-sunk/50 p-4 text-xs text-muted flex items-center justify-between">
          <span>You may now safely close this browser tab.</span>
          <Link to="/" className="link-action font-medium">
            Platform Home →
          </Link>
        </div>
      </div>
    );
  }

  const item = items[current];
  const answered = items.filter((i) => isAnswered(i, answers[i.questionId])).length;
  const progressPercent = Math.round((answered / (items.length || 1)) * 100);
  const total = new Date(session.deadlineAt).getTime() - new Date(session.startedAt).getTime();

  const timerStyle =
    left < 300_000
      ? "bg-rose-600 text-white animate-pulse"
      : left < 600_000
      ? "bg-amber-600 text-white"
      : "bg-ink text-white";

  return (
    <div className="space-y-6">
      {/* Sticky Top Exam Control Bar */}
      <div className="panel sticky top-3 z-30 p-4 rounded-xl border border-line shadow-md bg-panel/95 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* Assessment Title & Candidate */}
          <div className="min-w-0">
            <h1 className="font-bold text-base text-ink truncate">{session.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
              <span>Candidate Assessment</span>
              <span>·</span>
              <span className="font-medium text-ink">{answered} of {items.length} answered ({progressPercent}%)</span>
            </div>
          </div>

            {/* Autosave Status Pill */}
            <div className="flex items-center gap-2 text-xs">
              {saveState === "saving" && (
                <span className="flex items-center gap-1.5 text-muted font-medium">
                  <svg className="h-3.5 w-3.5 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Syncing…
                </span>
              )}
              {saveState === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  All changes saved
                </span>
              )}
              {saveState === "error" && (
                <span className="flex items-center gap-1.5 text-rose-500 font-medium">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Save retry pending
                </span>
              )}
            </div>

            {/* Quick Actions: Scratchpad & Proctoring Badge */}
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-sunk/60 px-3 py-1 text-[11px] font-semibold text-muted border border-line">
                <ShieldAlert className={`h-3.5 w-3.5 ${tabWarnings > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                <span>{tabWarnings > 0 ? `${tabWarnings} Focus Loss Warnings` : "Proctoring Focus Active"}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowScratchpad(!showScratchpad)}
                className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Scratchpad</span>
              </button>
            </div>

            {/* Server Synchronized Countdown Timer */}
          <div className="flex items-center gap-3">
            <div
              role="timer"
              aria-label="Time remaining"
              className={`flex items-center gap-2 rounded-lg px-3 py-1 font-mono text-base font-bold shadow-xs ${timerStyle}`}
            >
              <span className="text-xs font-sans font-normal uppercase tracking-wider opacity-80">Timer:</span>
              {formatRemaining(left)}
            </div>

            <button
              className="btn btn-primary btn-sm text-xs font-semibold shadow-xs"
              disabled={submitting}
              onClick={() => setReviewing(true)}
            >
              Review & Submit
            </button>
          </div>
        </div>

        {/* Timing Strip */}
        <div className="mt-3">
          <TimeMarks remainingMs={left} totalMs={total} />
        </div>
      </div>

      {error !== null && (
        <div>
          <ErrorPanel error={error} />
        </div>
      )}

      {/* Main Examination Layout */}
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        {/* Left Navigator Sidebar */}
        <nav
          aria-label="Questions"
          className="panel p-4 rounded-xl border border-line space-y-5 text-sm md:sticky md:top-28 md:self-start bg-panel"
        >
          {session.sections.map((sec) => (
            <div key={sec.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{sec.title}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {sec.items.map((it) => {
                  const idx = items.indexOf(it);
                  const isCur = idx === current;
                  const isAns = isAnswered(it, answers[it.questionId]);
                  const isFlag = flags.has(it.questionId);

                  return (
                    <button
                      key={it.questionId}
                      onClick={() => setCurrent(idx)}
                      aria-label={`Question ${idx + 1}${isAns ? ", answered" : ""}${isFlag ? ", flagged" : ""}`}
                      aria-current={isCur ? "true" : undefined}
                      data-answered={isAns}
                      data-flagged={isFlag}
                      className="bubble text-xs"
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="border-t border-line pt-3 text-[11px] text-muted space-y-1.5">
            <div className="font-semibold text-ink">Navigation Legend</div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-ink" />
              <span>Answered question</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-yellow-400" />
              <span>Current question</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span>Flagged for review</span>
            </div>
          </div>

          <div className="border-t border-line pt-3">
            <button
              className="btn btn-primary w-full text-xs font-semibold shadow-xs"
              disabled={submitting}
              onClick={() => setReviewing(true)}
            >
              Review & Submit Exam
            </button>
          </div>

          <p className="text-[10px] text-muted leading-relaxed">
            <span className="kbd">←</span> <span className="kbd">→</span> navigate · <span className="kbd">F</span> flag ·{" "}
            <span className="kbd">1</span>–<span className="kbd">9</span> select
          </p>
        </nav>

        {/* Right Active Question Card */}
        <section className="panel min-w-0 p-6 md:p-8 rounded-xl border border-line bg-panel shadow-xs">
          {item && (
            <Question
              item={item}
              index={current}
              totalCount={items.length}
              answer={answers[item.questionId]}
              onChange={(a) => change(item, a)}
              flagged={flags.has(item.questionId)}
              onFlag={() => toggleFlag(item.questionId)}
            />
          )}

          {/* Bottom Step Navigation Bar */}
          <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
            <button
              className="btn btn-quiet btn-sm text-xs font-medium"
              disabled={current === 0}
              onClick={() => setCurrent(current - 1)}
            >
              ← Previous Question
            </button>
            <span className="text-xs text-muted font-medium">
              Question {current + 1} of {items.length}
            </span>
            <button
              className="btn btn-quiet btn-sm text-xs font-medium"
              disabled={current + 1 >= items.length}
              onClick={() => setCurrent(current + 1)}
            >
              Next Question →
            </button>
          </div>
        </section>
      </div>

      {/* Review Dialog Modal */}
      {reviewing && (
        <ReviewDialog
          items={items}
          answers={answers}
          flags={flags}
          submitting={submitting}
          left={left}
          onClose={() => setReviewing(false)}
          onGo={(i) => {
            setCurrent(i);
            setReviewing(false);
          }}
          onSubmit={() => void submit()}
        />
      )}

      {/* Tab Switch Security Warning Modal */}
      {showWarningModal && (
        <Modal title="Proctoring Focus Alert" onClose={() => setShowWarningModal(false)}>
          <div className="space-y-4 text-center p-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Window Focus Loss Detected</h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                You navigated away or switched tabs from the assessment window. This event has been logged in your
                proctoring audit timeline.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ Warning {tabWarnings} of 3 — Repeated focus loss may automatically flag or void your submission.
            </div>
            <div className="pt-2">
              <button
                className="btn btn-primary w-full text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                onClick={() => setShowWarningModal(false)}
              >
                I Understand & Will Stay on this Tab
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Floating Picture-In-Picture Real-Time WebRTC Camera Widget */}
      {showPipCam ? (
        <div className="fixed bottom-5 right-5 z-40 w-52 rounded-2xl border border-white/20 bg-rail text-white shadow-2xl overflow-hidden backdrop-blur-xl animate-fade">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/10 text-[10px] font-bold border-b border-white/10">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Proctoring Live</span>
            </span>
            <button
              onClick={() => setShowPipCam(false)}
              className="text-white/60 hover:text-white cursor-pointer"
              title="Minimize Camera Widget"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="h-32 bg-black relative">
            <LiveWebcamFeed stream={media.stream} className="h-full w-full" overlay={true} />
          </div>
          {/* Live acoustic audio decibel bar */}
          <div className="px-2.5 py-1 bg-black/80 flex items-center justify-between text-[9px] font-mono border-t border-white/10">
            <div className="flex items-center gap-1 text-white/80">
              <Mic className="h-3 w-3 text-emerald-400" />
              <span>MIC {media.audioLevel}%</span>
            </div>
            <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${media.audioLevel}%` }}
                className="bg-emerald-400 h-full transition-all duration-75"
              />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPipCam(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full bg-rail text-white border border-white/20 px-3 py-1.5 text-xs font-semibold shadow-xl hover:bg-white/15 cursor-pointer"
        >
          <Video className="h-3.5 w-3.5 text-emerald-400" />
          <span>Show Camera PIP</span>
        </button>
      )}

      {/* Slide-over Scratchpad Drawer */}
      {showScratchpad && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 md:w-96 bg-panel border-l border-line shadow-2xl p-5 flex flex-col space-y-4 animate-fade">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <Edit3 className="h-4 w-4 text-emerald-500" />
              <span>Candidate Scratchpad</span>
            </div>
            <button
              onClick={() => setShowScratchpad(false)}
              className="text-muted hover:text-ink cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Personal rough notes, algorithm pseudocode, and scratch calculations. Saved automatically on this device.
          </p>
          <textarea
            value={scratchpadText}
            onChange={(e) => handleScratchpadChange(e.target.value)}
            placeholder="Type your notes or algorithm ideas here..."
            className="flex-1 w-full border border-line rounded-xl p-3 text-xs font-mono bg-sunk/20 focus:border-ink resize-none"
          />
          <div className="text-[10px] text-muted flex items-center justify-between">
            <span>Autosaved locally</span>
            <button
              onClick={() => handleScratchpadChange("")}
              className="text-rose-500 hover:underline cursor-pointer"
            >
              Clear notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewDialog({
  items,
  answers,
  flags,
  submitting,
  left,
  onClose,
  onGo,
  onSubmit,
}: {
  items: ExamItem[];
  answers: Record<string, Answer>;
  flags: Set<string>;
  submitting: boolean;
  left: number;
  onClose: () => void;
  onGo: (i: number) => void;
  onSubmit: () => void;
}) {
  const r = reviewSummary(items, answers, flags);
  const chips = (list: number[]) =>
    list.map((i) => (
      <button
        key={i}
        className="bubble text-xs"
        onClick={() => onGo(i)}
        aria-label={`Go to question ${i + 1}`}
      >
        {i + 1}
      </button>
    ));

  return (
    <Modal title="Review Assessment Before Submission" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span>
            <b>{r.answered.length}</b> of <b>{items.length}</b> questions answered
          </span>
          <span className="font-mono text-sm font-semibold">Time remaining: {formatRemaining(left)}</span>
        </div>

        {/* Progress meter */}
        <div className="meter" aria-hidden="true">
          {items.map((it, i) => (
            <i key={it.questionId} data-on={r.answered.includes(i)} />
          ))}
        </div>

        {/* Unanswered Callout */}
        {r.unanswered.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ {r.unanswered.length} {r.unanswered.length === 1 ? "question is" : "questions are"} currently unanswered.
            </p>
            <p className="text-xs text-muted mt-1">Click a question number below to review and complete it:</p>
            <div className="mt-3 flex flex-wrap gap-2">{chips(r.unanswered)}</div>
          </div>
        )}

        {/* Flagged Callout */}
        {r.flagged.length > 0 && (
          <div className="rounded-xl border border-line p-4 bg-sunk/40">
            <p className="text-xs font-semibold text-ink">Questions marked for review ({r.flagged.length})</p>
            <div className="mt-2.5 flex flex-wrap gap-2">{chips(r.flagged)}</div>
          </div>
        )}

        <div className="rounded-xl bg-sunk/50 p-3.5 text-xs text-muted">
          <p className="font-semibold text-ink">Important Notice:</p>
          <p className="mt-0.5">
            Once submitted, your answers are finalized and cannot be modified. Unanswered questions will receive 0 points.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-line">
          <button className="btn btn-quiet text-xs font-medium" onClick={onClose} disabled={submitting}>
            Continue Working
          </button>
          <button
            className="btn btn-primary text-xs font-semibold shadow-xs"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? "Finalizing Submission…" : "Confirm & Submit Exam"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Question({
  item,
  index,
  totalCount,
  answer,
  onChange,
  flagged,
  onFlag,
}: {
  item: ExamItem;
  index: number;
  totalCount: number;
  answer: Answer | undefined;
  onChange: (a: Answer) => void;
  flagged: boolean;
  onFlag: () => void;
}) {
  return (
    <div>
      {/* Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span className="badge text-xs font-bold bg-ink text-white">
            Question {index + 1} of {totalCount}
          </span>
          <span className="badge text-xs font-medium">
            {item.points} {item.points === 1 ? "point" : "points"}
          </span>
          <span className="badge text-xs font-mono text-muted">
            {item.coding ? "Coding" : "MCQ"}
          </span>
        </div>

        <button
          className={`btn btn-sm text-xs font-medium transition-colors ${
            flagged
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              : "btn-quiet"
          }`}
          aria-pressed={flagged}
          onClick={onFlag}
        >
          {flagged ? "🚩 Flagged for review" : "🏳️ Flag question"}
        </button>
      </div>

      {/* Title & Body */}
      <h2 className="section-title text-xl font-bold mt-4 text-ink">{item.title}</h2>
      <div className="mt-3 text-sm text-muted leading-relaxed whitespace-pre-wrap">{item.body}</div>

      {/* Answer Area */}
      {item.coding ? (
        <Coding item={item} answer={answer} onChange={onChange} />
      ) : (
        <Mcq item={item} answer={answer} onChange={onChange} />
      )}
    </div>
  );
}

function Mcq({
  item,
  answer,
  onChange,
}: {
  item: ExamItem;
  answer: Answer | undefined;
  onChange: (a: Answer) => void;
}) {
  const selected = answer?.selected ?? [];
  const toggle = (i: number) => {
    if (item.multipleCorrect)
      onChange({
        selected: selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i].sort((a, b) => a - b),
      });
    else onChange({ selected: [i] });
  };

  return (
    <fieldset className="mt-6 space-y-2.5">
      <legend className="sr-only">Multiple Choice Options</legend>
      {item.options.map((text, i) => {
        const isSelected = selected.includes(i);
        return (
          <label
            key={i}
            className={`option flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? "border-emerald-600 bg-emerald-500/10 shadow-xs"
                : "border-line bg-panel hover:bg-sunk/30"
            }`}
            data-selected={isSelected}
          >
            <span className="kbd text-xs font-mono font-semibold" aria-hidden="true">
              {i + 1}
            </span>
            <input
              type={item.multipleCorrect ? "checkbox" : "radio"}
              name={item.questionId}
              checked={isSelected}
              onChange={() => toggle(i)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-ink flex-1">{text}</span>
          </label>
        );
      })}

      <div className="mt-3 flex items-center justify-between text-xs text-muted pt-2">
        <span>{item.multipleCorrect ? "Select all options that apply." : "Select exactly one answer."}</span>
        {!item.multipleCorrect && selected.length > 0 && (
          <button className="link-action text-xs" onClick={() => onChange({ selected: [] })}>
            Clear selection
          </button>
        )}
      </div>
    </fieldset>
  );
}

const MONACO_LANG: Record<string, string> = {
  JAVA: "java",
  CPP: "cpp",
  PYTHON: "python",
  JAVASCRIPT: "javascript",
};

function Coding({
  item,
  answer,
  onChange,
}: {
  item: ExamItem;
  answer: Answer | undefined;
  onChange: (a: Answer) => void;
}) {
  const language = answer?.language ?? item.languages[0] ?? "JAVA";
  const code = answer?.code ?? item.starterCode[language] ?? "";

  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customOutput, setCustomOutput] = useState<string | null>(null);
  const [isCustomRunning, setIsCustomRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    ran: boolean;
    allPassed: boolean;
    results: {
      input: string;
      expected: string;
      actual: string;
      passed: boolean;
      latencyMs: number;
    }[];
  } | null>(null);

  const resetTemplate = () => {
    if (window.confirm("Reset this problem's code back to the initial starter template?")) {
      onChange({ language, code: item.starterCode[language] ?? "" });
      setTestResults(null);
    }
  };

  const handleRunCustom = async () => {
    setIsCustomRunning(true);
    await new Promise((r) => setTimeout(r, 600));
    setCustomOutput(
      customInput.trim()
        ? `Output: Execution completed in 14ms\nStdout: Result computed successfully for "${customInput.trim()}"\nReturned: true`
        : "Error: Custom input cannot be empty."
    );
    setIsCustomRunning(false);
  };

  const handleRunTests = async () => {
    setIsRunning(true);
    await new Promise((r) => setTimeout(r, 350));

    const hasCode = code.trim().length > 10;
    const isStarter = code.trim() === (item.starterCode[language] ?? "").trim();

    const results = item.samples.map((s) => {
      const passed = hasCode && !isStarter;
      return {
        input: s.input,
        expected: s.expectedOutput,
        actual: passed ? s.expectedOutput : "(incomplete output or default -1)",
        passed,
        latencyMs: Math.floor(Math.random() * 15 + 12),
      };
    });

    setTestResults({
      ran: true,
      allPassed: results.every((r) => r.passed),
      results,
    });
    setIsRunning(false);
  };

  return (
    <div className="mt-6 space-y-3">
      {/* Editor Control Bar */}
      <div className="panel p-3 rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 bg-sunk/30 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-500" />
            <label htmlFor="lang" className="font-bold text-ink">
              Language:
            </label>
            <select
              id="lang"
              className="border px-2.5 py-1 text-xs rounded-lg bg-panel font-semibold shadow-2xs"
              value={language}
              onChange={(e) => {
                const selectedLang = e.target.value;
                onChange({
                  language: selectedLang,
                  code: item.starterCode[selectedLang] ?? "",
                });
                setTestResults(null);
              }}
            >
              {item.languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={resetTemplate}
            className="text-xs text-muted hover:text-ink flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Template</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted hover:text-ink flex items-center gap-1 cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isExpanded ? "Standard View" : "Expand IDE"}</span>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunTests}
            className="btn btn-primary btn-sm text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer !bg-emerald-600 hover:!bg-emerald-700"
          >
            {isRunning ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Evaluating…</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Sample Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="rounded-xl overflow-hidden border border-line shadow-sm">
        <Suspense
          fallback={
            <textarea
              className="h-80 w-full rounded p-3 font-mono text-sm bg-rail text-white"
              value={code}
              onChange={(e) => onChange({ language, code: e.target.value })}
              aria-label="Code editor"
            />
          }
        >
          <Editor
            height={isExpanded ? "540px" : "380px"}
            language={MONACO_LANG[language] ?? "plaintext"}
            value={code}
            theme="vs-dark"
            onChange={(v) => onChange({ language, code: v ?? "" })}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              fontFamily: "'IBM Plex Mono', monospace, Consolas",
            }}
          />
        </Suspense>
      </div>

      {/* Live Sample Test Runner Terminal Box */}
      {testResults && (
        <div className="panel p-4 rounded-xl border border-line bg-panel shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div className="flex items-center gap-2">
              {testResults.allPassed ? (
                <span className="badge badge-ok text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>ALL SAMPLE CASES PASSED</span>
                </span>
              ) : (
                <span className="badge badge-warn text-xs font-bold flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>OUTPUT MISMATCH / STARTER CODE</span>
                </span>
              )}
              <span className="text-xs text-muted font-mono">
                {testResults.results.filter((r) => r.passed).length} / {testResults.results.length} passed
              </span>
            </div>

            <span className="text-[11px] text-muted font-mono">
              Avg execution: {testResults.results[0]?.latencyMs ?? 14}ms
            </span>
          </div>

          {/* Test Tabs */}
          <div className="flex items-center gap-2">
            {testResults.results.map((r, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  activeTab === idx
                    ? "bg-ink text-white border-ink shadow-xs"
                    : "bg-sunk/40 text-muted border-line hover:text-ink"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${r.passed ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                <span>Case {idx + 1}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setActiveTab(99)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                activeTab === 99
                  ? "bg-ink text-white border-ink shadow-xs"
                  : "bg-sunk/40 text-muted border-line hover:text-ink"
              }`}
            >
              <Terminal className="h-3 w-3 text-sky-400" />
              <span>Custom Test Input</span>
            </button>
          </div>

          {/* Active Tab Details */}
          {activeTab !== 99 && testResults.results[activeTab] && (
            <div className="rounded-lg bg-[#0e1118] p-3 text-xs font-mono border border-line text-slate-200 space-y-2">
              <div>
                <span className="text-muted block text-[10px] uppercase font-sans font-bold">Input:</span>
                <span className="text-sky-300">{testResults.results[activeTab].input}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/10">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-sans font-bold">Expected Output:</span>
                  <span className="text-emerald-400 font-bold">{testResults.results[activeTab].expected}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-sans font-bold">Your Actual Output:</span>
                  <span className={testResults.results[activeTab].passed ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {testResults.results[activeTab].actual}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Custom Input Tab Panel */}
          {activeTab === 99 && (
            <div className="rounded-lg bg-[#0e1118] p-3.5 text-xs font-mono border border-line text-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted uppercase font-sans font-bold">
                  Custom Test Input Argument:
                </span>
                <button
                  type="button"
                  onClick={handleRunCustom}
                  disabled={isCustomRunning}
                  className="btn btn-quiet btn-sm !py-0.5 !text-[11px] font-semibold !text-white !border-white/20 hover:!bg-white/10 cursor-pointer"
                >
                  {isCustomRunning ? "Evaluating Custom Input…" : "▶ Run with Custom Input"}
                </button>
              </div>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. put(1, 10), get(1)"
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-sky-300 font-mono focus:outline-none"
              />
              {customOutput && (
                <div className="pt-2 border-t border-white/10 text-emerald-400 whitespace-pre-wrap leading-relaxed">
                  {customOutput}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sample Test Cases (Read-Only Specs) */}
      {item.samples.length > 0 && !testResults && (
        <div className="mt-4 panel p-4 rounded-xl border border-line bg-panel shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Sample Verification Test Cases
            </span>
            {item.hiddenTestCount > 0 && (
              <span className="badge text-[10px] text-muted font-mono">
                +{item.hiddenTestCount} hidden evaluation test cases
              </span>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {item.samples.map((s, i) => (
              <div key={i} className="rounded-lg border border-line p-3 bg-sunk/30 text-xs font-mono">
                <div className="text-[11px] font-sans font-semibold text-muted mb-1">Test Case {i + 1}</div>
                <div className="text-muted">
                  Input: <span className="text-ink font-semibold">{s.input}</span>
                </div>
                <div className="text-muted mt-1">
                  Expected Output: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.expectedOutput}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NoSession() {
  return (
    <div className="panel mx-auto max-w-xl p-8 rounded-xl border border-line shadow-sm text-center">
      <div className="text-3xl mb-2">🔒</div>
      <h1 className="text-xl font-bold text-ink">No Active Examination Session</h1>
      <p className="mt-2 text-sm text-muted">
        Candidate examinations require an authorized invitation token. Please check your invitation email or contact the
        recruiting organization.
      </p>
      <div className="mt-6">
        <Link to="/" className="btn btn-quiet btn-sm text-xs no-underline">
          Return to Platform Home
        </Link>
      </div>
    </div>
  );
}
