import { useState, useEffect, useRef, useCallback } from "react";

export type MediaAccessStatus = "idle" | "requesting" | "granted" | "denied" | "unsupported";

export function useMediaStream(options: { video?: boolean; audio?: boolean; autoStart?: boolean } = {}) {
  const { video = true, audio = true, autoStart = false } = options;

  const [status, setStatus] = useState<MediaAccessStatus>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastAudioUpdateRef = useRef<number>(0);
  const lastLevelRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track cleanup error
        }
      });
      streamRef.current = null;
    }
    setStream(null);
    setAudioLevel(0);
    lastLevelRef.current = 0;
  }, []);

  const requestAccess = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("WebRTC MediaDevices API is not supported by your browser environment.");
      return null;
    }

    setStatus("requesting");
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus("granted");

      if (audio && mediaStream.getAudioTracks().length > 0) {
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioCtxRef.current = ctx;

          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.5;
          analyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(mediaStream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const monitorAudio = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));

            const now = performance.now();
            if (now - lastAudioUpdateRef.current >= 80 && (Math.abs(normalized - lastLevelRef.current) >= 2 || normalized === 0)) {
              lastAudioUpdateRef.current = now;
              lastLevelRef.current = normalized;
              setAudioLevel(normalized);
            }

            animFrameRef.current = requestAnimationFrame(monitorAudio);
          };

          monitorAudio();
        } catch (audioErr) {
          console.warn("AudioContext monitoring failed to initialize:", audioErr);
        }
      }

      return mediaStream;
    } catch (err: unknown) {
      stop();
      setStatus("denied");
      const e = err as { name?: string; message?: string };
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setError("Camera/Microphone permission was denied by the browser. Please allow device access in your browser address bar.");
      } else if (e?.name === "NotFoundError" || e?.name === "DevicesNotFoundError") {
        setError("No camera or microphone hardware found on this machine.");
      } else {
        setError(e?.message || "Failed to initialize camera or microphone stream.");
      }
      return null;
    }
  }, [video, audio, stop]);

  useEffect(() => {
    if (autoStart) {
      void requestAccess();
    }
    return () => {
      stop();
    };
  }, [autoStart, requestAccess, stop]);

  return {
    status,
    stream,
    error,
    audioLevel,
    requestAccess,
    stop,
  };
}
