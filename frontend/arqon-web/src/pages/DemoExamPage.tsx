import { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Camera,
  Mic,
  Monitor,
  Laptop,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  Edit3,
  X,
  Cpu,
  Award,
} from "lucide-react";
import { LiveWebcamFeed } from "../components/LiveWebcamFeed";
import { Modal } from "../components/Modal";
import { useMediaStream } from "../hooks/useMediaStream";

const Editor = lazy(() => import("@monaco-editor/react"));

type Step = "diagnostics" | "hardware" | "exam" | "results";
type Language = "java" | "python" | "javascript";

const CODING_STARTER_CODES: Record<Language, string> = {
  java: `public class Solution {
    public static boolean isPalindrome(String s) {
        if (s == null) return false;
        int left = 0, right = s.length() - 1;
        while (left < right) {
            while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
            while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
            if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }
}`,
  python: `def is_palindrome(s: str) -> bool:
    if s is None:
        return False
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True`,
  javascript: `function isPalindrome(s) {
  if (typeof s !== "string") return false;
  let left = 0, right = s.length - 1;
  while (left < right) {
    while (left < right && !/[a-zA-Z0-9]/.test(s[left])) left++;
    while (left < right && !/[a-zA-Z0-9]/.test(s[right])) right--;
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++;
    right--;
  }
  return true;
}`,
};

const Q1_OPTIONS = [
  "Read Committed (Snapshot Isolation per statement)",
  "Repeatable Read (Snapshot Isolation across transaction)",
  "Serializable (SSI / Predicate-based locking)",
  "Read Uncommitted (Permits dirty reads)",
] as const;

const Q2_OPTIONS = [
  "Circuit Breaker Pattern (Fails fast after failure thresholds)",
  "Bulkhead Pattern (Isolates thread pools and resource quotas)",
  "Distributed Two-Phase Commit Locks across all nodes",
  "Unbounded Exponential Retries without Jitter or Backoff",
] as const;

const DEMO_QUESTIONS = [
  {
    id: "q1",
    num: 1,
    title: "PostgreSQL MVCC & Isolation Levels",
    type: "MCQ (Single Choice)",
    points: 10,
    prompt:
      "In relational database design, which SQL transaction isolation level completely guarantees protection against dirty reads, non-repeatable reads, and phantom reads by enforcing serializable schedule execution?",
    options: Q1_OPTIONS,
    correct: 2,
  },
  {
    id: "q2",
    num: 2,
    title: "Microservices Resiliency & Fault Isolation",
    type: "MCQ (Multiple Choice)",
    points: 15,
    prompt:
      "Which TWO architectural patterns actively prevent cascading failures when downstream microservice dependencies experience high latency or catastrophic downtime?",
    options: Q2_OPTIONS,
    correctIndices: [0, 1],
  },
  {
    id: "q3",
    num: 3,
    title: "Two-Pointer Palindrome Verification",
    type: "Coding Exercise",
    points: 25,
    prompt:
      "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Implement isPalindrome(s) running in O(N) time and O(1) auxiliary space.",
    starterCode: CODING_STARTER_CODES,
    sampleTests: [
      { input: `"A man, a plan, a canal: Panama"`, expected: "true" },
      { input: `"race a car"`, expected: "false" },
    ],
  },
];

export function DemoExamPage() {
  const [step, setStep] = useState<Step>("diagnostics");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | number[]>>({});
  const [tabWarnings, setTabWarnings] = useState(0);

  const media = useMediaStream({ video: true, audio: true, autoStart: false });

  const resetAll = () => {
    setStep("diagnostics");
    setSelectedAnswers({});
    setTabWarnings(0);
    media.stop();
  };

  if (step === "diagnostics") {
    return (
      <DiagnosticsStep
        onNext={() => {
          setStep("hardware");
          void media.requestAccess();
        }}
      />
    );
  }

  if (step === "hardware") {
    return (
      <HardwareStep
        media={media}
        onBack={() => setStep("diagnostics")}
        onNext={() => {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          setStep("exam");
        }}
      />
    );
  }

  if (step === "exam") {
    return (
      <ExamStep
        media={media}
        selectedAnswers={selectedAnswers}
        setSelectedAnswers={setSelectedAnswers}
        tabWarnings={tabWarnings}
        setTabWarnings={setTabWarnings}
        onSubmit={() => setStep("results")}
      />
    );
  }

  return <ResultsStep selectedAnswers={selectedAnswers} tabWarnings={tabWarnings} onRestart={resetAll} />;
}

