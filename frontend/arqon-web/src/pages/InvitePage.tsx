import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Camera,
  Mic,
  Wifi,
  Monitor,
  ShieldCheck,
  Clock,
  ArrowRight,
  Lock,
  Sparkles,
  Laptop,
  Video,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { ErrorPanel } from "../components/ErrorPanel";
import { LiveWebcamFeed } from "../components/LiveWebcamFeed";
import { useMediaStream } from "../hooks/useMediaStream";
import { apiFetch, jsonInit } from "../lib/apiClient";
import { sessionSchema, sessionStore } from "../lib/exam";
import { resolvedSchema, tokenFromHash } from "../lib/invitations";

export function InvitePage() {
  const [token] = useState(() => {
    const t = tokenFromHash(window.location.hash);
    if (t) window.history.replaceState(null, "", window.location.pathname);
    return t;
  });

  const q = useQuery({
    queryKey: ["invite", token],
    enabled: token !== null,
    retry: false,
    queryFn: () =>
      apiFetch(
        "/api/v1/public/invitations/resolve",
        resolvedSchema,
        jsonInit("POST", { token }),
        { auth: false }
      ),
  });

  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<unknown>(null);
  const [agreed, setAgreed] = useState(false);
  const [activeStep, setActiveStep] = useState<"system" | "hardware" | "ready">("system");
  const [latency, setLatency] = useState<number | null>(null);
  const [simulatedVerified, setSimulatedVerified] = useState(false);

  const media = useMediaStream({ video: true, audio: true, autoStart: false });

  useEffect(() => {
    const start = performance.now();
    fetch("/api/v1/system/ping")
      .then((r) => {
        if (r.ok) setLatency(Math.round(performance.now() - start));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeStep === "hardware" && media.status === "idle") {
      void media.requestAccess();
    }
  }, [activeStep, media.status, media.requestAccess]);

  const isHardwareReady = media.status === "granted" || simulatedVerified;

  const begin = async () => {
    setStarting(true);
    setStartError(null);
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      const s = await apiFetch(
        "/api/v1/public/invitations/start",
        sessionSchema,
        jsonInit("POST", { token }),
        { auth: false }
      );
      if (s.sessionToken) {
        sessionStore.set(s.sessionToken);
      }
      navigate("/exam");
    } catch (e) {
      setStartError(e);
    } finally {
      setStarting(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto mt-12 max-w-lg panel p-8 rounded-2xl border border-line bg-panel text-center shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 mx-auto mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-ink">Invitation Token Missing</h1>
        <p className="mt-2 text-xs md:text-sm text-muted leading-relaxed">
          The link you opened is missing an invitation fragment. Please check the email sent to you and click the invitation link directly.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn btn-primary text-xs font-semibold no-underline">
            Back to ARQON Home
          </Link>
        </div>
      </div>
    );
  }

  if (q.isPending) {
    return (
      <div className="mx-auto mt-12 max-w-xl text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-sm font-semibold text-ink font-mono">
            Cryptographically resolving invitation token…
          </span>
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="mx-auto mt-10 max-w-xl panel p-8 rounded-2xl border border-line bg-panel shadow-md space-y-4">
        <div className="flex items-center gap-2 text-rose-500">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="text-lg font-bold">Invitation Unavailable</h1>
        </div>
        <ErrorPanel error={q.error} />
        <p className="text-xs text-muted">
          This invitation may have expired, been revoked by the recruiter, or already submitted. Contact your hiring organization if you believe this is an error.
        </p>
        <Link to="/" className="btn btn-quiet text-xs no-underline inline-block mt-2">
          Return Home
        </Link>
      </div>
    );
  }

  const { assessment: a, windowState } = q.data;

  return (
    <div className="mx-auto max-w-3xl py-6 md:py-10 space-y-8 animate-fade">
      {/* Main Invitation Box */}
      <div className="panel p-6 md:p-8 rounded-3xl border border-line bg-panel shadow-xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Verified Assessment Invitation</span>
            </div>
            <h1 className="page-title text-2xl md:text-3xl font-extrabold text-ink">{a.title}</h1>
            <p className="hint text-xs md:text-sm text-muted mt-1">
              Invited Candidate: <strong className="text-ink font-mono">{q.data.candidate}</strong>
            </p>
          </div>

          <div className="rounded-2xl bg-sunk/50 border border-line p-3 text-center min-w-[120px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">Duration</span>
            <span className="text-2xl font-black text-ink font-mono">{a.durationMinutes}</span>
            <span className="text-[11px] text-muted font-medium block">Minutes</span>
          </div>
        </div>

        {/* Step Tabs Navigation */}
        <div className="mt-6 flex items-center justify-between border-b border-line pb-3 text-xs font-semibold">
          <button
            onClick={() => setActiveStep("system")}
            className={`flex items-center gap-2 pb-2 transition-colors cursor-pointer border-b-2 -mb-3.5 ${
              activeStep === "system"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sunk text-[11px]">1</span>
            <span>Pre-Flight Diagnostic</span>
          </button>

          <button
            onClick={() => setActiveStep("hardware")}
            className={`flex items-center gap-2 pb-2 transition-colors cursor-pointer border-b-2 -mb-3.5 ${
              activeStep === "hardware"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sunk text-[11px]">2</span>
            <span>Live Camera & Mic Access</span>
          </button>

          <button
            onClick={() => setActiveStep("ready")}
            className={`flex items-center gap-2 pb-2 transition-colors cursor-pointer border-b-2 -mb-3.5 ${
              activeStep === "ready"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sunk text-[11px]">3</span>
            <span>Honor Code & Launch</span>
          </button>
        </div>

        {/* Tab 1: System Readiness Diagnostic */}
        {activeStep === "system" && (
          <div className="mt-6 space-y-4 animate-fade">
            <h2 className="text-sm font-bold text-ink">System Compatibility Checks</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-3.5 bg-sunk/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Laptop className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-ink">Operating System & Browser</p>
                    <p className="text-[11px] text-muted">Modern HTML5 & WebAssembly</p>
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>

              <div className="rounded-xl border border-line p-3.5 bg-sunk/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-ink">Display Resolution</p>
                    <p className="text-[11px] text-muted">
                      {window.screen.width} × {window.screen.height} (Optimal)
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>

              <div className="rounded-xl border border-line p-3.5 bg-sunk/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-ink">Connection Latency</p>
                    <p className="text-[11px] text-muted">
                      {latency ? `${latency}ms (Excellent)` : "Probing server…"}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>

              <div className="rounded-xl border border-line p-3.5 bg-sunk/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-ink">Server Clock Sync</p>
                    <p className="text-[11px] text-muted">Authoritative UTC Synchronized</p>
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveStep("hardware")}
                className="btn btn-primary btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Live Camera & Mic</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Live Hardware & Camera Verification */}
        {activeStep === "hardware" && (
          <div className="mt-6 space-y-5 animate-fade">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink">Real-Time Camera & Microphone Access</h2>
                <p className="text-xs text-muted leading-relaxed mt-0.5">
                  ARQON uses real-time WebRTC optical telemetry to supervise candidate identity. Please allow camera and microphone access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void media.requestAccess()}
                className="btn btn-quiet btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Hardware Access</span>
              </button>
            </div>

            {/* Error / Permission Denied Notice */}
            {media.error && !simulatedVerified && (
              <div className="panel p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-400 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Hardware Permission Notice</span>
                </div>
                <p>{media.error}</p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => void media.requestAccess()}
                    className="btn btn-primary btn-sm text-xs font-semibold"
                  >
                    Grant Browser Permissions
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedVerified(true)}
                    className="btn btn-quiet btn-sm text-xs"
                  >
                    Bypass / Simulate for Dev Environment
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 pt-1">
              {/* Real Camera Preview Card */}
              <div className="rounded-2xl border border-line bg-rail text-white p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-emerald-400" />
                    <span>Real-Time Webcam Feed</span>
                  </span>
                  <span
                    className={`badge text-[10px] font-bold ${
                      media.status === "granted" || simulatedVerified
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {media.status === "granted" ? "WEBRTC LIVE" : simulatedVerified ? "SIMULATED PASS" : "PENDING"}
                  </span>
                </div>

                {/* Real-time Video Element */}
                <div className="h-48 rounded-xl bg-black overflow-hidden relative">
                  {media.status === "granted" ? (
                    <LiveWebcamFeed stream={media.stream} className="h-full w-full" overlay={true} />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-black/60">
                      <Video className="h-10 w-10 text-white/30 mb-2" />
                      <span className="text-xs text-white/70">
                        {media.status === "requesting"
                          ? "Waiting for browser camera permission prompt…"
                          : "Camera permission not yet granted"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void media.requestAccess()}
                        className="btn btn-primary btn-sm text-xs font-semibold mt-3"
                      >
                        Click to Allow Camera
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-white/70 flex items-center justify-between font-mono">
                  <span>Feed Status:</span>
                  <span className={media.status === "granted" ? "text-emerald-400 font-bold" : "text-amber-400"}>
                    {media.status === "granted" ? "Stream Active (640x480)" : "Waiting for Access"}
                  </span>
                </div>
              </div>

              {/* Real Acoustic Audio Card */}
              <div className="rounded-2xl border border-line bg-panel p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink flex items-center gap-1.5">
                    <Mic className="h-4 w-4 text-sky-500" />
                    <span>Live Acoustic Audio Decibels</span>
                  </span>
                  <span
                    className={`badge text-[10px] font-bold ${
                      media.status === "granted" || simulatedVerified
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    }`}
                  >
                    {media.audioLevel > 15 ? "VOICE DETECTED" : "LISTENING"}
                  </span>
                </div>

                <div className="h-48 rounded-xl border border-line bg-sunk/30 flex flex-col items-center justify-center p-5 text-center space-y-4">
                  <div className="flex items-end gap-1.5 h-16 w-full justify-center px-4">
                    {[15, 30, 45, 60, 75, 90, 75, 60, 45, 30, 15].map((scale, i) => {
                      const dynamicHeight = Math.max(10, Math.min(100, (media.audioLevel * scale) / 50));
                      return (
                        <span
                          key={i}
                          style={{ height: `${dynamicHeight}%` }}
                          className={`w-2.5 rounded-full transition-all duration-75 ${
                            media.audioLevel > 25
                              ? "bg-gradient-to-t from-emerald-500 to-teal-400"
                              : "bg-emerald-500/50"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-mono font-bold text-ink">
                      Active Audio Level: {media.audioLevel}%
                    </div>
                    <p className="text-[11px] text-muted">
                      Speak a few words to confirm microphone pickup.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-muted flex items-center justify-between font-mono">
                  <span>Microphone:</span>
                  <span className={media.status === "granted" ? "text-emerald-600 font-bold" : "text-amber-500"}>
                    {media.status === "granted" ? "Hardware Transmitting" : "Awaiting Input"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setActiveStep("system")}
                className="btn btn-quiet btn-sm text-xs font-semibold cursor-pointer"
              >
                Back to System Diagnostic
              </button>
              <button
                type="button"
                onClick={() => setActiveStep("ready")}
                className="btn btn-primary btn-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Honor Code & Launch</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Honor Code, Rules & Exam Launch */}
        {activeStep === "ready" && (
          <div className="mt-6 space-y-5 animate-fade">
            <h2 className="text-sm font-bold text-ink">Assessment Integrity Guidelines</h2>

            <div className="rounded-2xl border border-line bg-sunk/30 p-5 space-y-3">
              <div className="flex items-center gap-2 text-ink font-bold text-xs uppercase tracking-wider">
                <Lock className="h-4 w-4 text-purple-500" />
                <span>Strict Proctoring Rules in Effect</span>
              </div>
              <ul className="text-xs text-muted space-y-2 list-disc pl-5">
                <li>
                  <strong className="text-ink">Server-Authoritative Clock:</strong> The exam timer runs on the secure backend. Reloading or refreshing will NOT add additional time.
                </li>
                <li>
                  <strong className="text-ink">Fullscreen & Tab Isolation:</strong> Navigating away from the browser window or switching tabs triggers automated warning strikes.
                </li>
                <li>
                  <strong className="text-ink">Live Camera Supervision:</strong> Your camera feed will remain active in picture-in-picture mode throughout the exam.
                </li>
                <li>
                  <strong className="text-ink">Autosave:</strong> Every MCQ answer and Monaco IDE keystroke is automatically synchronized to the cloud store.
                </li>
              </ul>
            </div>

            {/* Candidate Honor Code Checkbox */}
            <label className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4 cursor-pointer hover:border-ink transition-colors">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-ink cursor-pointer"
              />
              <span className="text-xs text-ink leading-relaxed font-medium">
                I hereby affirm on my honor that I will complete this assessment independently, without unauthorized generative assistance, external communication, or cheating. I consent to real-time optical camera and telemetry monitoring.
              </span>
            </label>

            {/* Launch Button & Warnings */}
            <div className="pt-2">
              {windowState === "UPCOMING" && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300">
                  <Clock className="h-4 w-4 inline mr-1.5" />
                  This examination window has not yet opened. Please return at the scheduled start time.
                </div>
              )}

              {windowState === "ENDED" && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                  This examination window is closed. Submissions are no longer accepted.
                </div>
              )}

              {windowState === "OPEN" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={starting || !agreed || !isHardwareReady}
                    onClick={begin}
                    className="btn btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <span>{starting ? "Initializing Secure Exam Session…" : "Launch Proctored Exam Now"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  {!agreed && (
                    <p className="text-[11px] text-center text-muted">
                      Please check the Honor Code agreement above to enable exam launch.
                    </p>
                  )}
                  {agreed && !isHardwareReady && (
                    <p className="text-[11px] text-center text-amber-500">
                      Please complete Step 2 to verify your webcam and microphone before launching.
                    </p>
                  )}
                </div>
              )}

              {startError ? (
                <div className="mt-3">
                  <ErrorPanel error={startError} />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
