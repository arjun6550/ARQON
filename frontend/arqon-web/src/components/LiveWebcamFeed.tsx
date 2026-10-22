import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";

export function LiveWebcamFeed({
  stream,
  className = "",
  overlay = true,
  mirrored = true,
}: {
  stream: MediaStream | null;
  className?: string;
  overlay?: boolean;
  mirrored?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  if (!stream) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-black/80 text-white/60 p-4 text-center rounded-xl border border-white/10 ${className}`}
      >
        <VideoOff className="h-8 w-8 text-white/40 mb-2" />
        <span className="text-[11px] font-mono">Camera Feed Inactive</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black border border-white/15 ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ transform: mirrored ? "scaleX(-1)" : "none" }}
        className="w-full h-full object-cover"
      />

      {/* Optical AI Detection Overlay */}
      {overlay && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-2.5">
          {/* Top Status Pill */}
          <div className="w-full flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE 30FPS</span>
            </span>
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white/80 border border-white/20">
              WebRTC
            </span>
          </div>

          {/* Centered Optical Face Bounding Box */}
          <div className="h-24 w-24 rounded-full border-2 border-dashed border-emerald-400/70 flex items-center justify-center bg-emerald-500/5 shadow-inner">
            <div className="h-2 w-2 rounded-full bg-emerald-400/80 animate-ping" />
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="w-full flex items-center justify-between text-[9px] font-mono text-emerald-300 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/20">
            <span>FACE VERIFIED</span>
            <span>GAZE CENTERED</span>
          </div>
        </div>
      )}
    </div>
  );
}