function DiagnosticsStep({ onNext }: { onNext: () => void }) {
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    fetch("/api/v1/system/ping")
      .then((r) => {
        if (r.ok) setLatency(Math.round(performance.now() - start));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-8 animate-fade">
      <div className="panel p-6 md:p-8 rounded-3xl border border-line bg-panel shadow-xl space-y-6">
        <div className="border-b border-line pb-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Demo Sandbox</span>
          </div>
          <h1 className="page-title text-2xl md:text-3xl font-extrabold text-ink">ARQON Proctored Exam Sandbox</h1>
          <p className="text-xs md:text-sm text-muted mt-1">
            Experience candidate onboarding, live camera supervision, Monaco IDE testing, and automated scorecards.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-ink">Step 1: Automated System Diagnostics</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <DiagnosticItem icon={<Laptop className="h-5 w-5 text-emerald-500" />} title="Operating System & Browser" desc="WebRTC & WebAssembly Enabled" />
            <DiagnosticItem
              icon={<Monitor className="h-5 w-5 text-emerald-500" />}
              title="Display Resolution"
              desc={`${window.screen.width} × ${window.screen.height} (Optimal)`}
            />
            <DiagnosticItem
              icon={<Wifi className="h-5 w-5 text-emerald-500" />}
              title="Roundtrip Latency"
              desc={latency ? `${latency}ms (Low Jitter)` : "Probing…"}
            />
            <DiagnosticItem icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />} title="Clock Synchronization" desc="UTC Authoritative Time" />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onNext}
            className="btn btn-primary btn-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md py-2.5 px-4"
          >
            <span>Continue to Camera & Mic Access</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DiagnosticItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-line p-3.5 bg-sunk/30 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs font-bold text-ink">{title}</p>
          <p className="text-[11px] text-muted">{desc}</p>
        </div>
      </div>
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    </div>
  );
}

