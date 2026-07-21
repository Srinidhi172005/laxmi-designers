import React, { useEffect, useRef, useState } from "react";
import { Film, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import {
  optimizeVideo,
  formatBytes,
  formatDuration,
  VIDEO_ACCEPT_ATTR,
  VIDEO_PRESET,
  UnsupportedVideoError,
  VideoOptimizeError,
  type OptimizedVideo,
} from "../utils/videoOptimizer";
import { uploadOptimizedVideo, VideoUploadError, type UploadedVideo } from "../utils/videoUpload";

interface VideoUploadFieldProps {
  label: string;
  /** Current video URL (stored in Supabase). */
  value: string;
  /** Called with the public video URL plus the optimized metadata. */
  onChange: (url: string, meta?: UploadedVideo) => void;
  placeholder?: string;
}

type Status = "idle" | "optimizing" | "uploading" | "done" | "error";

/**
 * Reusable video upload control for the whole admin panel.
 *
 * The admin picks a file: it is validated, transcoded to web-ready MP4
 * (H.264/AAC, max 1080p, 30fps, faststart), compressed, given an auto-generated
 * WebP poster, previewed with before/after stats, and only then uploaded.
 * The original file is never uploaded.
 */
export default function VideoUploadField({
  label,
  value,
  onChange,
  placeholder = "Video URL",
}: VideoUploadFieldProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [optimized, setOptimized] = useState<OptimizedVideo | null>(null);
  const optimizedRef = useRef<OptimizedVideo | null>(null);

  useEffect(() => { optimizedRef.current = optimized; }, [optimized]);
  useEffect(() => () => {
    if (optimizedRef.current) URL.revokeObjectURL(optimizedRef.current.previewUrl);
  }, []);

  const runUpload = async (result: OptimizedVideo) => {
    try {
      setStatus("uploading");
      setStage("Uploading optimized video…");
      setPct(null);
      const uploaded = await uploadOptimizedVideo(result);
      onChange(uploaded.videoUrl, uploaded);
      setStatus("done");
      setStage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof VideoUploadError ? err.message : `Upload failed: ${String(err)}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    if (optimizedRef.current) URL.revokeObjectURL(optimizedRef.current.previewUrl);
    setOptimized(null);
    setError("");

    let result: OptimizedVideo;
    try {
      setStatus("optimizing");
      result = await optimizeVideo(file, (s, p) => { setStage(s); setPct(p); });
      setOptimized(result);
    } catch (err) {
      setStatus("error");
      setStage("");
      setError(
        err instanceof UnsupportedVideoError || err instanceof VideoOptimizeError
          ? err.message
          : "Could not process this video. Please try a different file."
      );
      return;
    }
    await runUpload(result);
  };

  const busy = status === "optimizing" || status === "uploading";
  const om = optimized?.originalMeta;
  const nm = optimized?.optimizedMeta;

  return (
    <div>
      <label className="text-[9px] text-espresso/60 block mb-1">
        {label}
        <span className="text-espresso/40 normal-case">
          {" "}· auto MP4/H.264 · max {VIDEO_PRESET.maxWidth}×{VIDEO_PRESET.maxHeight} · {VIDEO_PRESET.maxFps}fps
        </span>
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
          placeholder={placeholder}
        />
        <label
          className={`px-3 bg-[#1A0508] text-[#D4AF37] border border-[#D4AF37] flex items-center justify-center rounded transition-colors ${
            busy ? "opacity-60 cursor-wait" : "cursor-pointer hover:bg-[#D4AF37] hover:text-[#1A0508]"
          }`}
          title="Upload & auto-optimize video"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
          <input
            type="file"
            accept={VIDEO_ACCEPT_ATTR}
            disabled={busy}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Progress */}
      {busy && (
        <div className="mt-2">
          <div className="text-[9px] text-[#D4AF37] flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> {stage}
            {pct !== null && <span className="font-bold">{pct}%</span>}
          </div>
          {pct !== null && (
            <div className="mt-1 h-1 w-full bg-[#D4AF37]/15 rounded overflow-hidden">
              <div className="h-full bg-[#D4AF37] transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-[8px] text-espresso/40 mt-1 leading-relaxed">
            Large videos can take a few minutes to convert — please keep this tab open.
          </p>
        </div>
      )}

      {/* Error + retry */}
      {status === "error" && (
        <div className="mt-2 text-[9px] text-red-700 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <div className="space-y-1">
            <p className="font-medium leading-snug whitespace-pre-line">{error}</p>
            {optimized && (
              <button
                type="button"
                onClick={() => void runUpload(optimized)}
                className="inline-flex items-center gap-1 text-red-800 font-bold uppercase tracking-wider hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Retry upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Before / after preview */}
      {optimized && (status === "uploading" || status === "done" || status === "error") && (
        <div className="mt-2 p-2 border border-[#D4AF37]/20 rounded bg-[#1A0508]/5 flex gap-3">
          <video
            src={optimized.previewUrl}
            poster={optimized.poster ? URL.createObjectURL(optimized.poster) : undefined}
            controls
            preload="metadata"
            className="w-28 aspect-video object-cover rounded border border-[#D4AF37]/20 bg-black shrink-0"
          />
          <div className="flex items-center gap-2 text-[9px] leading-tight flex-wrap">
            <div>
              <div className="text-espresso/50 uppercase tracking-wider">Original</div>
              <div className="font-bold text-espresso">{optimized.originalFormat}</div>
              <div className="text-espresso/70">{om ? `${om.width}×${om.height}` : "—"}</div>
              <div className="text-espresso/70">{formatBytes(optimized.originalSize)}</div>
              <div className="text-espresso/50">{om ? formatDuration(om.duration) : ""}</div>
            </div>
            <span className="text-[#D4AF37] text-sm">→</span>
            <div>
              <div className="text-espresso/50 uppercase tracking-wider">Optimized</div>
              <div className="font-bold text-[#D4AF37]">{optimized.optimizedFormat}</div>
              <div className="text-espresso/70">{nm ? `${nm.width}×${nm.height}` : "—"}</div>
              <div className="text-espresso/70">{formatBytes(optimized.optimizedSize)}</div>
              <div className="text-espresso/50">{nm ? formatDuration(nm.duration) : ""}</div>
            </div>
            <div className="ml-1 px-2 py-1 rounded bg-[#D4AF37]/15 text-[#8a6d1a] font-bold flex items-center gap-1">
              {status === "done" && <CheckCircle2 className="w-3 h-3 text-green-700" />}
              {optimized.passedThrough ? "Already optimized" : `Saved ${optimized.compressionPercent}%`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
