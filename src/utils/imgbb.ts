// Reusable image uploader for already-optimized images.
//
// The ImgBB API key is an unscoped bearer credential, so it is NOT shipped to
// the browser. Uploads are proxied through the `/api/upload-image` serverless
// function, which holds the key server-side and only accepts a request from a
// signed-in admin. Includes a small retry for transient network blips.
//
// In `npm run dev` there is no serverless runtime, so we fall back to calling
// ImgBB directly with VITE_IMGBB_API_KEY (local development only — that branch
// is dead code in a production build and is stripped by the minifier).

import { supabase } from "../supabase";

export class ImgBBUploadError extends Error {}

const PROXY_ENDPOINT = "/api/upload-image";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Read a Blob as bare base64 (no `data:` prefix), which is what ImgBB wants. */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new ImgBBUploadError("Could not read the image file."));
    reader.readAsDataURL(blob);
  });
}

/** Local-dev only: talk to ImgBB directly, since /api/* isn't running. */
async function uploadDirectDev(file: File | Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (!apiKey) {
    throw new ImgBBUploadError(
      "Local dev: set VITE_IMGBB_API_KEY in .env to upload images without the serverless proxy."
    );
  }
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new ImgBBUploadError(`ImgBB responded with status ${response.status}.`);
  const result = await response.json();
  const url: string | undefined = result?.data?.url;
  if (!url) throw new ImgBBUploadError("ImgBB response did not contain an image URL.");
  return url;
}

/**
 * Upload an (already-optimized) image and return its hosted URL.
 * @param file    The optimized WebP file.
 * @param retries Extra attempts after the first, on failure.
 */
export async function uploadToImgBB(file: File | Blob, retries = 2): Promise<string> {
  if (import.meta.env.DEV) {
    return uploadDirectDev(file);
  }

  // Production: proxy the upload, proving we're the signed-in admin.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    throw new ImgBBUploadError("You must be signed in as the admin to upload images.");
  }

  const imageBase64 = await toBase64(file);
  const name = file instanceof File ? file.name : undefined;

  let lastMessage = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(PROXY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64, name }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result?.url) return result.url as string;

      lastMessage = result?.error || `Upload failed with status ${response.status}.`;
      // Auth/permission problems will never succeed on retry — fail fast.
      if (response.status === 401 || response.status === 403 || response.status === 413) {
        throw new ImgBBUploadError(lastMessage);
      }
    } catch (err) {
      if (err instanceof ImgBBUploadError) throw err;
      lastMessage = err instanceof Error ? err.message : String(err);
    }
    if (attempt < retries) await delay(250 * (attempt + 1));
  }

  throw new ImgBBUploadError(
    `Failed to upload image after ${retries + 1} attempt(s). ${lastMessage}`.trim()
  );
}
