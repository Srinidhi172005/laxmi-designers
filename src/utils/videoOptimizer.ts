// Reusable, UI-agnostic video optimization utility.
//
// Every video uploaded through the admin panel is passed through
// `optimizeVideo` before it leaves the browser: it is validated, transcoded to
// web-friendly MP4 (H.264 video + AAC audio), downscaled to at most 1080p,
// capped at 30fps, compressed for streaming (`+faststart`), and a WebP poster
// frame is captured. Only the optimized file is uploaded.
//
// Transcoding runs on ffmpeg.wasm, which is loaded LAZILY (~32 MB) and only
// when a file actually needs converting — files that are already web-ready are
// passed straight through, so the common case stays instant.
//
// Keep this module free of React/DOM-component code so it can be reused for
// hero banners, product videos, featured videos and any future upload.

export interface VideoPreset {
  label: string;
  maxWidth: number;
  maxHeight: number;
  maxFps: number;
  /** H.264 CRF — lower is higher quality. 23 is a good web default. */
  crf: number;
  audioBitrateKbps: number;
}

export const VIDEO_PRESET: VideoPreset = {
  label: "Web (1080p)",
  maxWidth: 1920,
  maxHeight: 1080,
  maxFps: 30,
  crf: 23,
  audioBitrateKbps: 128,
};

// Target video bitrate ceilings by output height (from the brief).
export function targetBitrateKbps(height: number): number {
  if (height > 720) return 5000; // 1080p → 4–6 Mbps
  if (height > 480) return 2500; // 720p  → 2–3 Mbps
  return 1000; //                  480p  → 1 Mbps
}

export const ACCEPTED_VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "m4v"] as const;
export const VIDEO_ACCEPT_ATTR = ".mp4,.mov,.avi,.mkv,.webm,.m4v,video/*";

/** Formats a browser can decode natively (so we can probe/poster them directly). */
const BROWSER_PLAYABLE = ["mp4", "m4v", "webm", "mov"];

/** Hard ceiling — ffmpeg.wasm is memory bound and will crash on huge inputs. */
export const MAX_INPUT_BYTES = 500 * 1024 * 1024; // 500 MB

export interface VideoMeta {
  width: number;
  height: number;
  duration: number; // seconds
}

export interface OptimizedVideo {
  /** Optimized video, ready to upload. */
  file: File;
  /** WebP poster frame (may be null if it could not be captured). */
  poster: Blob | null;
  /** Object URL for previewing the optimized video. Revoke when done. */
  previewUrl: string;
  originalName: string;
  originalFormat: string;
  originalSize: number;
  originalMeta: VideoMeta | null;
  optimizedFormat: string;
  optimizedSize: number;
  optimizedMeta: VideoMeta | null;
  compressionPercent: number;
  /** True when the file was already web-ready and passed through untouched. */
  passedThrough: boolean;
}

export class UnsupportedVideoError extends Error {}
export class VideoOptimizeError extends Error {}

export type VideoProgress = (stage: string, pct: number | null) => void;

function ext(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function isSupportedVideo(file: File): boolean {
  const e = ext(file.name);
  if ((ACCEPTED_VIDEO_EXTENSIONS as readonly string[]).includes(e)) return true;
  return /^video\//i.test(file.type);
}

/** Read width/height/duration by letting the browser decode the file. */
export function probeVideo(source: Blob): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const cleanup = () => URL.revokeObjectURL(url);
    v.onloadedmetadata = () => {
      const meta = { width: v.videoWidth, height: v.videoHeight, duration: v.duration };
      cleanup();
      resolve(meta);
    };
    v.onerror = () => {
      cleanup();
      reject(new VideoOptimizeError("This video could not be read by the browser."));
    };
    v.src = url;
  });
}

/**
 * Capture a poster frame as WebP. Seeks to ~2.5s (or the midpoint of very
 * short clips). Returns null if the frame could not be grabbed.
 */
export function capturePosterWebp(source: Blob, quality = 0.85): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(source);
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    (v as any).playsInline = true;

    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    v.onloadedmetadata = () => {
      const target = v.duration && isFinite(v.duration) ? Math.min(2.5, v.duration / 2) : 0.1;
      const onSeeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx || !canvas.width || !canvas.height) return done(null);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => done(b), "image/webp", quality);
        } catch {
          done(null);
        }
      };
      v.onseeked = onSeeked;
      try {
        v.currentTime = target;
      } catch {
        done(null);
      }
    };
    v.onerror = () => done(null);
    v.src = url;
  });
}

// --- ffmpeg.wasm (lazy singleton) -------------------------------------------

let ffmpegPromise: Promise<any> | null = null;

async function getFFmpeg(onProgress?: VideoProgress): Promise<any> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      // Single-threaded core: no SharedArrayBuffer, so we do NOT need
      // cross-origin isolation (which would break ImgBB-hosted images).
      const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
      onProgress?.("Loading video engine (one-time, ~32 MB)…", null);
      await ffmpeg.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((err) => {
      ffmpegPromise = null; // allow a retry on the next attempt
      throw err;
    });
  }
  return ffmpegPromise;
}

/** Does this file need transcoding, or is it already web-ready? */
function needsTranscode(file: File, meta: VideoMeta | null): boolean {
  const e = ext(file.name);
  if (e !== "mp4" && e !== "m4v") return true; // convert everything to MP4
  if (!meta) return true; // unknown — normalise it
  if (meta.width > VIDEO_PRESET.maxWidth || meta.height > VIDEO_PRESET.maxHeight) return true;
  return false;
}

