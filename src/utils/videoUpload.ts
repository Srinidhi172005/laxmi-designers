// Reusable upload service for optimized videos.
//
// Uploads the optimized MP4 to Supabase Storage (bucket: "videos") and the
// generated WebP poster to ImgBB, returning both public URLs plus the metadata
// we persist alongside them. Includes retry, so a transient network blip
// doesn't force the admin to re-encode the whole file.

import { supabase } from "../supabase";
import { uploadToImgBB } from "./imgbb";
import type { OptimizedVideo } from "./videoOptimizer";

export const VIDEO_BUCKET = "videos";

export class VideoUploadError extends Error {}

export interface UploadedVideo {
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number;
  resolution: string | null;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Turn a raw Supabase storage error into something an admin can act on. */
export function explainStorageError(message: string): string {
  if (/bucket not found/i.test(message)) {
    return (
      `Upload failed: the storage bucket "${VIDEO_BUCKET}" does not exist.\n\n` +
      "Fix it once in Supabase:\n" +
      "1. Storage → New bucket\n" +
      `2. Name it exactly: ${VIDEO_BUCKET}\n` +
      "3. Tick \"Public bucket\", then Save"
    );
  }
  if (/row-level security|violates row-level|policy|not authorized|permission/i.test(message)) {
    return (
      "Upload failed: storage permissions are blocking this.\n\n" +
      "Make sure you are signed in as the admin, and that security-policies.sql " +
      "has been run in the Supabase SQL Editor."
    );
  }
  return `Upload failed: ${message}`;
}

/**
 * Upload an optimized video (+ its poster) and return the public URLs.
 * @param retries extra attempts after the first, for the video upload.
 */
export async function uploadOptimizedVideo(
  optimized: OptimizedVideo,
  retries = 2
): Promise<UploadedVideo> {
  const safeBase =
    optimized.file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40) || "video";
  // Unique path prevents one upload silently overwriting another.
  const path = `boutique-videos/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBase}.mp4`;

  let lastError: unknown;
  let uploaded = false;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, optimized.file, {
      cacheControl: "31536000",
      contentType: "video/mp4",
      upsert: false,
    });
    if (!error) {
      uploaded = true;
      break;
    }
    lastError = error;
    // Permission/config problems will never succeed on retry — fail fast.
    if (/bucket not found|row-level security|policy|not authorized|permission/i.test(error.message)) {
      throw new VideoUploadError(explainStorageError(error.message));
    }
    if (attempt < retries) await delay(400 * (attempt + 1));
  }

  if (!uploaded) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new VideoUploadError(explainStorageError(msg));
  }

  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
  const videoUrl = data.publicUrl;

  // Poster is a nice-to-have — never fail the whole upload over it.
  let thumbnailUrl: string | null = null;
  if (optimized.poster) {
    try {
      const posterFile = new File([optimized.poster], `${safeBase}-poster.webp`, { type: "image/webp" });
      thumbnailUrl = await uploadToImgBB(posterFile);
    } catch {
      thumbnailUrl = null;
    }
  }

  const meta = optimized.optimizedMeta;
  return {
    videoUrl,
    thumbnailUrl,
    durationSeconds: meta?.duration && isFinite(meta.duration) ? Math.round(meta.duration) : null,
    fileSizeBytes: optimized.file.size,
    resolution: meta?.width && meta?.height ? `${meta.width}x${meta.height}` : null,
  };
}
