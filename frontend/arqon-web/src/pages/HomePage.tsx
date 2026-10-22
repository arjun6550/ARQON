import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Clock,
  Terminal,
  ShieldCheck,
  Zap,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  Layers
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { roleHome } from "../lib/schemas";

const SAMPLE_QUESTIONS = [
  {
    num: 1,
    title: "Binary Search Tree Time Complexity",
    type: "MCQ / Theory",
    points: 5,
    prompt: "Given a self-balancing AVL binary search tree with N elements, what is the tight asymptotic upper bound of searching a key?",
    options: [
      { text: "O(1) in average and amortized cases", sel: false },
      { text: "O(log n) strictly bounded in worst case", sel: true },
      { text: "O(n) linear tree degeneration", sel: false },
      { text: "O(n log n) traversing all heights", sel: false }
    ]
  },
  {
    num: 2,
    title: "PostgreSQL MVCC & Serialization",
    type: "Database Architecture",
    points: 10,
    prompt: "Which SQL transaction isolation level completely prevents non-repeatable reads and phantom reads by serializing concurrent transactions?",
    options: [
      { text: "Read Committed snapshot", sel: false },
      { text: "Repeatable Read without predicate locks", sel: false },
      { text: "Serializable (SSI / Predicate Locks)", sel: true },
      { text: "Read Uncommitted dirty reads", sel: false }
    ]
  },
  {
    num: 3,
    title: "Microservices Resiliency Patterns",
    type: "Distributed Systems",
    points: 10,
    prompt: "Which design pattern actively isolates failing downstream dependencies to prevent catastrophic cascading failure across microservices?",
    options: [
      { text: "Circuit Breaker Pattern with fallback states", sel: true },
      { text: "Two-Phase Commit (2PC) Distributed Locks", sel: false },
      { text: "Aggressive Exponential Retries without Jitter", sel: false },
      { text: "Unbounded In-Memory Request Queueing", sel: false }
    ]
  },
  {
    num: 4,
    title: "Least Recently Used (LRU) Cache",
    type: "Coding / Algorithms",
    points: 25,
    prompt: "Design a data structure with O(1) get(key) and put(key, value) operations using a doubly linked list and hash map.",
    options: [
      { text: "Hash Map + Doubly Linked List (Head/Tail Sentinel)", sel: true },
      { text: "Binary Heap with timestamps", sel: false },
      { text: "Sorted Array with binary search insertion", sel: false },
      { text: "Singly Linked List with linear search", sel: false }
    ]
  }
];