/**
 * Validate → (transcode to MP4/H.264/AAC, downscale, cap fps, compress) →
 * capture WebP poster. Returns the optimized file plus before/after stats.
 */
export async function optimizeVideo(
  file: File,
  onProgress?: VideoProgress
): Promise<OptimizedVideo> {
  if (!isSupportedVideo(file)) {
    throw new UnsupportedVideoError(
      `Unsupported file "${file.name}". Please upload an MP4, MOV, AVI, MKV, WEBM or M4V video.`
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new UnsupportedVideoError(
      `This video is ${formatBytes(file.size)}. Please upload a file under ${formatBytes(MAX_INPUT_BYTES)}.`
    );
  }

  const originalFormat = (ext(file.name) || "video").toUpperCase();
  const inputExt = ext(file.name);

  // Probe the original when the browser can decode it (AVI/MKV usually can't).
  let originalMeta: VideoMeta | null = null;
  if (BROWSER_PLAYABLE.includes(inputExt)) {
    onProgress?.("Reading video…", null);
    originalMeta = await probeVideo(file).catch(() => null);
  }

  // Fast path — already a web-ready MP4 within limits.
  if (!needsTranscode(file, originalMeta)) {
    onProgress?.("Generating thumbnail…", null);
    const poster = await capturePosterWebp(file);
    return {
      file,
      poster,
      previewUrl: URL.createObjectURL(file),
      originalName: file.name,
      originalFormat,
      originalSize: file.size,
      originalMeta,
      optimizedFormat: "MP4",
      optimizedSize: file.size,
      optimizedMeta: originalMeta,
      compressionPercent: 0,
      passedThrough: true,
    };
  }

  // --- Transcode ------------------------------------------------------------
  let ffmpeg: any;
  try {
    ffmpeg = await getFFmpeg(onProgress);
  } catch {
    // Engine unavailable (offline / blocked). Fall back gracefully.
    if (BROWSER_PLAYABLE.includes(inputExt)) {
      onProgress?.("Generating thumbnail…", null);
      const poster = await capturePosterWebp(file);
      return {
        file,
        poster,
        previewUrl: URL.createObjectURL(file),
        originalName: file.name,
        originalFormat,
        originalSize: file.size,
        originalMeta,
        optimizedFormat: originalFormat,
        optimizedSize: file.size,
        optimizedMeta: originalMeta,
        compressionPercent: 0,
        passedThrough: true,
      };
    }
    throw new VideoOptimizeError(
      "The video converter could not be loaded (check your connection). " +
        "Please upload an MP4 or WEBM file instead."
    );
  }

  const { fetchFile } = await import("@ffmpeg/util");
  const inName = `in.${inputExt || "mp4"}`;
  const outName = "out.mp4";

  const onFfmpegProgress = ({ progress }: { progress: number }) => {
    const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
    onProgress?.("Optimizing video…", pct);
  };
  ffmpeg.on("progress", onFfmpegProgress);

  try {
    await ffmpeg.writeFile(inName, await fetchFile(file));

    const height = originalMeta?.height ?? VIDEO_PRESET.maxHeight;
    const maxrate = targetBitrateKbps(Math.min(height, VIDEO_PRESET.maxHeight));

    onProgress?.("Optimizing video…", 0);
    await ffmpeg.exec([
      "-i", inName,
      // Downscale to fit 1920x1080, preserving aspect ratio; never upscale.
      "-vf", `scale='min(${VIDEO_PRESET.maxWidth},iw)':'min(${VIDEO_PRESET.maxHeight},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      // Cap frame rate at 30fps (leaves slower footage untouched).
      "-r", String(VIDEO_PRESET.maxFps),
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", String(VIDEO_PRESET.crf),
      "-maxrate", `${maxrate}k`,
      "-bufsize", `${maxrate * 2}k`,
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", `${VIDEO_PRESET.audioBitrateKbps}k`,
      // Progressive streaming — starts playing before fully downloaded.
      "-movflags", "+faststart",
      outName,
    ]);

    const data = await ffmpeg.readFile(outName);
    const blob = new Blob([(data as any).buffer ?? data], { type: "video/mp4" });

    // Clean up the virtual filesystem so repeated uploads don't leak memory.
    await ffmpeg.deleteFile(inName).catch(() => {});
    await ffmpeg.deleteFile(outName).catch(() => {});

    const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
    const optimizedFile = new File([blob], `${baseName}.mp4`, {
      type: "video/mp4",
      lastModified: Date.now(),
    });

    onProgress?.("Generating thumbnail…", null);
    const optimizedMeta = await probeVideo(optimizedFile).catch(() => null);
    const poster = await capturePosterWebp(optimizedFile);

    const compressionPercent =
      file.size > 0 ? Math.max(0, Math.round((1 - optimizedFile.size / file.size) * 100)) : 0;

    return {
      file: optimizedFile,
      poster,
      previewUrl: URL.createObjectURL(optimizedFile),
      originalName: file.name,
      originalFormat,
      originalSize: file.size,
      originalMeta,
      optimizedFormat: "MP4 (H.264)",
      optimizedSize: optimizedFile.size,
      optimizedMeta,
      compressionPercent,
      passedThrough: false,
    };
  } catch (err) {
    throw new VideoOptimizeError(
      "This video could not be converted. It may be corrupted or too large. Try a shorter clip or an MP4."
    );
  } finally {
    ffmpeg.off?.("progress", onFfmpegProgress);
  }
}