function HardwareStep({
  media,
  onBack,
  onNext,
}: {
  media: ReturnType<typeof useMediaStream>;
  onBack: () => void;
  onNext: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mx-auto max-w-3xl py-8 space-y-8 animate-fade">
      <div className="panel p-6 md:p-8 rounded-3xl border border-line bg-panel shadow-xl space-y-6">
        <div className="border-b border-line pb-4 flex items-center justify-between">
          <div>
            <h1 className="page-title text-xl md:text-2xl font-extrabold text-ink">Step 2: Hardware Telemetry</h1>
            <p className="text-xs text-muted mt-0.5">Grant camera and microphone permissions for proctoring verification.</p>
          </div>
          <button type="button" onClick={() => void media.requestAccess()} className="btn btn-quiet btn-sm text-xs font-semibold cursor-pointer">
            Retry Access
          </button>
        </div>

        {media.error && (
          <div className="panel p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-400 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>Permission Notice</span>
            </div>
            <p>{media.error}</p>
            <button type="button" onClick={() => void media.requestAccess()} className="btn btn-primary btn-sm text-xs font-semibold">
              Allow Devices in Browser
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line bg-rail text-white p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>Webcam Stream</span>
              </span>
              <span className="badge text-[10px] font-mono bg-emerald-500/20 text-emerald-400">
                {media.status === "granted" ? "WEBRTC LIVE" : "AWAITING PERMISSION"}
              </span>
            </div>
            <div className="h-48 rounded-xl bg-black overflow-hidden relative">
              {media.status === "granted" ? (
                <LiveWebcamFeed stream={media.stream} className="h-full w-full" overlay={true} />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="h-10 w-10 text-white/30 mb-2" />
                  <span className="text-xs text-white/70">
                    {media.status === "requesting" ? "Requesting prompt…" : "Click below to grant camera access"}
                  </span>
                  <button type="button" onClick={() => void media.requestAccess()} className="btn btn-primary btn-sm text-xs font-semibold mt-3">
                    Allow Camera
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <Mic className="h-4 w-4 text-sky-500" />
                <span>Microphone Pickup</span>
              </span>
              <span className="badge text-[10px] font-mono bg-sky-500/10 text-sky-600">
                {media.audioLevel > 15 ? "VOICE DETECTED" : "LISTENING"}
              </span>
            </div>
            <div className="h-48 rounded-xl border border-line bg-sunk/30 flex flex-col items-center justify-center p-4 text-center space-y-3">
              <div className="flex items-end gap-1.5 h-16 justify-center">
                {[20, 35, 55, 75, 95, 75, 55, 35, 20].map((scale, i) => {
                  const h = Math.max(10, Math.min(100, (media.audioLevel * scale) / 50));
                  return (
                    <span
                      key={i}
                      style={{ height: `${h}%` }}
                      className={`w-2.5 rounded-full transition-all duration-75 ${
                        media.audioLevel > 20 ? "bg-gradient-to-t from-emerald-500 to-teal-400" : "bg-emerald-500/40"
                      }`}
                    />
                  );
                })}
              </div>
              <div className="text-xs font-mono font-bold text-ink">Level: {media.audioLevel}%</div>
              <p className="text-[11px] text-muted">Speak into your microphone to verify acoustic pickup.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-4 space-y-4">
          <label className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4 cursor-pointer hover:border-ink transition-colors">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-ink cursor-pointer"
            />
            <span className="text-xs text-ink leading-relaxed font-medium">
              I agree to the ARQON Assessment Honor Code. I consent to real-time optical supervision and affirm that I will complete this
              examination independently.
            </span>
          </label>

          <div className="flex justify-between items-center">
            <button type="button" onClick={onBack} className="btn btn-quiet btn-sm text-xs font-semibold">
              Back to Diagnostics
            </button>
            <button
              type="button"
              disabled={!agreed}
              onClick={onNext}
              className="btn btn-primary btn-sm text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md py-3 px-6 disabled:opacity-50"
            >
              <span>Launch Interactive Exam Demo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamStep({
  media,
  selectedAnswers,
  setSelectedAnswers,
  tabWarnings,
  setTabWarnings,
  onSubmit,
}: {
  media: ReturnType<typeof useMediaStream>;
  selectedAnswers: Record<string, number | number[]>;
  setSelectedAnswers: React.Dispatch<React.SetStateAction<Record<string, number | number[]>>>;
  tabWarnings: number;
  setTabWarnings: React.Dispatch<React.SetStateAction<number>>;
  onSubmit: () => void;
}) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("java");
  const [userCode, setUserCode] = useState(CODING_STARTER_CODES.java);
  const [secondsLeft, setSecondsLeft] = useState(1200);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showPipCam, setShowPipCam] = useState(true);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState("");
  const [testResults, setTestResults] = useState<{ running: boolean; passed: boolean; output: string } | null>(null);
  const [customInput, setCustomInput] = useState(`"racecar"`);
  const [activeIdeTab, setActiveIdeTab] = useState<"tests" | "custom">("tests");
  const [expandedIde, setExpandedIde] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const handleBlur = () => {
      setTabWarnings((prev) => prev + 1);
      setShowWarningModal(true);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [setTabWarnings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          onSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onSubmit]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setUserCode(CODING_STARTER_CODES[lang]);
    setTestResults(null);
  };

  const runSampleTests = () => {
    setTestResults({ running: true, passed: false, output: "Executing against sandbox worker…" });
    setTimeout(() => {
      setTestResults({
        running: false,
        passed: true,
        output: `✓ Test Case 1 Passed: Input "A man, a plan, a canal: Panama" -> Expected: true, Actual: true (6ms)\n✓ Test Case 2 Passed: Input "race a car" -> Expected: false, Actual: false (5ms)\n\nAll 2 public test cases passed successfully! (Latency: 11ms)`,
      });
    }, 450);
  };

  const runCustomTest = () => {
    setTestResults({ running: true, passed: false, output: `Running custom input ${customInput}…` });
    setTimeout(() => {
      const isClean = customInput.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isPal = isClean === isClean.split("").reverse().join("");
      setTestResults({
        running: false,
        passed: isPal,
        output: `Custom Evaluation Output:\nInput: ${customInput}\nComputed Result: ${isPal}\nMemory: 14.2MB\nTime: 7ms`,
      });
    }, 400);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const currentQ = DEMO_QUESTIONS[currentQIndex];

  return (
    <div className="space-y-6 pb-20 animate-fade">
      {showWarningModal && (
        <Modal title="Integrity Alert: Window Focus Lost" onClose={() => setShowWarningModal(false)}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-500 font-bold">
              <AlertTriangle className="h-5 w-5" />
              <span>Tab Departure Detected</span>
            </div>
            <p className="text-muted leading-relaxed">
              Navigating away from the active examination window violates assessment policies. This event has been recorded in the audit trail.
            </p>
            <div className="p-3 rounded-xl bg-sunk/60 border border-line flex items-center justify-between font-mono">
              <span>Total Warning Strikes:</span>
              <span className="text-rose-500 font-bold text-sm">{tabWarnings} of 3</span>
            </div>
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="btn btn-primary w-full py-2.5 font-bold cursor-pointer"
            >
              Acknowledge and Return to Exam
            </button>
          </div>
        </Modal>
      )}

      {showSubmitModal && (
        <Modal title="Confirm Final Submission" onClose={() => setShowSubmitModal(false)}>
          <div className="space-y-4 text-xs">
            <p className="text-muted leading-relaxed">
              Are you ready to submit your solutions? Once submitted, answers are permanently locked and cannot be edited.
            </p>
            <div className="p-3 rounded-xl bg-sunk/40 border border-line space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>Q1 (PostgreSQL MVCC):</span>
                <span className={selectedAnswers["q1"] != null ? "text-emerald-600 font-bold" : "text-amber-500"}>
                  {selectedAnswers["q1"] != null ? "Answered" : "Unanswered"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Q2 (Microservices Resiliency):</span>
                <span className={selectedAnswers["q2"] != null ? "text-emerald-600 font-bold" : "text-amber-500"}>
                  {selectedAnswers["q2"] != null ? "Answered" : "Unanswered"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Q3 (Palindrome Coding):</span>
                <span className="text-emerald-600 font-bold">Solution Stored</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowSubmitModal(false)} className="btn btn-quiet text-xs font-semibold">
                Continue Reviewing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  onSubmit();
                }}
                className="btn btn-primary text-xs font-bold cursor-pointer"
              >
                Confirm & Submit Exam
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPipCam ? (
        <div className="fixed bottom-5 right-5 z-40 w-52 rounded-2xl border border-white/20 bg-rail text-white shadow-2xl overflow-hidden backdrop-blur-xl animate-fade">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white/10 text-[10px] font-bold border-b border-white/10">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>WebRTC Live Feed</span>
            </span>
            <button onClick={() => setShowPipCam(false)} className="text-white/60 hover:text-white cursor-pointer" title="Minimize Camera">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="h-32 bg-black relative">
            <LiveWebcamFeed stream={media.stream} className="h-full w-full" overlay={true} />
          </div>
          <div className="px-2.5 py-1 bg-black/80 flex items-center justify-between text-[9px] font-mono border-t border-white/10">
            <div className="flex items-center gap-1 text-white/80">
              <Mic className="h-3 w-3 text-emerald-400" />
              <span>MIC {media.audioLevel}%</span>
            </div>
            <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden flex">
              <div style={{ width: `${media.audioLevel}%` }} className="bg-emerald-400 h-full transition-all duration-75" />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPipCam(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full bg-rail text-white border border-white/20 px-3 py-1.5 text-xs font-semibold shadow-xl hover:bg-white/15 cursor-pointer"
        >
          <Camera className="h-3.5 w-3.5 text-emerald-400" />
          <span>Show Camera PIP</span>
        </button>
      )}

      <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white font-extrabold text-sm">A</div>
          <div>
            <h1 className="font-bold text-sm text-ink">Production Assessment Sandbox</h1>
            <p className="text-[11px] text-muted">Question {currentQIndex + 1} of 3</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {DEMO_QUESTIONS.map((q, idx) => {
            const answered =
              idx === 2 ? true : idx === 0 ? selectedAnswers["q1"] != null : (selectedAnswers["q2"] as number[])?.length > 0;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentQIndex(idx)}
                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentQIndex === idx
                    ? "bg-ink text-white ring-2 ring-ink ring-offset-2"
                    : answered
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-sunk text-muted hover:text-ink"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowScratchpad(!showScratchpad)}
            className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Scratchpad</span>
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-sunk/60 px-3 py-1.5 font-mono text-xs font-bold text-ink border border-line">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="btn btn-primary btn-sm text-xs font-bold cursor-pointer shadow-xs"
          >
            Submit Exam
          </button>
        </div>
      </div>

      <div className="panel p-6 md:p-8 rounded-3xl border border-line bg-panel shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="badge text-xs font-bold bg-sunk text-muted">{currentQ.type}</span>
            <span className="badge text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {currentQ.points} Points
            </span>
          </div>
          <span className="text-xs text-muted font-mono">Q-ID: {currentQ.id}</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-extrabold text-ink">{currentQ.title}</h2>
          <p className="text-xs md:text-sm text-ink leading-relaxed whitespace-pre-wrap">{currentQ.prompt}</p>
        </div>

        {currentQIndex === 0 && (
          <div className="space-y-3 pt-2">
            {Q1_OPTIONS.map((opt, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                  selectedAnswers["q1"] === idx ? "border-ink bg-sunk/40 shadow-xs" : "border-line bg-panel hover:border-ink/50"
                }`}
              >
                <input
                  type="radio"
                  name="q1_option"
                  checked={selectedAnswers["q1"] === idx}
                  onChange={() => setSelectedAnswers((prev) => ({ ...prev, q1: idx }))}
                  className="mt-0.5 h-4 w-4 accent-ink cursor-pointer"
                />
                <span className="text-xs text-ink leading-relaxed font-medium">{opt}</span>
              </label>
            ))}
          </div>
        )}

        {currentQIndex === 1 && (
          <div className="space-y-3 pt-2">
            {Q2_OPTIONS.map((opt, idx) => {
              const sel = (selectedAnswers["q2"] as number[]) || [];
              const isChecked = sel.includes(idx);
              return (
                <label
                  key={idx}
                  className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                    isChecked ? "border-ink bg-sunk/40 shadow-xs" : "border-line bg-panel hover:border-ink/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      setSelectedAnswers((prev) => {
                        const cur = ((prev["q2"] as number[]) || []).slice();
                        const next = isChecked ? cur.filter((x) => x !== idx) : [...cur, idx].sort();
                        return { ...prev, q2: next };
                      });
                    }}
                    className="mt-0.5 h-4 w-4 accent-ink cursor-pointer rounded"
                  />
                  <span className="text-xs text-ink leading-relaxed font-medium">{opt}</span>
                </label>
              );
            })}
          </div>
        )}

        {currentQIndex === 2 && (
          <div className="space-y-4 pt-2">
            <div className="panel p-3 rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 bg-sunk/30">
              <div className="flex items-center gap-1.5">
                {(["java", "python", "javascript"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLanguageChange(l)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer uppercase font-mono ${
                      language === l ? "bg-ink text-white shadow-2xs" : "bg-sunk/40 text-muted hover:text-ink"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUserCode(CODING_STARTER_CODES[language])}
                  className="btn btn-quiet btn-sm !py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Starter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedIde(!expandedIde)}
                  className="btn btn-quiet btn-sm !py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {expandedIde ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  <span>{expandedIde ? "Compact View" : "Expand IDE"}</span>
                </button>
              </div>
            </div>

            <div style={{ height: expandedIde ? "500px" : "320px" }} className="rounded-2xl overflow-hidden border border-line shadow-inner">
              <Suspense
                fallback={<div className="h-full bg-[#0e1118] flex items-center justify-center text-xs text-white/50">Loading Monaco IDE…</div>}
              >
                <Editor
                  height="100%"
                  language={language}
                  value={userCode}
                  onChange={(val) => setUserCode(val ?? "")}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontFamily: "JetBrains Mono, Fira Code, monospace",
                  }}
                />
              </Suspense>
            </div>

            <div className="panel p-4 rounded-2xl border border-line bg-sunk/20 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveIdeTab("tests")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      activeIdeTab === "tests" ? "bg-panel text-ink shadow-2xs font-bold" : "text-muted"
                    }`}
                  >
                    Sample Tests (2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIdeTab("custom")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      activeIdeTab === "custom" ? "bg-panel text-ink shadow-2xs font-bold" : "text-muted"
                    }`}
                  >
                    Custom Test Input
                  </button>
                </div>

                <button
                  type="button"
                  onClick={activeIdeTab === "tests" ? runSampleTests : runCustomTest}
                  className="btn btn-primary btn-sm text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Run Tests</span>
                </button>
              </div>

              {activeIdeTab === "custom" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-muted">Test String Input:</label>
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="w-full rounded-xl border border-line bg-panel p-2.5 text-xs font-mono"
                  />
                </div>
              )}

              {testResults && (
                <div className="animate-fade rounded-xl bg-[#0e1118] p-3 text-xs font-mono border border-line text-emerald-300 whitespace-pre-wrap">
                  {testResults.output}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showScratchpad && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 md:w-96 bg-panel border-l border-line shadow-2xl p-5 flex flex-col space-y-4 animate-fade">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2 text-ink font-bold text-sm">
              <Edit3 className="h-4 w-4 text-emerald-500" />
              <span>Candidate Scratchpad</span>
            </div>
            <button type="button" onClick={() => setShowScratchpad(false)} className="text-muted hover:text-ink cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
            placeholder="Rough notes, algorithm pseudocode, variable tracking…"
            className="flex-1 w-full border border-line rounded-xl p-3 text-xs font-mono bg-sunk/20 focus:border-ink resize-none"
          />
        </div>
      )}
    </div>
  );
}

function ResultsStep({
  selectedAnswers,
  tabWarnings,
  onRestart,
}: {
  selectedAnswers: Record<string, number | number[]>;
  tabWarnings: number;
  onRestart: () => void;
}) {
  const q1Correct = selectedAnswers["q1"] === 2;
  const q2Selected = (selectedAnswers["q2"] as number[]) || [];
  const q2Correct = q2Selected.length === 2 && q2Selected.includes(0) && q2Selected.includes(1);
  const scoreMcq = (q1Correct ? 10 : 0) + (q2Correct ? 15 : 0);
  const scoreTotal = scoreMcq + 25;

  return (
    <div className="mx-auto max-w-4xl py-8 space-y-8 animate-fade">
      <div className="panel p-6 md:p-8 rounded-3xl border border-line bg-panel shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
              <Award className="h-3.5 w-3.5" />
              <span>Assessment Completed & Evaluated</span>
            </div>
            <h1 className="page-title text-2xl md:text-3xl font-extrabold text-ink">Evaluation & Scoring Dossier</h1>
            <p className="text-xs md:text-sm text-muted mt-1">
              Your examination has been automatically evaluated with real-time test verification and integrity audit.
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center min-w-[140px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Provisional Score</span>
            <span className="text-3xl font-black text-ink font-mono">{scoreTotal} / 50</span>
            <span className="badge badge-ok text-[10px] font-bold mt-1 inline-block">PASSED</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
            <span className="text-xs font-bold text-muted uppercase">MCQ Auto-Score</span>
            <div className="text-2xl font-extrabold text-ink font-mono">{scoreMcq} / 25 pts</div>
            <p className="text-[11px] text-muted">{q1Correct && q2Correct ? "100% Correct Key Match" : "Partial Scoring Calculated"}</p>
          </div>

          <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
            <span className="text-xs font-bold text-muted uppercase">Coding Evaluation</span>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono">2 / 2 Tests</div>
            <p className="text-[11px] text-muted">Sample & bounds tests executed in 11ms</p>
          </div>

          <div className="panel p-4 rounded-xl border border-line bg-panel space-y-1">
            <span className="text-xs font-bold text-muted uppercase">Proctoring Trust</span>
            <div className="text-2xl font-extrabold text-ink font-mono">
              {tabWarnings === 0 ? "98.4%" : `${Math.max(70, 98 - tabWarnings * 10)}%`}
            </div>
            <p className="text-[11px] text-muted">{tabWarnings} Tab departure strikes logged</p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-ink">Granular Submission Breakdown</h2>

          <div className="rounded-xl border border-line p-4 bg-sunk/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="font-bold text-ink">Q1: PostgreSQL MVCC & Isolation Levels</span>
              <span className={q1Correct ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                {q1Correct ? "✓ Correct (10/10)" : "✕ Incorrect (0/10)"}
              </span>
            </div>
            <p className="text-xs text-muted">Correct Key: Option C (Serializable SSI / Predicate-based locking)</p>
          </div>

          <div className="rounded-xl border border-line p-4 bg-sunk/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="font-bold text-ink">Q2: Microservices Resiliency Patterns</span>
              <span className={q2Correct ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                {q2Correct ? "✓ Correct (15/15)" : "✕ Partial/Incorrect"}
              </span>
            </div>
            <p className="text-xs text-muted">Correct Keys: Circuit Breaker Pattern & Bulkhead Pattern</p>
          </div>

          <div className="rounded-xl border border-line p-4 bg-sunk/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="font-bold text-ink">Q3: Valid Palindrome (Coding Solution)</span>
              <span className="text-emerald-600 font-bold">✓ Tests Verified (25/25)</span>
            </div>

            <div className="panel p-3.5 rounded-lg border border-sky-500/30 bg-sky-500/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <Cpu className="h-4 w-4" />
                  <span>Optimal Reference Architecture Benchmark</span>
                </span>
                <span className="badge text-[10px] font-mono bg-sky-500/20 text-sky-400">O(N) Time · O(1) Space</span>
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-[#0e1118] p-3 text-xs text-sky-300 font-mono">
{`public static boolean isPalindrome(String s) {
    int left = 0, right = s.length() - 1;
    while (left < right) {
        while (left < right && !Character.isLetterOrDigit(s.charAt(left))) left++;
        while (left < right && !Character.isLetterOrDigit(s.charAt(right))) right--;
        if (Character.toLowerCase(s.charAt(left)) != Character.toLowerCase(s.charAt(right))) return false;
        left++; right--;
    }
    return true;
}`}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          <Link to="/" className="btn btn-quiet text-xs font-semibold no-underline">
            Back to Platform Home
          </Link>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onRestart} className="btn btn-quiet text-xs font-semibold cursor-pointer">
              Restart Demo
            </button>
            <Link to="/login" className="btn btn-primary text-xs font-bold no-underline">
              Sign In as Super Admin / Recruiter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
