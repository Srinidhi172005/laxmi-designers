import React, { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import {
  optimizeImage,
  formatBytes,
  ACCEPT_ATTR,
  IMAGE_PRESETS,
  UnsupportedImageError,
  ImageOptimizeError,
  type ImagePresetKey,
  type OptimizedImage,
} from "../utils/imageOptimizer";
import { uploadToImgBB } from "../utils/imgbb";

interface ImageUploadFieldProps {
  /** Field caption. */
  label: string;
  /** Current image URL (stored in Supabase). */
  value: string;
  /** Called with the final ImgBB WebP URL (or a manually typed URL). */
  onChange: (url: string) => void;
  /** Which optimization ruleset to apply. */
  preset: ImagePresetKey;
  required?: boolean;
  placeholder?: string;
}

type Status = "idle" | "optimizing" | "uploading" | "done" | "error";

/**
 * A single, reusable image upload control used across the whole admin panel.
 *
 * The admin just picks a file: it is automatically read, resized, converted to
 * WebP and compressed in the browser, previewed with before/after stats, and
 * only the optimized WebP is uploaded to ImgBB. The returned URL is what gets
 * stored — the original file is never uploaded.
 */
export default function ImageUploadField({
  label,
  value,
  onChange,
  preset,
  required,
  placeholder = "https://...",
}: ImageUploadFieldProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [optimized, setOptimized] = useState<OptimizedImage | null>(null);
  const optimizedRef = useRef<OptimizedImage | null>(null);
  const rules = IMAGE_PRESETS[preset];

  // Revoke the last preview object URL when it is replaced or on unmount.
  useEffect(() => {
    optimizedRef.current = optimized;
  }, [optimized]);
  useEffect(() => {
    return () => {
      if (optimizedRef.current) URL.revokeObjectURL(optimizedRef.current.previewUrl);
    };
  }, []);

  const runUpload = async (file: File) => {
    // Clear any previous preview URL before creating a new one.
    if (optimizedRef.current) URL.revokeObjectURL(optimizedRef.current.previewUrl);
    setOptimized(null);
    setError("");

    let result: OptimizedImage;
    try {
      setStatus("optimizing");
      result = await optimizeImage(file, preset);
      setOptimized(result);
    } catch (err) {
      setStatus("error");
      if (err instanceof UnsupportedImageError) {
        setError(err.message);
      } else if (err instanceof ImageOptimizeError) {
        setError(err.message);
      } else {
        setError("Could not process this image. Please try a different file.");
      }
      return;
    }

    try {
      setStatus("uploading");
      const url = await uploadToImgBB(result.file);
      onChange(url);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message} You can retry below.`
          : "Upload failed. You can retry below."
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so re-selecting the same file still fires onChange.
    e.target.value = "";
    if (file) void runUpload(file);
  };

  const busy = status === "optimizing" || status === "uploading";

  return (
    <div>
      <label className="text-[9px] text-espresso/60 block mb-1">
        {label}
        {required ? " *" : ""}
        <span className="text-espresso/40 normal-case">
          {" "}· auto WebP · max {rules.maxWidth}×{rules.maxHeight} · q{Math.round(rules.quality * 100)}
        </span>
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-cream-50 border border-gold-500/20 p-2 text-xs rounded focus:outline-none focus:border-gold-500 text-espresso font-medium"
          placeholder={placeholder}
        />
        <label
          className={`px-3 bg-[#1A0508] text-[#D4AF37] border border-[#D4AF37] flex items-center justify-center rounded transition-colors ${
            busy ? "opacity-60 cursor-wait" : "cursor-pointer hover:bg-[#D4AF37] hover:text-[#1A0508]"
          }`}
          title="Upload & auto-optimize image"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          <input
            type="file"
            accept={ACCEPT_ATTR}
            disabled={busy}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Live status line */}
      {status === "optimizing" && (
        <div className="text-[9px] text-[#D4AF37] mt-1 flex items-center gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" /> Optimizing image → WebP…
        </div>
      )}
      {status === "uploading" && (
        <div className="text-[9px] text-[#D4AF37] mt-1 flex items-center gap-1 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading optimized WebP…
        </div>
      )}

      {/* Error with retry */}
      {status === "error" && (
        <div className="mt-2 text-[9px] text-red-700 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <div className="space-y-1">
            <p className="font-medium leading-snug">{error}</p>
            {optimized && (
              <button
                type="button"
                onClick={() => void runUpload(optimized.file)}
                className="inline-flex items-center gap-1 text-red-800 font-bold uppercase tracking-wider hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Retry upload
              </button>
            )}
          </div>
        </div>
      )}

      {/* Before / after preview + compression stats */}
      {optimized && (status === "uploading" || status === "done" || status === "error") && (
        <div className="mt-2 flex items-center gap-3 p-2 border border-[#D4AF37]/20 rounded bg-[#1A0508]/5">
          <img
            src={optimized.previewUrl}
            alt="Optimized preview"
            className="w-14 h-14 object-cover rounded border border-[#D4AF37]/20"
          />
          <div className="flex items-center gap-2 text-[9px] leading-tight">
            <div className="text-center">
              <div className="text-espresso/50 uppercase tracking-wider">Original</div>
              <div className="font-bold text-espresso">{optimized.originalFormat}</div>
              <div className="text-espresso/70">{formatBytes(optimized.originalSize)}</div>
            </div>
            <span className="text-[#D4AF37] text-sm">→</span>
            <div className="text-center">
              <div className="text-espresso/50 uppercase tracking-wider">Optimized</div>
              <div className="font-bold text-[#D4AF37]">{optimized.optimizedFormat}</div>
              <div className="text-espresso/70">{formatBytes(optimized.optimizedSize)}</div>
            </div>
            <div className="ml-1 px-2 py-1 rounded bg-[#D4AF37]/15 text-[#8a6d1a] font-bold flex items-center gap-1">
              {status === "done" && <CheckCircle2 className="w-3 h-3 text-green-700" />}
              Saved {optimized.compressionPercent}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