/** Interactive answer sheet simulation: shows real candidate perspective with live ticking timer */
function SheetPreview() {
  const [selectedQ, setSelectedQ] = useState(2);
  const [secondsLeft, setSecondsLeft] = useState(2537);
  const [answeredMap, setAnsweredMap] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    5: true,
    6: true,
    8: true,
    9: true,
    11: true
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 1 ? s - 1 : 2537));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const currentQ = SAMPLE_QUESTIONS.find((q) => q.num === selectedQ) || SAMPLE_QUESTIONS[0];

  return (
    <div className="relative mx-auto w-full max-w-lg rounded-2xl border border-white/10 bg-rail text-white p-6 shadow-2xl backdrop-blur-xl">
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      {/* Exam Header Preview */}
      <div className="flex items-center justify-between text-sm border-b border-white/10 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">Senior Backend Screening 2026</span>
            <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          </div>
          <div className="text-[11px] text-white/50 mt-0.5">Assessment #042 · Section 1 of 2 (Technical Core)</div>
        </div>

        {/* Server Authoritative Timer Badge */}
        <div className="flex items-center gap-1.5 rounded-lg bg-white/10 border border-white/15 px-3 py-1.5 font-mono text-xs font-bold text-white shadow-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{formatTimer(secondsLeft)}</span>
        </div>
      </div>

      {/* Signature Timing Strip */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
        <span>Server-Authoritative Clock Remaining</span>
        <span className="font-mono">72% time left</span>
      </div>
      <div className="marks mt-1">
        {Array.from({ length: 36 }, (_, i) => (
          <i
            key={i}
            className="!bg-emerald-400"
            data-off={i >= 26}
          />
        ))}
      </div>

      {/* Interactive Question Bubbles */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2">
          <span>Question Navigator</span>
          <span className="text-white/40 text-[10px] lowercase">(click bubble to preview)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
            const isAnswered = !!answeredMap[n];
            const isCurrent = n === selectedQ;
            const isFlagged = n === 7;
            return (
              <button
                key={n}
                onClick={() => {
                  if (SAMPLE_QUESTIONS.some((q) => q.num === n)) {
                    setSelectedQ(n);
                  }
                }}
                className={`bubble !text-xs !w-8 !h-8 transition-transform hover:scale-105 cursor-pointer ${
                  isCurrent
                    ? "!border-emerald-400 !bg-emerald-500/20 !text-white ring-2 ring-emerald-400"
                    : isAnswered
                    ? "!bg-white/20 !border-white/30 !text-white"
                    : "!bg-white/5 !border-white/15 !text-white/60"
                }`}
                data-flagged={isFlagged}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sample Question Content Box */}
      <div className="mt-5 rounded-xl border border-white/10 p-4 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-white/60 mb-1.5">
          <span className="font-semibold text-white/90">
            Question {currentQ.num} ({currentQ.type})
          </span>
          <span className="font-mono font-medium text-emerald-400">{currentQ.points} Points</span>
        </div>
        <p className="text-xs md:text-sm font-medium text-white/90 leading-relaxed">
          {currentQ.prompt}
        </p>

        <ul className="mt-3 space-y-1.5 text-xs">
          {currentQ.options.map((o, idx) => (
            <li
              key={o.text}
              onClick={() => {
                setAnsweredMap((prev) => ({ ...prev, [selectedQ]: true }));
              }}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-all cursor-pointer ${
                o.sel
                  ? "border-emerald-500/50 bg-emerald-500/15 font-medium text-white shadow-xs"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border ${
                  o.sel
                    ? "border-emerald-400 bg-emerald-500 text-white"
                    : "border-white/30 text-white/40"
                }`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="truncate">{o.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Status Bar */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-white/60 border-t border-white/10 pt-3">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Autosaved on PostgreSQL Cluster
        </span>
        <span className="font-mono">8 of 12 Answered (66%)</span>
      </div>
    </div>
  );
}

export function HomePage() {
  const { state } = useAuth();
  if (state.status === "authenticated") return <Navigate to={roleHome[state.user.role]} replace />;

  return (
    <div className="space-y-16 py-6 md:py-12">
      {/* Hero Section */}
      <section className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>ARQON Enterprise v0.1 · Production Ready</span>
          </div>

          <h1 className="text-4xl font-black leading-[1.08] tracking-tight md:text-5xl lg:text-[3.5rem] text-ink">
            Assess real engineering skills. <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Hire on verifiable evidence.
            </span>
          </h1>

          <p className="max-w-lg text-base md:text-lg text-muted leading-relaxed">
            High-integrity coding examinations and recruitment assessments. Built with
            server-authoritative timers, Monaco IDE code editors, multi-schema PostgreSQL data isolation,
            and real-time candidate delivery.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/demo-exam"
              className="btn btn-primary px-6 py-3.5 text-sm no-underline shadow-lg hover:shadow-emerald-500/25 transition-all font-bold flex items-center gap-2 group"
            >
              <Sparkles className="h-4 w-4 text-emerald-300 animate-pulse" />
              <span>Try Interactive Demo Exam</span>
              <ArrowRight className="h-4 w-4 ml-0.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="btn btn-quiet px-5 py-3.5 text-sm no-underline border border-line hover:border-ink transition-colors font-semibold"
            >
              <span>Sign in to Portal</span>
            </Link>
            <Link
              to="/status"
              className="btn btn-quiet px-4 py-3.5 text-sm no-underline border border-line hover:border-ink transition-colors font-medium text-muted hover:text-ink hidden sm:flex items-center"
            >
              <Activity className="h-4 w-4 mr-1 text-emerald-500" />
              <span>SRE</span>
            </Link>
          </div>

          {/* Quick Platform Super Admin Credentials Pill */}
          <div className="rounded-2xl border border-line bg-panel p-4 max-w-md shadow-xs">
            <div className="font-semibold text-ink text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Super Admin Bootstrap Ready:</span>
              </span>
              <span className="badge badge-ok !text-[10px]">Verified</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-sunk/60 px-3 py-1.5 font-mono text-[11px] text-ink">
              <span>arjunnshinde9@gmail.com</span>
              <span className="text-muted text-[10px]">Arjun Shinde</span>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Click <b>Sign in to Portal</b> to authenticate. A 1-click credential autofill pill is available on the login screen.
            </p>
          </div>
        </div>

        {/* Interactive Answer Sheet Preview Card */}
        <SheetPreview />
      </section>

      {/* Live Enterprise Capabilities Grid */}
      <section className="space-y-6 border-t border-line pt-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink">
            Engineered for High-Stakes Assessments
          </h2>
          <p className="text-sm text-muted">
            Zero reliance on client clocks. Zero cross-tenant data leaks. Complete auditability.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 pt-4">
          <div className="panel p-6 space-y-3 hover:border-emerald-500/40 transition-colors shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="section-title text-base font-bold text-ink">Server-Authoritative Clock</h3>
            <p className="text-xs md:text-sm text-muted leading-relaxed">
              Deadlines are computed and enforced purely by the backend. Client clock manipulation, browser pauses,
              or simulated delays have zero effect; sessions auto-submit strictly at server deadline expiry.
            </p>
          </div>

          <div className="panel p-6 space-y-3 hover:border-sky-500/40 transition-colors shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Terminal className="h-5 w-5" />
            </div>
            <h3 className="section-title text-base font-bold text-ink">Monaco IDE Code Engine</h3>
            <p className="text-xs md:text-sm text-muted leading-relaxed">
              The full VS Code Monaco Editor experience with language presets (Java, Python, C++, JavaScript),
              syntax highlighting, visible test case execution, and resilient autosaving every few keystrokes.
            </p>
          </div>

          <div className="panel p-6 space-y-3 hover:border-purple-500/40 transition-colors shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="section-title text-base font-bold text-ink">Multi-Tenant PostgreSQL RLS</h3>
            <p className="text-xs md:text-sm text-muted leading-relaxed">
              Database Row-Level Security (RLS) on PostgreSQL 18. Each tenant&apos;s question bank, candidate records,
              invitations, and scoring benchmarks remain completely isolated at the kernel database level.
            </p>
          </div>
        </div>

        {/* Secondary Capabilities Strip */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 pt-2">
          <div className="rounded-xl border border-line bg-panel p-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-pink-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-ink">Real-Time Email Gateway</p>
              <p className="text-[11px] text-muted">Dual SMTP & outbox stream</p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-ink">Argon2id Hashes</p>
              <p className="text-[11px] text-muted">Zero plaintext secrets stored</p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-ink">State Recovery</p>
              <p className="text-[11px] text-muted">Survives tab closure & refresh</p>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-ink">Automated Scoring</p>
              <p className="text-[11px] text-muted">Weighted MCQ + code review</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
